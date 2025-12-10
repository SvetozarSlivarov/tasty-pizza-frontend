import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { productApi } from "../api/catalog";
import "../styles/cart.css";
import CheckoutModal from "../components/CheckoutModal";
import SuccessCelebration from "../components/SuccessCelebration";

export default function CartDrawer() {
    const cart = useCart();
    const [ingNameCache, setIngNameCache] = useState({});
    const [openCheckout, setOpenCheckout] = useState(false);
    const [showCelebrate, setShowCelebrate] = useState(false);

    const isOpen = cart.isOpen;

    const refreshRef = useRef(cart.refresh);
    useEffect(() => {
        refreshRef.current = cart.refresh;
    }, [cart.refresh]);

    const prevIsOpenRef = useRef(false);
    useEffect(() => {
        if (isOpen && !prevIsOpenRef.current) {
            Promise.resolve(refreshRef.current?.()).catch(() => {});
        }
        prevIsOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        if (!cart.isOpen) return;
        const pizzaItems = (cart.items || []).filter(
            (i) => i.type === "pizza" && i.productId != null
        );
        const productIds = Array.from(new Set(pizzaItems.map((i) => i.productId)));
        const missing = productIds.filter((pid) => !ingNameCache[pid]);
        if (missing.length === 0) return;

        (async () => {
            try {
                const entries = await Promise.all(
                    missing.map(async (pid) => {
                        const [base, allow] = await Promise.all([
                            productApi.pizzaIngredients(pid),
                            productApi.pizzaAllowedIngredients(pid),
                        ]);
                        const map = {};
                        (Array.isArray(base) ? base : []).forEach((x) => {
                            const id = x?.id ?? x?.ingredientId;
                            if (id != null) map[id] = x?.name ?? "";
                        });
                        (Array.isArray(allow) ? allow : []).forEach((x) => {
                            const id = x?.id ?? x?.ingredientId;
                            if (id != null) map[id] = x?.name ?? "";
                        });
                        return [pid, map];
                    })
                );
                setIngNameCache((prev) => {
                    const next = { ...prev };
                    for (const [pid, map] of entries) next[pid] = map;
                    return next;
                });
            } catch {
            }
        })();
    }, [cart.isOpen, cart.items, ingNameCache]);

    const ingredientName = (productId, ingredientId) =>
        ingNameCache?.[productId]?.[ingredientId] || `#${ingredientId}`;

    const formatCustomizations = (it) => {
        if (
            it.type !== "pizza" ||
            !Array.isArray(it.customizations) ||
            it.customizations.length === 0
        )
            return null;

        const formatted = it.customizations.map((c) => {
            const action = (c.action || "").toLowerCase();
            const sign = action === "add" ? "+" : action === "remove" ? "–" : "";
            return `${sign} ${ingredientName(it.productId, c.ingredientId)}`;
        });

        const LIMIT = 6;
        const full = formatted.join(", ");
        if (formatted.length <= LIMIT) return { display: full, title: full };

        const head = formatted.slice(0, LIMIT).join(", ");
        const more = formatted.length - LIMIT;
        return { display: `${head}, … +${more} more`, title: full };
    };


    const handleCheckout = async ({ phone, address }) => {
        try {
            await cart.checkout({ phone, address });
            setOpenCheckout(false);
            setShowCelebrate(true);
        } catch (e){
        }
    };

    return (
        <>
            <div
                className={`cart-backdrop ${cart.isOpen ? "open" : ""}`}
                onClick={cart.close}
            />
            <aside
                className={`cart-drawer ${cart.isOpen ? "open" : ""}`}
                aria-hidden={!cart.isOpen}
            >
                <header className="cart-header">
                    <h3>Your cart</h3>
                    <button className="icon-btn" onClick={cart.close} aria-label="Close">
                        ✕
                    </button>
                </header>

                <div className="cart-body">
                    {cart.error && <p className="alert error">{cart.error}</p>}

                    {!cart.loading && cart.items.length === 0 && (
                        <div className="empty">
                            <p>Your cart is empty.</p>
                            <p className="muted">Add items from the menu.</p>
                        </div>
                    )}

                    {!cart.loading && cart.items.length > 0 && (
                        <ul className="cart-list">
                            {cart.items.map((it) => (
                                <li key={it.id} className="cart-item">
                                    <div className="ci-media">
                                        {it.imageUrl ? (
                                            <img src={it.imageUrl} alt={it.name} />
                                        ) : (
                                            <div className="ci-placeholder" aria-hidden />
                                        )}
                                    </div>

                                    <div className="ci-main">
                                        <div className="ci-title">
                                            <strong>{it.name}</strong>
                                            {it.variantLabel && (
                                                <span className="muted"> · {it.variantLabel}</span>
                                            )}
                                        </div>

                                        {it.type === "pizza" &&
                                            Array.isArray(it.customizations) &&
                                            it.customizations.length > 0 &&
                                            (() => {
                                                const summary = formatCustomizations(it);
                                                return summary ? (
                                                    <div
                                                        className="ci-customizations-inline"
                                                        title={summary.title}
                                                    >
                                                        {summary.display}
                                                    </div>
                                                ) : null;
                                            })()}

                                        <div className="ci-meta">
                                            <div className="qty">
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => cart.updateQty(it.id, it.qty - 1)}
                                                    aria-label="Decrease"
                                                >
                                                    –
                                                </button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={it.qty}
                                                    onChange={(e) =>
                                                        cart.updateQty(it.id, Number(e.target.value) || 1)
                                                    }
                                                    aria-label="Quantity"
                                                />
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => cart.updateQty(it.id, it.qty + 1)}
                                                    aria-label="Increase"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <div className="price">
                                                {(it.unitPrice * it.qty).toFixed(2)} BGN
                                                <span className="muted per">
                                                    ({it.unitPrice.toFixed(2)} ea)
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ci-actions">
                                        {it.type === "pizza" && it.productId != null && (
                                            <Link
                                                to={`/pizza/${it.productId}?editItemId=${it.id}`}
                                                className="icon-btn"
                                                onClick={cart.close}
                                                aria-label="Edit"
                                                style={{ marginRight: 8 }}
                                            >
                                                ✏️
                                            </Link>
                                        )}
                                        <button
                                            className="icon-btn"
                                            onClick={() => cart.remove(it.id)}
                                            aria-label="Remove"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <footer className="cart-footer">
                    <div className="row">
                        <span>Subtotal</span>
                        <strong>{cart.subtotal.toFixed(2)} BGN</strong>
                    </div>
                    <div className="row actions">
                        <button
                            className="btn outline"
                            onClick={cart.clear}
                            disabled={cart.items.length === 0}
                        >
                            Clear
                        </button>
                        <button
                            className="btn"
                            onClick={() => setOpenCheckout(true)}
                            disabled={cart.items.length === 0}
                        >
                            Checkout
                        </button>
                    </div>
                </footer>
            </aside>

            <CheckoutModal
                open={openCheckout}
                onClose={() => setOpenCheckout(false)}
                onCheckout={handleCheckout}
            />

            {showCelebrate && (
                <SuccessCelebration
                    onDone={() => {
                        setShowCelebrate(false);
                        cart.close();
                    }}
                />
            )}
        </>
    );
}
