export default function Modal({ isOpen, onClose, title, children, id = 'modal' }) {
  if (!isOpen) return null;

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} id={`${id}-backdrop`}>
      <div className="modal-box" id={`${id}-box`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} id={`${id}-close-btn`} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
