import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import style from "../styles/PotCard.module.css";
import { useAppContext } from "../context/context";
import { shortenPk } from "../utils/helper";
import { Toaster } from 'react-hot-toast';
import CustomModal from "./Modal";
import CreateAuctionForm from "./CreateAuctionForm";
import BiddingForm from "./BiddingForm";
import { useEffect, useMemo } from "react";
import MOCK_DATA from '../assets/MOCK_DATA.json';
import Image from "next/image";

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
    auction,
  } = useAppContext();
  const endDate = useMemo(() => new Date(Number(auction?.endDate?.toString())), [auction?.endDate])
  const isFinished = endDate < new Date()
  const auctionData = MOCK_DATA.find(_item => _item.id === Number(auction?.data))

  useEffect(() => {
    // Update the count down every 1 second
    let intervalId = setInterval(function () {

      // Get today's date and time
      var now = new Date().getTime();

      // Find the distance between now and the count down date
      var distance = endDate - now;

      // Time calculations for days, hours, minutes and seconds
      var days = Math.floor(distance / (1000 * 60 * 60 * 24));
      var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      var seconds = Math.floor((distance % (1000 * 60)) / 1000);

      // Display the result in the element with id="demo"
      document.getElementById("timer").innerHTML = days + "d " + hours + "h "
        + minutes + "m " + seconds + "s ";

      // If the count down is finished, write some text
      if (distance < 0) {
        clearInterval(x);
        document.getElementById("timer").innerHTML = "00:00:00";
      }

    }, 1000);

    return () => {
      clearInterval(intervalId)
    }
  }, [endDate])

  if (!isMasterInitialized)
    return (
      <div className={style.wrapper}>
        <div className={style.title}>
          Auction <span className={style.textAccent}>#{auctionId}</span>
        </div>
        {connected ? (
          <>
            <div className={style.btn} onClick={initMaster}>
              <button>
                Initialize master
              </button>
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
      <div className={style.timer}>
        Session will close in: <span className={style.textAccent} id="timer">00:00:00</span>
      </div>
      <div className={style.pot}>💲Current Price: {+(auction?.startingPrice?.toString()) < +(auction?.currentPrice?.toString()) ? +(auction?.currentPrice?.toString()) : +(auction?.startingPrice?.toString()) } SOL💲</div>
      <div className={style.potData}>
        <div>
          <Image width={250} height={350} src={auctionData?.image} alt="action-image"/>
        </div>
        <div>
          <div className={style.potName}>{auctionData?.name}</div>
          <div className={style.potDesc}>{auctionData?.description}</div>
        </div>
      </div>
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
            <CustomModal text="Place a bidding" className={style.btn} modalTitle="Place a bid">
              <BiddingForm onSubmit={bidding} />
            </CustomModal>
          )}

          {isAuctionAuthority && isFinished && !auction?.winnerId && (
            <div className={style.btn} onClick={pickWinner}>
              <button>
                Pick Winner
              </button>
            </div>
          )}

          {/* {canClaim && (
            <div className={style.btn} onClick={claimReward}>
              Claim reward
            </div>
          )} */}
          {
            !isFinished && (
              <CustomModal text="Create a new auction" className={style.btn} modalTitle="Create a new auction">
                <CreateAuctionForm onSubmit={createAuction} />
              </CustomModal>
            )
          }
        </>
      ) : (
        <WalletMultiButton />
      )}
    </div>
  );
};

export default PotCard;
