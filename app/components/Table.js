import { useAppContext } from "../context/context";
import style from "../styles/Table.module.css";
import TableRow from "./TableRow";

const Table = () => {
  const { biddingHistory } = useAppContext();
  console.log("biddingHistory", biddingHistory);
  return (
    <div className={style.wrapper}>
      <div className={style.tableHeader}>
        <div className={style.addressTitle}>🏦 Auction</div>
        <div className={style.addressTitle}>#️⃣ Address</div>
        <div className={style.addressTitle}>💳 Bidding</div>
        <div className={style.amountTitle}>💲 Price</div>
      </div>
      <div className={style.rows}>
        {biddingHistory?.map((h, i) => (
          <TableRow key={i} {...h} />
        ))}
      </div>
    </div>
  );
};

export default Table;
