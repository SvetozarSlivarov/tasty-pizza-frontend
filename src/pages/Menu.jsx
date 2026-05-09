import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { catalogApi, productApi } from "../api/catalog";
import { useCart } from "../context/CartContext";
import "../styles/menu.css";
import "../styles/modal.css";
import QuickModal from "../components/QuickModal";
import { isPizza, isPasta } from "../utils/productType";

const FallbackImg = "images/fallBackImg.png";
const SORTS = [
  { key: "new", label: "Newest" },
  { key: "priceAsc", label: "Price up" },
  { key: "priceDesc", label: "Price down" },
  { key: "name", label: "Name A-Z" },
];

function useCatalog() {
  const [pizzas, setPizzas] = useState([]);
  const [pastas, setPastas] = useState([]);
  const [drinks, setDrinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [pz, pa, dr] = await Promise.all([catalogApi.pizzas(true), catalogApi.pastas(true), catalogApi.drinks()]);
        if (!mounted) return;
        setPizzas(Array.isArray(pz) ? pz : []);
        setPastas(Array.isArray(pa) ? pa : []);
        setDrinks(Array.isArray(dr) ? dr : []);
      } catch (e) {
        if (mounted) setError(e?.message || "Error loading menu.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { pizzas, pastas, drinks, loading, error };
}

function sortItems(items, sortBy) {
  const copy = items.slice();
  const getPrice = (item) => Number(item?.price ?? item?.basePrice ?? 0);
  switch (sortBy) {
    case "priceAsc": return copy.sort((a, b) => getPrice(a) - getPrice(b));
    case "priceDesc": return copy.sort((a, b) => getPrice(b) - getPrice(a));
    case "name": return copy.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
    case "new":
    default: return copy.sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0));
  }
}

function ProductCard({ item, onOpenQuick, ctaLabel = "Add", onAdd }) {
  const price = Number(item?.price ?? item?.basePrice ?? 0).toFixed(2);
  const onAddClick = (e) => { e.stopPropagation(); onAdd?.(item); };
  return (
    <div className="card card--clickable" role="button" tabIndex={0} onClick={() => onOpenQuick?.(item)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenQuick?.(item); }}>
      <div className="media"><img src={item?.imageUrl || FallbackImg} alt={item?.name} loading="lazy" /></div>
      <div className="body">
        <div className="row1"><h4 className="title">{item?.name}</h4><span className="price">{price} BGN</span></div>
        {item?.description && <p className="desc">{item.description}</p>}
        <div className="row2"><button className="btn primary" onClick={onAddClick}>{ctaLabel}</button></div>
      </div>
    </div>
  );
}

function Section({ id, title, items, sortBy, setSortBy, emptyText, ctaLabel, onAdd, openQuickModal }) {
  return (
    <section className="section" id={id}>
      <div className="section-head">
        <h3>{title}</h3>
        <div className="controls">
          <label>Sort by:
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>
      {items.length === 0 ? <p className="muted">{emptyText}</p> : (
        <div className="grid">{items.map((p) => <ProductCard key={p.id} item={p} ctaLabel={ctaLabel} onAdd={onAdd} onOpenQuick={openQuickModal} />)}</div>
      )}
    </section>
  );
}

