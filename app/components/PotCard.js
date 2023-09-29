import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import style from "../styles/PotCard.module.css";
import { useAppContext } from "../context/context";
import { shortenPk } from "../utils/helper";
import { Toaster } from 'react-hot-toast';

const PotCard = () => {
  const {
    auctionId,
    connected,
    isAuctionAuthority,
    isMasterInitialized,
    initMaster,
    createAuction,
    bidding,
    pickWinner,
    claimReward,
    biddingHistory,
    isFinished,
  } = useAppContext();

  if (!isMasterInitialized)
    return (
      <div className={style.wrapper}>
        <div className={style.title}>
          Auction <span className={style.textAccent}>#{auctionId}</span>
        </div>
        {connected ? (
          <>
            <div className={style.btn} onClick={initMaster}>
              Initialize master
            </div>
          </>
        ) : (
          <WalletMultiButton />
        )}
      </div>
    );

  return (
    <div className={style.wrapper}>
      <Toaster />
      <div className={style.title}>
        Auction <span className={style.textAccent}>#{auctionId}</span>
      </div>
      <div className={style.pot}>Pot 🍯: {/* {lotteryPot} */} SOL</div>
      <div className={style.recentWinnerTitle}>🏆Recent Winner🏆</div>
      <div className={style.winner}>
        {biddingHistory?.length &&
          shortenPk(
            biddingHistory[biddingHistory.length - 1].winnerAddress.toBase58()
          )}
      </div>
      {connected ? (
        <>
          {!isFinished && (
            <div className={style.btn} onClick={bidding}>
              Place a bidding
            </div>
          )}

          {isAuctionAuthority && !isFinished && (
            <div className={style.btn} onClick={pickWinner}>
              Pick Winner
            </div>
          )}

          {/* {canClaim && (
            <div className={style.btn} onClick={claimReward}>
              Claim reward
            </div>
          )} */}

          <div className={style.btn} onClick={createAuction}>
            Create a new auction
          </div>
        </>
      ) : (
        <WalletMultiButton />
      )}
    </div>
  );
};

export default PotCard;
