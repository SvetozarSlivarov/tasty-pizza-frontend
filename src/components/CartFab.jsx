import { useCart } from "../context/CartContext";
import "../styles/cart.css";

export default function CartFab() {
    const cart = useCart();
    return (
        <>
        <button className="cart-fab" onClick={cart.toggle} aria-label="Open cart">
            🛒
            {cart.count > 0 && <span className="cart-badge">{cart.count}</span>}
        </button>
        </>
    );
}