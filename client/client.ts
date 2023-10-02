import * as anchor from "@coral-xyz/anchor";
import * as web3 from "@solana/web3.js";
import type { Auction } from "../target/types/auction";
import { confirmTx, getAuctionAddress, getBidderAddress, getMasterAddress } from "../utils/program";
import { secretKey } from '../utils/secretKey';
import { BN } from "bn.js";

// Configure the client to use the local cluster
anchor.setProvider(anchor.AnchorProvider.env());

const program = anchor.workspace.Auction as anchor.Program<Auction>;
const programAddress = new web3.PublicKey("Em2iU1X286qZ6Mii2B6Bh8EK863nTKhSep8cJdH7PeXE")
const programId = web3.SystemProgram.programId;
const connection = program.provider.connection;
const masterAddress = getMasterAddress(programAddress);
const auctionId = 1;
const auctionAddress = getAuctionAddress(auctionId, programAddress);
const _dumpBidderAddress = getBidderAddress(auctionAddress, 0, programAddress);
const bidderAddress = getBidderAddress(auctionAddress, 1, programAddress);
const account = web3.Keypair.fromSecretKey(new Uint8Array(secretKey));

async function main() {
  console.log("My address:", program.provider.publicKey.toString());
  const balance = await program.provider.connection.getBalance(program.provider.publicKey);
  console.log(`My balance: ${balance / web3.LAMPORTS_PER_SOL} SOL`);

  // Initialize
  const txHashInitialize = await program.methods
    .initialize()
    .accounts({
      master: masterAddress,
      signer: account.publicKey,
      systemProgram: programId,
    })
    .signers([account])
    .rpc();

  // Confirm transaction
  await confirmTx(connection, txHashInitialize);

  // Create a new auction
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

  // place a bid
  const txHashBidding = await program.methods
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

  await confirmTx(connection, txHashBidding);
}

main();
