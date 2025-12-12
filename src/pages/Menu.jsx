import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { catalogApi, productApi } from "../api/catalog";
import { useCart } from "../context/CartContext";
import "../styles/menu.css";
import "../styles/modal.css";
import QuickModal from "../components/QuickModal";
import { isPizza } from "../utils/productType";

const FallbackImg = "images/fallBackImg.png";

const SORTS = [
  { key: "new", label: "Newest" },
  { key: "priceAsc", label: "Price ↑" },
  { key: "priceDesc", label: "Price ↓" },
  { key: "name", label: "Name A–Z" },
];

function useCatalog() {
  const [pizzas, setPizzas] = useState([]);
  const [drinks, setDrinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [pz, dr] = await Promise.all([catalogApi.pizzas(true), catalogApi.drinks(true)]);
        if (!mounted) return;
        setPizzas(Array.isArray(pz) ? pz : []);
        setDrinks(Array.isArray(dr) ? dr : []);
      } catch (e) {
        console.error(e);
        if (mounted) setError(e?.message || "Error loading menu.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { pizzas, drinks, loading, error };
}

function sortItems(items, sortBy) {
  const copy = items.slice();
  const getPrice = (item) => Number(item?.price ?? item?.basePrice ?? 0);

  switch (sortBy) {
    case "priceAsc":
      return copy.sort((a, b) => getPrice(a) - getPrice(b));
    case "priceDesc":
      return copy.sort((a, b) => getPrice(b) - getPrice(a));
    case "name":
      return copy.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
    case "new":
    default:
      return copy.sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0));
  }
}

function ProductCard({ item, onOpenQuick, ctaLabel = "Add", onAdd }) {
  const price = Number(item?.price ?? item?.basePrice ?? 0).toFixed(2);

  const onAddClick = (e) => {
    e.stopPropagation();
    onAdd?.(item);
  };

  return (
    <div
      className="card card--clickable"
      role="button"
      tabIndex={0}
      onClick={() => onOpenQuick?.(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpenQuick?.(item);
      }}
    >
      <div className="media">
        <img src={item?.imageUrl || FallbackImg} alt={item?.name} loading="lazy" />
      </div>
      <div className="body">
        <div className="row1">
          <h4 className="title">{item?.name}</h4>
          <span className="price">{price} BGN</span>
        </div>
        {item?.description && <p className="desc">{item.description}</p>}
        <div className="row2">
          <button className="btn primary" onClick={onAddClick}>
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Menu() {
  const navigate = useNavigate();
  const cart = useCart();

  const { pizzas, drinks, loading, error } = useCatalog();
  const [sortByPizzas, setSortByPizzas] = useState("new");
  const [sortByDrinks, setSortByDrinks] = useState("new");
  const [query, setQuery] = useState("");

  // modal state
  const [quickItem, setQuickItem] = useState(null);
  const [quickPizza, setQuickPizza] = useState(null);
  const [quickVariantId, setQuickVariantId] = useState(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState(null);
  const [adding, setAdding] = useState(false);

  const filteredPizzas = useMemo(() => {
    const list = sortItems(pizzas, sortByPizzas);
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(
      (x) => (x?.name || "").toLowerCase().includes(q) || (x?.description || "").toLowerCase().includes(q)
    );
  }, [pizzas, sortByPizzas, query]);

  const filteredDrinks = useMemo(() => {
    const list = sortItems(drinks, sortByDrinks);
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(
      (x) => (x?.name || "").toLowerCase().includes(q) || (x?.description || "").toLowerCase().includes(q)
    );
  }, [drinks, sortByDrinks, query]);

  const onAddToCart = async (item, variant = null) => {
    try {
      setAdding(true);

      if (isPizza(item)) {
        let v = variant;

        if (!v) {
          const p = await productApi.pizza(item.id, true);
          v = Array.isArray(p?.variants) && p.variants.length ? p.variants[0] : null;
        }

        const variantId = v?.id ?? (quickVariantId ? Number(quickVariantId) : null);
        if (!variantId) throw new Error("Please select a pizza variant.");

        await cart.addPizza({
          productId: item.id,
          variantId,
          quantity: 1,
          removeIngredientIds: [],
          addIngredientIds: [],
          note: "",
        });
      } else {
        await cart.addDrink({ productId: item.id, quantity: 1, note: "" });
      }

      setQuickItem(null);
    } catch (e) {
      alert(e?.data?.message || e?.message || "Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  const openQuickModal = async (item) => {
    setQuickItem(item);
    setQuickError(null);
    setQuickPizza(null);
    setQuickVariantId(null);

    // ✅ само за пица
    if (isPizza(item)) {
      try {
        setQuickLoading(true);
        const p = await productApi.pizza(item.id, true);
        setQuickPizza(p);
        if (p?.variants?.length) setQuickVariantId(String(p.variants[0].id));
      } catch (e) {
        setQuickError(e?.data?.message || e?.message || "Failed to load pizza details.");
      } finally {
        setQuickLoading(false);
      }
    }
  };

  const closeQuickModal = () => setQuickItem(null);

  const goDetails = (item) => {
    const path = isPizza(item) ? `/pizza/${item.id}` : `/drink/${item.id}`;
    navigate(path);
  };

  return (
    <div className="menu-page">
      <header className="menu-header">
        <h2>Menu</h2>
        <p className="subtitle">Browse our pizzas and drinks. Filter, sort and pick your favorites.</p>
        <div className="toolbar">
          <div className="search">
            <input
              type="search"
              placeholder="Search by name or description…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search in menu"
            />
          </div>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}
      {loading && (
        <div className="skeleton-grid" aria-busy>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      )}

      {!loading && (
        <>
          <section className="section" id="pizzas">
            <div className="section-head">
              <h3>Pizzas</h3>
              <div className="controls">
                <label>
                  Sort by:
                  <select value={sortByPizzas} onChange={(e) => setSortByPizzas(e.target.value)}>
                    {SORTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {filteredPizzas.length === 0 ? (
              <p className="muted">No pizzas found.</p>
            ) : (
              <div className="grid">
                {filteredPizzas.map((p) => (
                  <ProductCard
                    key={p.id}
                    item={p}
                    ctaLabel="Add pizza"
                    onAdd={onAddToCart}
                    onOpenQuick={openQuickModal}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="section" id="drinks">
            <div className="section-head">
              <h3>Drinks</h3>
              <div className="controls">
                <label>
                  Sort by:
                  <select value={sortByDrinks} onChange={(e) => setSortByDrinks(e.target.value)}>
                    {SORTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {filteredDrinks.length === 0 ? (
              <p className="muted">No drinks found.</p>
            ) : (
              <div className="grid">
                {filteredDrinks.map((d) => (
                  <ProductCard
                    key={d.id}
                    item={d}
                    ctaLabel="Add drink"
                    onAdd={onAddToCart}
                    onOpenQuick={openQuickModal}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {quickItem && (
        <QuickModal
          item={quickItem}
          pizzaDetails={quickPizza}
          selectedVariantId={quickVariantId}
          setSelectedVariantId={setQuickVariantId}
          onAdd={onAddToCart}
          onDetails={goDetails}
          onClose={closeQuickModal}
          loading={quickLoading}
          error={quickError}
          adding={adding}
          currency="BGN"
          fallbackSrc={"images/fallBackImg.png"}
        />
      )}
    </div>
  );
}
