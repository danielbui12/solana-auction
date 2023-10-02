import BN from "bn.js";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  MASTER_SEED,
  AUCTION_SEED,
  BIDDER_SEED,
} from "./constants";

export const getMasterAddress = (programAddress: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync([Buffer.from(MASTER_SEED)], programAddress)[0];
};

export const getAuctionAddress = (id: string | number, programAddress: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
      [Buffer.from(AUCTION_SEED), new BN(id).toArrayLike(Buffer, "le", 4)],
      programAddress
    )[0];
};

export const getBidderAddress = (auctionAddress: PublicKey, id: string | number, programAddress: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
      [
        Buffer.from(BIDDER_SEED),
        auctionAddress.toBuffer(),
        new BN(id).toArrayLike(Buffer, "le", 4),
      ],
      programAddress
    )[0];
};

export const confirmTx = async (connection:  Connection, txHash: string) => { 
  const blockhashInfo = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: blockhashInfo.blockhash,
    lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
    signature: txHash,
  });  
}