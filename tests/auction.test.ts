import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import assert from "assert";
import * as web3 from "@solana/web3.js";
import type { Auction } from "../target/types/auction";
import { confirmTx, getAuctionAddress, getBidderAddress, getMasterAddress } from "../utils/program";
import { secretKey } from '../utils/secretKey';


describe("Test", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const programAddress = new web3.PublicKey("Em2iU1X286qZ6Mii2B6Bh8EK863nTKhSep8cJdH7PeXE")
  const program = anchor.workspace.Auction as anchor.Program<Auction>;
  const programId = web3.SystemProgram.programId;
  const connection = program.provider.connection;
  const masterAddress = getMasterAddress(programAddress);
  const auctionId = 1;
  const auctionAddress = getAuctionAddress(auctionId, programAddress);
  const _dumpBidderAddress = getBidderAddress(auctionAddress, 0, programAddress);
  const bidderAddress = getBidderAddress(auctionAddress, 1, programAddress);
  const account = web3.Keypair.fromSecretKey(new Uint8Array(secretKey));

  it("initialize", async () => {
    // Send a transaction
    const txHash = await program.methods
      .initialize()
      .accounts({
        master: masterAddress,
        signer: account.publicKey,
        systemProgram: programId,
      })
      .signers([account])
      .rpc();

    // Confirm transaction
    await confirmTx(connection, txHash);

    // Fetch the created account
    const masterAccount = await program.account.master.fetch(masterAddress);

    // Check whether the data on-chain is equal to local 'data'
    assert(masterAccount.lastId === 0);
  });

  it("create auction", async () => {
    const date = new Date();
    let time = date.setDate(date.getDate() + 1)
    time = parseInt((time / 1000).toString());

    const txHash = await program.methods
      .createAuction(new BN(1), new BN(time), "1")
      .accounts({
        master: masterAddress,
        auction: auctionAddress,
        dumpBidder: _dumpBidderAddress,
        authority: account.publicKey,
        systemProgram: programId,
      })
      .signers([account])
      .rpc();

    await confirmTx(connection, txHash);

    const masterAccount = await program.account.master.fetch(masterAddress);
    assert(masterAccount.lastId === auctionId);

    const auctionAccount = await program.account.auction.fetch(auctionAddress);
    assert(auctionAccount.id.toString() === auctionId.toString());
    assert(auctionAccount.authority.toString() === account.publicKey.toString());
    assert(auctionAccount.startingPrice.eq(new BN(1)));
    assert(auctionAccount.currentPrice.eq(new BN(0)));
    assert(auctionAccount.winnerId === null);
    assert(auctionAccount.data === "1");
    assert(auctionAccount.rewarded === false);
    assert(auctionAccount.lastBidderId === 0);
  });

  it("place a bid", async () => {
    const txHash = await program.methods
      .bidding(auctionId, new BN(2))
      .accounts({
        auction: auctionAddress,
        prevBidder: _dumpBidderAddress,
        bidder: bidderAddress,
        authority: account.publicKey,
        systemProgram: programId,
      })
      .signers([account])
      .rpc();

    await confirmTx(connection, txHash);

    const auctionAccount = await program.account.auction.fetch(auctionAddress);
    assert(auctionAccount.currentPrice.eq(new BN(2)));
    assert(auctionAccount.lastBidderId === 1);

    const bidderAccount = await program.account.bidder.all();
    assert(bidderAccount[1].account.authority.toString() === account.publicKey.toString());
  });
});
