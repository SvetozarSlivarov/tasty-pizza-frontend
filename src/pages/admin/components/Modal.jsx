import { useEffect, useRef } from "react";
import styles from "../../../styles/Drinks.module.css";

export default function Modal({ title, isOpen, onClose, children, footer }) {
    const dialogRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        // Lock scroll
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        // Focus first focusable
        const el = dialogRef.current;
        setTimeout(() => {
            if (!el) return;
            const focusable = el.querySelector(
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
                    <button className={styles.modalClose} onClick={onClose} aria-label="Close">
                        ✕
                    </button>
                </div>
                <div className={styles.modalBody}>{children}</div>
                {footer ? <div className={styles.modalFooter}>{footer}</div> : null}
            </div>
        </div>
    );
}
