import { useEffect, useMemo } from "react";
import { isPizza, isPasta } from "../utils/productType";
import { useLanguage } from "../context/LanguageContext";

const DEFAULT_FALLBACK = "images/fallBackImg.png";

function formatMoney(n, currency = "EUR") {
    const val = Number(n || 0);
    return `${val.toFixed(2)} ${currency}`;
}

export default function QuickModal({
    item,
    pizzaDetails,
    pastaDetails,
    selectedVariantId,
    setSelectedVariantId,
    selectedSauceId,
    setSelectedSauceId,
    onAdd,
    onDetails,
    onClose,
    loading = false,
    error = null,
    adding = false,
    currency = "EUR",
    fallbackSrc = DEFAULT_FALLBACK,
}) {
    const { t, enumLabel } = useLanguage();
    const itemIsPizza = isPizza(item);
    const itemIsPasta = isPasta(item);

    const selectedVariant = useMemo(() => {
        if (!pizzaDetails?.variants?.length) return null;
        return pizzaDetails.variants.find((v) => String(v.id) === String(selectedVariantId)) || null;
    }, [pizzaDetails, selectedVariantId]);

    const selectedSauce = useMemo(() => {
        if (!pastaDetails?.sauces?.length) return null;
        return pastaDetails.sauces.find((s) => String(s.id) === String(selectedSauceId)) || null;
    }, [pastaDetails, selectedSauceId]);

    const base = Number(pizzaDetails?.basePrice ?? pastaDetails?.basePrice ?? item?.basePrice ?? item?.price ?? 0);
    const extra = itemIsPizza ? Number(selectedVariant?.extraPrice || 0) : itemIsPasta ? Number(selectedSauce?.extraPrice || 0) : 0;
    const finalPrice = base + extra;

    const variantLabel = (v) => v?.name || [enumLabel(v?.size), enumLabel(v?.dough)].filter(Boolean).join(" / ");
    const sauceLabel = (s) => [s?.ingredientName || s?.name, enumLabel(s?.spicyLevel)].filter(Boolean).join(" / ");

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-window" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label={t("Close")}>x</button>

                <div className="modal-header">
                    <img src={item?.imageUrl || fallbackSrc} alt={item?.name} />
                    <div>
                        <h3>{item?.name}</h3>
                        {item?.description && <p className="muted">{item.description}</p>}
                    </div>
                </div>

                {loading && <p>{t("Loading...")}</p>}
                {error && <p className="alert error">{error}</p>}

                {itemIsPizza && !loading && !error && (
                    <div className="modal-body">
                        {pizzaDetails?.variants?.length ? (
                            <>
                                <label className="block">
                                    {t("Variant")}:
                                    <select value={selectedVariantId ?? ""} onChange={(e) => setSelectedVariantId?.(e.target.value)}>
                                        {pizzaDetails.variants.map((v) => (
                                            <option className="modal-options" key={v.id} value={v.id}>
                                                {variantLabel(v)}{Number(v.extraPrice) > 0 ? ` (+${formatMoney(v.extraPrice, currency)})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <div className="price-row"><span>{t("Total")}:</span><strong>{formatMoney(finalPrice, currency)}</strong></div>
                            </>
                        ) : <p className="muted">{t("No variants available.")}</p>}
                    </div>
                )}

                {itemIsPasta && !loading && !error && (
                    <div className="modal-body">
                        {pastaDetails?.sauces?.length ? (
                            <>
                                <label className="block">
                                    {t("Sauce")}:
                                    <select value={selectedSauceId ?? ""} onChange={(e) => setSelectedSauceId?.(e.target.value)}>
                                        {pastaDetails.sauces.map((s) => (
                                            <option className="modal-options" key={s.id} value={s.id}>
                                                {sauceLabel(s)}{Number(s.extraPrice) > 0 ? ` (+${formatMoney(s.extraPrice, currency)})` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <div className="price-row"><span>{t("Total")}:</span><strong>{formatMoney(finalPrice, currency)}</strong></div>
                            </>
                        ) : <p className="muted">{t("No sauces available.")}</p>}
                    </div>
                )}

                {!itemIsPizza && !itemIsPasta && !loading && !error && (
                    <div className="modal-body"><div className="price-row"><span>{t("Price")}:</span><strong>{formatMoney(item?.price ?? item?.basePrice, currency)}</strong></div></div>
                )}

                <div className="modal-actions">
                    <button className="btn primary" onClick={() => onAdd?.(item, itemIsPizza ? selectedVariant : itemIsPasta ? selectedSauce : null)} disabled={loading || adding}>
                        {adding ? t("Adding...") : t("Add to cart")}
                    </button>
                    <button className="btn outline" onClick={() => onDetails?.(item)}>{t("Details")}</button>
                </div>
            </div>
        </div>
    );
}
