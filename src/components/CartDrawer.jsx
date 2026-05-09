import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "../styles/cart.css";
import CheckoutModal from "../components/CheckoutModal";
import SuccessCelebration from "../components/SuccessCelebration";

function formatCustomizations(it) {
  if (!Array.isArray(it.customizations) || it.customizations.length === 0) return null;
  const formatted = it.customizations
    .filter((c) => c?.ingredientId != null && c?.action)
    .map((c) => {
      const action = String(c.action || "").toUpperCase();
      const sign = action === "ADD" ? "+" : action === "REMOVE" ? "-" : "";
      return `${sign} ${c.ingredientName || `#${c.ingredientId}`}`;
    });
  if (formatted.length === 0) return null;
  const LIMIT = 6;
  const full = formatted.join(", ");
  if (formatted.length <= LIMIT) return { display: full, title: full };
  const head = formatted.slice(0, LIMIT).join(", ");
  return { display: `${head}, ... +${formatted.length - LIMIT} more`, title: full };
}

export default function CartDrawer() {
  const cart = useCart();
  const [openCheckout, setOpenCheckout] = useState(false);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const isOpen = cart.isOpen;

  const refreshRef = useRef(cart.refresh);
  useEffect(() => { refreshRef.current = cart.refresh; }, [cart.refresh]);
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) Promise.resolve(refreshRef.current?.()).catch(() => {});
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  const handleCheckout = async ({ phone, address }) => {
    try {
      await cart.checkout({ phone, address });
      setOpenCheckout(false);
      setShowCelebrate(true);
    } catch {}
  };

  return (
    <>
      <div className={`cart-backdrop ${cart.isOpen ? "open" : ""}`} onClick={cart.close} />
      <aside className={`cart-drawer ${cart.isOpen ? "open" : ""}`} aria-hidden={!cart.isOpen}>
        <header className="cart-header">
          <h3>Your cart</h3>
          <button className="icon-btn" onClick={cart.close} aria-label="Close">x</button>
        </header>

        <div className="cart-body">
          {cart.error && <p className="alert error">{cart.error}</p>}
          {!cart.loading && cart.items.length === 0 && <div className="empty"><p>Your cart is empty.</p><p className="muted">Add items from the menu.</p></div>}

          {!cart.loading && cart.items.length > 0 && (
            <ul className="cart-list">
              {cart.items.map((it) => {
                const isPizza = it.type === "pizza";
                const isPasta = it.type === "pasta";
                const isDrink = it.type === "drink";
                const customizationSummary = (isPizza || isPasta) ? formatCustomizations(it) : null;
                const lineTotal = (Number(it.unitPrice) || 0) * (Number(it.qty) || 0);
                const ea = Number(it.unitPrice) || 0;
                const editPath = isPizza ? `/pizza/${it.productId}?editItemId=${it.id}` : isPasta ? `/pasta/${it.productId}?editItemId=${it.id}` : null;
                const badge = isPizza ? "PIZZA" : isPasta ? "PASTA" : "DRINK";

                return (
                  <li key={it.id} className={`cart-item ${isPizza ? "item-pizza" : isPasta ? "item-pasta" : "item-drink"}`}>
                    <div className="ci-media">
                      {it.imageUrl ? <img src={it.imageUrl} alt={it.name} /> : <div className="ci-placeholder" aria-hidden>{isPizza ? "P" : isPasta ? "PA" : "D"}</div>}
                    </div>

                    <div className="ci-main">
                      <div className="ci-title">
                        <span className={`ci-badge ${isPizza ? "pizza" : isPasta ? "pasta" : "drink"}`}>{badge}</span>
                        <div className="ci-name">
                          <strong className="ci-product-name">{it.name}</strong>
                          {it.variantLabel && <span className="ci-variant">{it.variantLabel}</span>}
                          {isPasta && it.pastaSauceName && <span className="ci-variant">{it.pastaSauceName}{it.pastaSauceSpicyLevel ? ` / ${it.pastaSauceSpicyLevel}` : ""}</span>}
                        </div>
                      </div>

                      {(isPizza || isPasta) && customizationSummary && <div className="ci-customizations-inline" title={customizationSummary.title}>{customizationSummary.display}</div>}
                      {isDrink && <div className="ci-customizations-inline muted">No options</div>}

                      <div className="ci-meta">
                        <div className="qty">
                          <button className="icon-btn" onClick={() => cart.updateQty(it.id, it.qty - 1)} aria-label="Decrease" disabled={it.qty <= 1} title="Decrease">-</button>
                          <input type="number" min={1} value={it.qty} onChange={(e) => cart.updateQty(it.id, Number(e.target.value) || 1)} aria-label="Quantity" />
                          <button className="icon-btn" onClick={() => cart.updateQty(it.id, it.qty + 1)} aria-label="Increase" title="Increase">+</button>
                        </div>
                        <div className="price">{lineTotal.toFixed(2)} BGN <span className="muted per">({ea.toFixed(2)} ea)</span></div>
                      </div>
                    </div>

                    <div className="ci-actions">
                      {editPath && <Link to={editPath} className="icon-btn" onClick={cart.close} aria-label={`Edit ${badge.toLowerCase()}`} title="Edit" style={{ marginRight: 8 }}>Edit</Link>}
                      <button className="icon-btn" onClick={() => cart.remove(it.id)} aria-label="Remove item" title="Remove">Del</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="cart-footer">
          <div className="row"><span>Subtotal</span><strong>{cart.subtotal.toFixed(2)} BGN</strong></div>
          <div className="row actions">
            <button className="btn outline" onClick={cart.clear} disabled={cart.items.length === 0}>Clear</button>
            <button className="btn" onClick={() => setOpenCheckout(true)} disabled={cart.items.length === 0}>Checkout</button>
          </div>
        </footer>
      </aside>

      <CheckoutModal open={openCheckout} onClose={() => setOpenCheckout(false)} onCheckout={handleCheckout} />
      {showCelebrate && <SuccessCelebration onDone={() => { setShowCelebrate(false); cart.close(); }} />}
    </>
  );
}
