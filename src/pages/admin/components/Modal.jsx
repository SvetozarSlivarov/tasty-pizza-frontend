import { useEffect, useRef } from "react";
import { useLanguage } from "../../../context/LanguageContext";
import styles from "../../../styles/Drinks.module.css";

export default function Modal({ title, isOpen, onClose, children, footer }) {
  const dialogRef = useRef(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return undefined;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const el = dialogRef.current;
    setTimeout(() => {
      const focusable = el?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }, 0);

    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function onOverlayClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  return (
    <div className={styles.modalOverlay} onMouseDown={onOverlayClick}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={dialogRef}
      >
        <div className={styles.modalHeader}>
          <h3 id="modal-title" className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalClose} onClick={onClose} aria-label={t("Close")}>
            x
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
        {footer ? <div className={styles.modalFooter}>{footer}</div> : null}
      </div>
    </div>
  );
}
