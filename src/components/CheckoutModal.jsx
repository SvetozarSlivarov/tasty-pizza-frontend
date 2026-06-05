import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function CheckoutModal({ open, onClose, onCheckout }) {
    const { t } = useLanguage();
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open) {
            setPhone("");
            setAddress("");
            setErrors({});
        }
    }, [open]);

    const validate = () => {
        const errs = {};

        // Bulgarian mobile number only
        const phoneRegex = /^(?:\+359|0)(87|88|89|98|99)\d{7}$/;

        if (!phone.trim()) {
            errs.phone = t("Please enter your phone number.");
        } else if (!phoneRegex.test(phone.replace(/\s+/g, ""))) {
            errs.phone = t("Invalid mobile number. Example: +359881234567");
        }

        if (!address.trim()) {
            errs.address = t("Please enter your delivery address.");
        } else if (address.trim().length < 5) {
            errs.address = t("Address is too short.");
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setLoading(true);
            await onCheckout({ phone: phone.trim(), address: address.trim() });
            onClose();
        } catch (err) {
            alert(err?.data?.error || err?.message || t("Checkout failed"));
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div
                className="modal-sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby="checkout-title"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="modal-header">
                    <h3 id="checkout-title">{t("Checkout")}</h3>
                    <button className="icon-btn" aria-label={t("Close")} onClick={onClose}>
                        ✕
                    </button>
                </header>

                <form className="modal-body" onSubmit={handleSubmit}>
                    <label className="field">
                        <span>{t("Phone")}</span>
                        <input
                            type="tel"
                            placeholder="+359881234567"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />
                        {errors.phone && <div className="field-error">{errors.phone}</div>}
                    </label>

                    <label className="field">
                        <span>{t("Delivery address")}</span>
                        <textarea
                            placeholder={t("Street, building, floor, apartment")}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            rows={3}
                            required
                        />
                        {errors.address && (
                            <div className="field-error">{errors.address}</div>
                        )}
                    </label>

                    <footer className="modal-footer">
                        <button
                            type="button"
                            className="btn outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            {t("Cancel")}
                        </button>
                        <button type="submit" className="btn" disabled={loading}>
                            {loading ? t("Processing...") : t("Confirm order")}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
