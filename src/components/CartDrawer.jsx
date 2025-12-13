import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { productApi } from "../api/catalog";
import "../styles/cart.css";
import CheckoutModal from "../components/CheckoutModal";
import SuccessCelebration from "../components/SuccessCelebration";

export default function CartDrawer() {
  const cart = useCart();

  // { [productId]: { [ingredientId]: ingredientName } }
  const [ingNameCache, setIngNameCache] = useState({});
  const [openCheckout, setOpenCheckout] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const isOpen = cart.isOpen;

  const refreshRef = useRef(cart.refresh);
  useEffect(() => {
    refreshRef.current = cart.refresh;
  }, [cart.refresh]);

  // refresh once when drawer opens
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      Promise.resolve(refreshRef.current?.()).catch(() => {});
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const pizzaItemsNeedingCache = useMemo(() => {
    if (!cart.isOpen) return [];
    return (cart.items || []).filter((i) => i.type === "pizza" && i.productId != null);
  }, [cart.isOpen, cart.items]);

  useEffect(() => {
    if (!cart.isOpen) return;

    const productIds = Array.from(new Set(pizzaItemsNeedingCache.map((i) => i.productId)));
    const missing = productIds.filter((pid) => !ingNameCache[pid]);

    if (missing.length === 0) return;

    let cancelled = false;

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
              const key = x?.ingredientId;
              if (key != null) map[key] = x?.ingredientName ?? "";
            });

            (Array.isArray(allow) ? allow : []).forEach((x) => {
              const key = x?.ingredientId;
              if (key != null) map[key] = x?.ingredientName ?? "";
            });

            return [pid, map];
          })
        );

        if (cancelled) return;

        setIngNameCache((prev) => {
          const next = { ...prev };
          for (const [pid, map] of entries) next[pid] = map;
          return next;
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cart.isOpen, pizzaItemsNeedingCache, ingNameCache]);

  const ingredientName = (productId, ingredientId) =>
    ingNameCache?.[productId]?.[ingredientId] || `#${ingredientId}`;

  const formatCustomizations = (it) => {
    if (it.type !== "pizza" || !Array.isArray(it.customizations) || it.customizations.length === 0) {
      return null;
    }

    const formatted = it.customizations
      .filter((c) => c?.ingredientId != null && c?.action)
      .map((c) => {
        const action = String(c.action || "").toUpperCase();
        const sign = action === "ADD" ? "+" : action === "REMOVE" ? "–" : "";
        return `${sign} ${ingredientName(it.productId, c.ingredientId)}`;
      });

    if (formatted.length === 0) return null;

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
    } catch {
      // ignore here (cart.error will show)
    }
  };

  return (
    <>
      <div className={`cart-backdrop ${cart.isOpen ? "open" : ""}`} onClick={cart.close} />

      <aside className={`cart-drawer ${cart.isOpen ? "open" : ""}`} aria-hidden={!cart.isOpen}>
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
              {cart.items.map((it) => {
                const isPizza = it.type === "pizza";
                const isDrink = it.type === "drink";

                const customizationSummary = isPizza ? formatCustomizations(it) : null;

                const lineTotal = (Number(it.unitPrice) || 0) * (Number(it.qty) || 0);
                const ea = Number(it.unitPrice) || 0;

                return (
                  <li key={it.id} className={`cart-item ${isPizza ? "item-pizza" : "item-drink"}`}>
                    <div className="ci-media">
                      {it.imageUrl ? (
                        <img src={it.imageUrl} alt={it.name} />
                      ) : (
                        <div className="ci-placeholder" aria-hidden>
                          {isPizza ? "🍕" : "🥤"}
                        </div>
                      )}
                    </div>

                    <div className="ci-main">
                      <div className="ci-title">
                        <span className={`ci-badge ${isPizza ? "pizza" : "drink"}`}>
                          {isPizza ? "PIZZA" : "DRINK"}
                        </span>

                        <div className="ci-name">
                          <strong className="ci-product-name">{it.name}</strong>

                          {it.variantLabel && <span className="ci-variant">{it.variantLabel}</span>}
                        </div>
                      </div>

                      {/* Pizza-only customizations */}
                      {isPizza && customizationSummary && (
                        <div className="ci-customizations-inline" title={customizationSummary.title}>
                          {customizationSummary.display}
                        </div>
                      )}

                      {/* Drink-only small hint */}
                      {isDrink && <div className="ci-customizations-inline muted">No options</div>}

                      <div className="ci-meta">
                        <div className="qty">
                          <button
                            className="icon-btn"
                            onClick={() => cart.updateQty(it.id, it.qty - 1)}
                            aria-label="Decrease"
                            disabled={it.qty <= 1}
                            title="Decrease"
                          >
                            –
                          </button>

                          <input
                            type="number"
                            min={1}
                            value={it.qty}
                            onChange={(e) => cart.updateQty(it.id, Number(e.target.value) || 1)}
                            aria-label="Quantity"
                          />

                          <button
                            className="icon-btn"
                            onClick={() => cart.updateQty(it.id, it.qty + 1)}
                            aria-label="Increase"
                            title="Increase"
                          >
                            +
                          </button>
                        </div>

                        <div className="price">
                          {lineTotal.toFixed(2)} BGN
                          <span className="muted per">({ea.toFixed(2)} ea)</span>
                        </div>
                      </div>
                    </div>

                    <div className="ci-actions">
                      {isPizza && it.productId != null && (
                        <Link
                          to={`/pizza/${it.productId}?editItemId=${it.id}`}
                          className="icon-btn"
                          onClick={cart.close}
                          aria-label="Edit pizza"
                          title="Edit"
                          style={{ marginRight: 8 }}
                        >
                          ✏️
                        </Link>
                      )}

                      <button
                        className="icon-btn"
                        onClick={() => cart.remove(it.id)}
                        aria-label="Remove item"
                        title="Remove"
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="cart-footer">
          <div className="row">
            <span>Subtotal</span>
            <strong>{cart.subtotal.toFixed(2)} BGN</strong>
          </div>

          <div className="row actions">
            <button className="btn outline" onClick={cart.clear} disabled={cart.items.length === 0}>
              Clear
            </button>

            <button className="btn" onClick={() => setOpenCheckout(true)} disabled={cart.items.length === 0}>
              Checkout
            </button>
          </div>
        </footer>
      </aside>

      <CheckoutModal open={openCheckout} onClose={() => setOpenCheckout(false)} onCheckout={handleCheckout} />

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
