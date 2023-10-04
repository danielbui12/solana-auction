import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import assert from "assert";
import * as web3 from "@solana/web3.js";
import type { Auction } from "../target/types/auction";
import { confirmTx, getAuctionAddress, getBidderAddress, getMasterAddress } from "../utils/program";
import { secretKey } from "../utils/secretKey";

describe("Test", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();

  // must match with address config on Anchor.toml
  const programAddress = new web3.PublicKey("5qCJsXGjyDwk9zn4TnarTbq6A3TBvDbzbEf4drQkY87E")
  const program = anchor.workspace.Auction as anchor.Program<Auction>;
  const programId = web3.SystemProgram.programId;
  const connection = program.provider.connection;
  const masterAddress = getMasterAddress(programAddress);
  const auctionId = 1;
  const auctionAddress = getAuctionAddress(auctionId, programAddress);
  const _dumpBidderAddress = getBidderAddress(auctionAddress, 0, programAddress);
  const USER_1 = {
    account: web3.Keypair.fromSecretKey(new Uint8Array(secretKey)),
    bidderAddress: getBidderAddress(auctionAddress, 1, programAddress),
    price: new BN(2 * web3.LAMPORTS_PER_SOL)
  }
  const USER_2 = {
    account: new web3.Keypair(),
    bidderAddress: getBidderAddress(auctionAddress, 2, programAddress),
    price: new BN(3 * web3.LAMPORTS_PER_SOL)
  }

  async function getBidder() {
    const bidderAccount = await program.account.bidder.all();    
    return bidderAccount.sort((a, b) => a.account.id > b.account.id ? 1 : 0);
  } 

  before(async () => {
    // Create transaction
    let transaction = new anchor.web3.Transaction();
    transaction.add(
      web3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: USER_1.account.publicKey,
        lamports: 10 * web3.LAMPORTS_PER_SOL,
      })
    );
    transaction.add(
      web3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: USER_2.account.publicKey,
        lamports: 10 * web3.LAMPORTS_PER_SOL,
      })
    );
    // Sign transaction
    await provider.sendAndConfirm(transaction);
  })

  it("initialize", async () => {
    // Send a transaction
    const txHash = await program.methods
      .initialize()
      .accounts({
        master: masterAddress,
        signer: USER_1.account.publicKey,
        systemProgram: programId,
      })
      .signers([USER_1.account])
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
        authority: USER_1.account.publicKey,
        systemProgram: programId,
      })
      .signers([USER_1.account])
      .rpc();

    await confirmTx(connection, txHash);

    const masterAccount = await program.account.master.fetch(masterAddress);
    assert(masterAccount.lastId === auctionId);

    const auctionAccount = await program.account.auction.fetch(auctionAddress);
    assert(auctionAccount.id.toString() === auctionId.toString());
    assert(auctionAccount.authority.toString() === USER_1.account.publicKey.toString());
    assert(auctionAccount.startingPrice.eq(new BN(1)));
    assert(auctionAccount.currentPrice.eq(new BN(0)));
    assert(auctionAccount.winnerId === null);
    assert(auctionAccount.data === "1");
    assert(auctionAccount.rewarded === false);
    assert(auctionAccount.lastBidderId === 0);
  });

  it(`User 1 places a bid`, async () => {
    const prevUser1Balance = await provider.connection.getBalance(USER_1.account.publicKey);
    
    const txHash = await program.methods
      .bidding(auctionId, USER_1.price)
      .accounts({
        auction: auctionAddress,
        prevBidder: _dumpBidderAddress,
        bidder: USER_1.bidderAddress,
        authority: USER_1.account.publicKey,
        systemProgram: programId,
      })
      .signers([USER_1.account])
      .rpc();

    await confirmTx(connection, txHash);

    // check in Auction
    const auctionAccount = await program.account.auction.fetch(auctionAddress);          
    assert(auctionAccount.currentPrice.eq(USER_1.price));
    assert(auctionAccount.lastBidderId === 1);

    // check in Bidder
    const bidderAccount = await getBidder();    
    assert(bidderAccount[0].account.authority.toString() === USER_1.account.publicKey.toString());
      
    // check balance of User 1
    const afterUser1Balance = await provider.connection.getBalance(USER_1.account.publicKey);
    assert(new BN((prevUser1Balance - afterUser1Balance)).gte(USER_1.price));
    
    // check balance of Auction account
    const auctionBalance = await provider.connection.getBalance(auctionAddress);
    assert(new BN(auctionBalance).gte(USER_1.price));

    assert(true)
  });

  it(`User 2 places a bid`, async () => {
    const prevUser2Balance = await provider.connection.getBalance(USER_2.account.publicKey);

    const txHash = await program.methods
      .bidding(auctionId, USER_2.price)
      .accounts({
        auction: auctionAddress,
        prevBidder: USER_1.bidderAddress,
        bidder: USER_2.bidderAddress,
        authority: USER_2.account.publicKey,
        systemProgram: programId,
      })
      .signers([USER_2.account])
      .rpc();

    await confirmTx(connection, txHash);
    
    // check in Auction
    const auctionAccount = await program.account.auction.fetch(auctionAddress);
    assert(auctionAccount.currentPrice.eq(USER_2.price));
    assert(auctionAccount.lastBidderId === 2);

    // check in Bidder
    const bidderAccount = await getBidder();
    assert(bidderAccount[0].account.authority.toString() === USER_2.account.publicKey.toString());
  
    // check reward of old Bidder
    assert(bidderAccount[1].account.authority.toString() === USER_1.account.publicKey.toString());
    assert(bidderAccount[1].account.rewardAmount.eq(USER_1.price));

    // check balance of User 2
    const afterUser2Balance = await provider.connection.getBalance(USER_2.account.publicKey);
    assert(new BN(prevUser2Balance - afterUser2Balance).gte(USER_2.price));
    // check balance of Auction account
    const auctionBalance = await provider.connection.getBalance(auctionAddress);
    assert(new BN(auctionBalance).gte(USER_1.price.add(USER_2.price)));
  });

  it(`pick winner`, async () => {
    const txHash = await program.methods
      .pickWinner(auctionId)
      .accounts({
        auction: auctionAddress,
        authority: USER_1.account.publicKey,
        systemProgram: programId,
      })
      .signers([USER_1.account])
      .rpc();

    await confirmTx(connection, txHash);
    
    // check in Auction
    const auctionAccount = await program.account.auction.fetch(auctionAddress);
    assert(auctionAccount.currentPrice.eq(USER_2.price));
    assert(auctionAccount.lastBidderId === 2);
    assert(auctionAccount.winnerId === 2);
  });

  it(`claim reward`, async () => {    
    const prevUser1Balance = await provider.connection.getBalance(USER_1.account.publicKey);

    const txHash = await program.methods
      .claimReward(auctionId, 1)
      .accounts({
        auction: auctionAddress,
        bidder: USER_1.bidderAddress,
        authority: USER_1.account.publicKey,
        systemProgram: programId,
      })
      .signers([USER_1.account])
      .rpc();

    await confirmTx(connection, txHash);
    
    // check balance of user 1
    const afterUser1Balance = await provider.connection.getBalance(USER_1.account.publicKey);    
    assert(new BN(afterUser1Balance - prevUser1Balance).gte(USER_1.price.sub(new BN(0.0001 * web3.LAMPORTS_PER_SOL)))); // cause of paying for gas
    // check balance of Auction account
    const auctionBalance = await provider.connection.getBalance(auctionAddress);
    assert(new BN(auctionBalance).gte(USER_2.price));
  });

  it(`claim bidding`, async () => {    
    const prevUser1Balance = await provider.connection.getBalance(USER_1.account.publicKey);

    const txHash = await program.methods
      .claimBidding(auctionId)
      .accounts({
        auction: auctionAddress,
        authority: USER_1.account.publicKey,
        systemProgram: programId,
      })
      .signers([USER_1.account])
      .rpc();

    await confirmTx(connection, txHash);
    
    // check balance of user 1
    const afterUser1Balance = await provider.connection.getBalance(USER_1.account.publicKey);    
    assert(new BN(afterUser1Balance - prevUser1Balance).gte(USER_2.price.sub(new BN(0.0001 * web3.LAMPORTS_PER_SOL)))); // cause of paying for gas
    // check balance of Auction account
    const auctionBalance = await provider.connection.getBalance(auctionAddress);
    assert(new BN(auctionBalance).gte(new BN (0)));
  });
});
