import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import "../styles/cart.css";

export default function CartFab() {
    const cart = useCart();
    const { t } = useLanguage();
    return (
        <>
        <button className="cart-fab" onClick={cart.toggle} aria-label={t("Open cart")}>
            🛒
            {cart.count > 0 && <span className="cart-badge">{cart.count}</span>}
        </button>
        </>
    );
}
