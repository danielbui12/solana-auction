import React, { useState } from "react";
import { Modal } from "react-responsive-modal";

const CustomModal = ({ children, modalTitle, text, className }) => {
  const [open, setOpen] = useState(false);

  const onOpenModal = () => setOpen(true);
  const onCloseModal = () => setOpen(false);

  return (
    <div className={className}>
      <button onClick={onOpenModal}>{text}</button>
      <Modal open={open} onClose={onCloseModal} center>
        <h2>{modalTitle}</h2>
        {children}
      </Modal>
    </div>
  );
};

export default CustomModal;
