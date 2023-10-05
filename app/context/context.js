import {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { BN } from "@project-serum/anchor";
import { SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
// import bs58 from "bs58";

import {
  getAuctionAddress,
  getMasterAddress,
  getProgram,
  getBidderAddress,
  // getTotalPrize,
} from "../utils/program";
import { confirmTx, mockWallet } from "../utils/helper";
import toast from "react-hot-toast";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [masterAddress, setMasterAddress] = useState();
  const [auctionAddress, setAuctionAddress] = useState();
  const [auction, setAuction] = useState();
  const [auctionPlayers, setAuctionPlayers] = useState([]);
  const [auctionId, setAuctionId] = useState();
  const [biddingHistory, setBiddingHistory] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Get provider
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const program = useMemo(() => {
    if (connection) {
      return getProgram(connection, wallet ?? mockWallet());
    }
  }, [connection, wallet]);

  const updateState = useCallback(async () => {
    if (!program) return;

    try {
      if (!masterAddress) {
        const masterAddress = await getMasterAddress();
        setMasterAddress(masterAddress);
      }
      const master = await program.account.master.fetch(
        masterAddress ?? (await getMasterAddress()),
      );
      setInitialized(true);
      setAuctionId(master.lastId);
      const auctionAddress = await getAuctionAddress(master.lastId);
      setAuctionAddress(auctionAddress);
      const auction = await program.account.auction.fetch(auctionAddress);
      setAuction(auction);
    } catch (err) {
      console.log(err.message);
    }
  }, [masterAddress, program]);

  useEffect(() => {
    updateState();
  }, [updateState]);

  const getPlayers = useCallback(async () => {
    const players = [auction?.last_bidder_id];
    setAuctionPlayers(players);
  }, [auction?.last_bidder_id]);

  const getHistory = useCallback(async () => {
    if (!auctionId) return;

    const history = [];

    for (const i in new Array(auctionId).fill(null)) {
      const id = auctionId - parseInt(i);
      if (!id) break;

      const auctionAddress = await getAuctionAddress(id);
      const auction = await program.account.auction.fetch(auctionAddress);
      const winnerId = auction.winnerId;
      if (!winnerId) continue;

      const bidderAddress = await getBidderAddress(auctionAddress, winnerId);
      const bidder = await program.account.bidder.fetch(bidderAddress);

      history.push({
        auctionId: id,
        winnerId,
        winnerAddress: bidder.authority,
        prize: 0, //getTotalPrize(lottery),
      });
    }

    setBiddingHistory(history);
  }, [auctionId, program.account.auction, program.account.bidder]);

  const initMaster = async () => {
    setError("");
    setSuccess("");
    try {
      const txHash = await program.methods
        .initialize()
        .accounts({
          master: masterAddress,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      await confirmTx(txHash, connection);

      updateState();
      toast.success("Initialized Master");
    } catch (err) {
      setError(err.message);
      toast.error("Initializing FAILED!");
    }
  };

  const createAuction = async ({ startingPrice, endDate, data }) => {
    setError("");
    setSuccess("");

    try {
      const auctionAddress = await getAuctionAddress(auctionId + 1);
      const txHash = await program.methods
        .createAuction(new BN(startingPrice), endDate, data)
        .accounts({
          auction: auctionAddress,
          master: masterAddress,
          _dumpBidder: await getBidderAddress(auctionAddress, 0),
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      await confirmTx(txHash, connection);

      updateState();
      toast.success("Lottery Created!");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const bidding = async ({ price }) => {
    if (isNaN(price)) {
      toast.error("Please enter the new price");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const txHash = await program.methods
        .bidding(auctionId, new BN(price))
        .accounts({
          auction: auctionAddress,
          prevBidder: await getBidderAddress(
            auctionAddress,
            auction.lastBidderId,
          ),
          bidder: await getBidderAddress(
            auctionAddress,
            auction.lastBidderId + 1,
          ),
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      await confirmTx(txHash, connection);
      toast.success("Bought a Ticket!");
      updateState();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const pickWinner = async () => {
    setError("");
    setSuccess("");

    try {
      const txHash = await program.methods
        .pickWinner(auctionId)
        .accounts({
          auction: auctionAddress,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      await confirmTx(txHash, connection);

      updateState();
      toast.success("Picked winner!");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const claimReward = async (bidderId) => {
    setError("");
    setSuccess("");

    try {
      const txHash = await program.methods
        .claimReward(auctionId, new BN(bidderId))
        .accounts({
          auction: auctionAddress,
          bidder: await getBidderAddress(auctionAddress, bidderId),
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      await confirmTx(txHash, connection);

      updateState();
      toast.success("The Winner has claimed the prize!!");
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  useEffect(() => {
    if (!auction) return;
    getPlayers();
    getHistory();
  }, [getPlayers, getHistory, auction]);

  return (
    <AppContext.Provider
      value={{
        isMasterInitialized: initialized,
        connected: wallet?.publicKey ? true : false,
        isAuctionAuthority:
          wallet && auction && wallet.publicKey.equals(auction.authority),
        auctionId,
        auctionPlayers,
        biddingHistory,
        auction: auction,
        initMaster,
        createAuction,
        bidding,
        pickWinner,
        claimReward,
        error,
        success,
        initialized,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  return useContext(AppContext);
};
