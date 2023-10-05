import { useForm } from "react-hook-form";
import style from "../styles/PotCard.module.css";

const CreateAuctionForm = ({ onSubmit }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  return (
    <form autoComplete="false" onSubmit={handleSubmit(onSubmit)}>
      <label></label>
      <input type="number" {...register("startingPrice", { required: true })} />
      {errors.startingPrice && <p role="alert">Starting price is required.</p>}
      <input type="date" {...register("endDate", { required: true })} />
      {errors.endDate && <p role="alert">End date is required.</p>}
      <textarea
        rows="10"
        {...register("data", {
          required: true,
          value:
            '{\n  "id": "<enter your item id>",\n  "name": "<enter your item name>",\n  "description": "<enter your item description>",\n  "image": "<enter your item image url>"\n}',
        })}
      />
      {errors.data && <p role="alert">Please enter bidding item data.</p>}
      <div className={style.btn}>
        <input type="submit" />
      </div>
    </form>
  );
};
export default CreateAuctionForm;
