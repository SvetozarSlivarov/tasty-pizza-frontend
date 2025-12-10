import { useEffect, useMemo } from "react";

const DEFAULT_FALLBACK = "images/fallBackImg.png";

function formatMoney(n, currency = "BGN") {
    const val = Number(n || 0);
    return `${val.toFixed(2)} ${currency}`;
}

export default function QuickModal({
                                       item,
                                       pizzaDetails,
                                       selectedVariantId,
                                       setSelectedVariantId,
                                       onAdd,
                                       onDetails,
                                       onClose,
                                       loading = false,
                                       error = null,
                                       adding = false,
                                       currency = "BGN",
                                       fallbackSrc = DEFAULT_FALLBACK,
                                   }) {
    const isPizza = !!item?.basePrice;

    const selectedVariant = useMemo(() => {
        if (!pizzaDetails?.variants?.length) return null;
        return pizzaDetails.variants.find(
            (v) => String(v.id) === String(selectedVariantId)
        ) || null;
    }, [pizzaDetails, selectedVariantId]);

    const base = Number(pizzaDetails?.basePrice ?? item?.basePrice ?? 0);
    const extra = Number(selectedVariant?.extraPrice || 0);
    const finalPrice = base + extra;

    const variantLabel = (v) =>
        v?.name || [v?.size, v?.dough].filter(Boolean).join(" · ");

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-window" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

                <div className="modal-header">
                    <img src={item?.imageUrl || fallbackSrc} alt={item?.name} />
                    <div>
                        <h3>{item?.name}</h3>
                        {item?.description && <p className="muted">{item.description}</p>}
                    </div>
                </div>

                {loading && <p>Loading…</p>}
                {error && <p className="alert error">{error}</p>}

                {isPizza && !loading && !error && (
                    <div className="modal-body">
                        {pizzaDetails?.variants?.length ? (
                            <>
                                <label className="block">
                                    Variant:
                                    <select
                                        value={selectedVariantId ?? ""}
                                        onChange={(e) => setSelectedVariantId?.(e.target.value)}
                                    >
                                        {pizzaDetails.variants.map((v) => (
                                            <option className="modal-options"
                                                key={v.id} value={v.id}>
                                                {variantLabel(v)}
                                                {Number(v.extraPrice) > 0
                                                    ? ` (+${formatMoney(v.extraPrice, currency)})`
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <div className="price-row">
                                    <span>Total:</span>
                                    <strong>{formatMoney(finalPrice, currency)}</strong>
                                </div>
                            </>
                        ) : (
                            <p className="muted">No variants available.</p>
                        )}
                    </div>
                )}

                {!isPizza && !loading && !error && (
                    <div className="modal-body">
                        <div className="price-row">
                            <span>Price:</span>
                            <strong>{formatMoney(item?.price, currency)}</strong>
                        </div>
                    </div>
                )}

                <div className="modal-actions">
                    <button
                        className="btn primary"
                        onClick={() => onAdd?.(item, selectedVariant)}
                        disabled={loading || adding}
                    >
                        {adding ? "Adding…" : "Add to cart"}
                    </button>
                    <button className="btn outline" onClick={() => onDetails?.(item)}>
                        Details
                    </button>
                </div>
            </div>
        </div>
    );
}