export default function Menu() {
  const navigate = useNavigate();
  const cart = useCart();
  const { pizzas, pastas, drinks, loading, error } = useCatalog();
  const [sortByPizzas, setSortByPizzas] = useState("new");
  const [sortByPastas, setSortByPastas] = useState("new");
  const [sortByDrinks, setSortByDrinks] = useState("new");
  const [query, setQuery] = useState("");

  const [quickItem, setQuickItem] = useState(null);
  const [quickPizza, setQuickPizza] = useState(null);
  const [quickPasta, setQuickPasta] = useState(null);
  const [quickVariantId, setQuickVariantId] = useState(null);
  const [quickSauceId, setQuickSauceId] = useState(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState(null);
  const [adding, setAdding] = useState(false);

  const filter = (list, sortBy) => {
    const sorted = sortItems(list, sortBy);
    if (!query) return sorted;
    const q = query.toLowerCase();
    return sorted.filter((x) => (x?.name || "").toLowerCase().includes(q) || (x?.description || "").toLowerCase().includes(q));
  };

  const filteredPizzas = useMemo(() => filter(pizzas, sortByPizzas), [pizzas, sortByPizzas, query]);
  const filteredPastas = useMemo(() => filter(pastas, sortByPastas), [pastas, sortByPastas, query]);
  const filteredDrinks = useMemo(() => filter(drinks, sortByDrinks), [drinks, sortByDrinks, query]);

  const onAddToCart = async (item, option = null) => {
    try {
      setAdding(true);
      if (isPizza(item)) {
        let v = option;
        if (!v) {
          const p = await productApi.pizza(item.id, true);
          v = Array.isArray(p?.variants) && p.variants.length ? p.variants[0] : null;
        }
        const variantId = v?.id ?? (quickVariantId ? Number(quickVariantId) : null);
        if (!variantId) throw new Error("Please select a pizza variant.");
        await cart.addPizza({ productId: item.id, variantId, quantity: 1, removeIngredientIds: [], addIngredientIds: [], note: "" });
      } else if (isPasta(item)) {
        let s = option;
        if (!s) {
          const p = await productApi.pasta(item.id);
          s = Array.isArray(p?.sauces) && p.sauces.length ? p.sauces[0] : null;
        }
        const pastaSauceId = s?.id ?? (quickSauceId ? Number(quickSauceId) : null);
        if (!pastaSauceId) throw new Error("Please select a pasta sauce.");
        await cart.addPasta({ productId: item.id, pastaSauceId, quantity: 1, addIngredientIds: [], note: "" });
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
    setQuickPasta(null);
    setQuickVariantId(null);
    setQuickSauceId(null);
    if (isPizza(item)) {
      try { setQuickLoading(true); const p = await productApi.pizza(item.id, true); setQuickPizza(p); if (p?.variants?.length) setQuickVariantId(String(p.variants[0].id)); }
      catch (e) { setQuickError(e?.data?.message || e?.message || "Failed to load pizza details."); }
      finally { setQuickLoading(false); }
    } else if (isPasta(item)) {
      try { setQuickLoading(true); const p = await productApi.pasta(item.id); setQuickPasta(p); if (p?.sauces?.length) setQuickSauceId(String(p.sauces[0].id)); }
      catch (e) { setQuickError(e?.data?.message || e?.message || "Failed to load pasta details."); }
      finally { setQuickLoading(false); }
    }
  };

  const goDetails = (item) => {
    const path = isPizza(item) ? `/pizza/${item.id}` : isPasta(item) ? `/pasta/${item.id}` : `/drink/${item.id}`;
    navigate(path);
  };

  return (
    <div className="menu-page">
      <header className="menu-header">
        <h2>Menu</h2>
        <p className="subtitle">Browse pizzas, pastas and drinks. Filter, sort and pick your favorites.</p>
        <div className="toolbar"><div className="search"><input type="search" placeholder="Search by name or description..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search in menu" /></div></div>
      </header>
      {error && <div className="alert error">{error}</div>}
      {loading && <div className="skeleton-grid" aria-busy>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-card" />)}</div>}
      {!loading && <>
        <Section id="pizzas" title="Pizzas" items={filteredPizzas} sortBy={sortByPizzas} setSortBy={setSortByPizzas} emptyText="No pizzas found." ctaLabel="Add pizza" onAdd={onAddToCart} openQuickModal={openQuickModal} />
        <Section id="pastas" title="Pastas" items={filteredPastas} sortBy={sortByPastas} setSortBy={setSortByPastas} emptyText="No pastas found." ctaLabel="Add pasta" onAdd={onAddToCart} openQuickModal={openQuickModal} />
        <Section id="drinks" title="Drinks" items={filteredDrinks} sortBy={sortByDrinks} setSortBy={setSortByDrinks} emptyText="No drinks found." ctaLabel="Add drink" onAdd={onAddToCart} openQuickModal={openQuickModal} />
      </>}
      {quickItem && <QuickModal item={quickItem} pizzaDetails={quickPizza} pastaDetails={quickPasta} selectedVariantId={quickVariantId} setSelectedVariantId={setQuickVariantId} selectedSauceId={quickSauceId} setSelectedSauceId={setQuickSauceId} onAdd={onAddToCart} onDetails={goDetails} onClose={() => setQuickItem(null)} loading={quickLoading} error={quickError} adding={adding} currency="BGN" fallbackSrc={FallbackImg} />}
    </div>
  );
}
