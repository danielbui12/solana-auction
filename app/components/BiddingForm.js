import { useForm } from 'react-hook-form';
import style from '../styles/PotCard.module.css';

const BiddingForm = ({ onSubmit }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  return (
    <form autoComplete='false' onSubmit={handleSubmit(onSubmit)}>
      <input type="number" min={1} {...register('price', { required: true })} />
      {errors.price && <p role="alert">Price is required.</p>}
      <div className={style.btn}>
        <input type="submit" />
      </div>
    </form>
  );
}
export default BiddingForm