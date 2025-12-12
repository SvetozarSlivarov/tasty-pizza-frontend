import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/modal.css";
import "../styles/home.css";
import { catalogApi, productApi } from "../api/catalog";
import { useCart } from "../context/CartContext";
import QuickModal from "../components/QuickModal";
import { isPizza } from "../utils/productType";

const FallbackImg = "images/fallBackImg.png";

function money(v) {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : String(v);
}

export default function Home() {
  const navigate = useNavigate();
  const cart = useCart();

  const [latestPizzas, setLatestPizzas] = useState([]);
  const [latestDrinks, setLatestDrinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Quick modal state
  const [quickItem, setQuickItem] = useState(null);
  const [quickPizza, setQuickPizza] = useState(null);
  const [quickVariantId, setQuickVariantId] = useState(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [pz, dr] = await Promise.all([
          catalogApi.pizzas(false),
          catalogApi.drinks(true),
        ]);

        if (!mounted) return;

        const byIdDesc = (a, b) => (b?.id ?? 0) - (a?.id ?? 0);
        setLatestPizzas((Array.isArray(pz) ? pz : []).slice().sort(byIdDesc).slice(0, 3));
        setLatestDrinks((Array.isArray(dr) ? dr : []).slice().sort(byIdDesc).slice(0, 3));
      } catch (e) {
        console.error(e);
        setErr(e?.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const closeQuickModal = () => {
    setQuickItem(null);
    setQuickError(null);
    setQuickPizza(null);
    setQuickVariantId(null);
  };

  const openQuickModal = async (item) => {
    setQuickItem(item);
    setQuickError(null);
    setQuickPizza(null);
    setQuickVariantId(null);

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

  const goDetails = (item) => {
    const path = isPizza(item) ? `/pizza/${item.id}` : `/drink/${item.id}`;
    navigate(path);
  };

  const onAddToCart = async (item, variant = null) => {
    try {
      setAdding(true);

      if (isPizza(item)) {
        let v = variant;

        if (!v) {
          const p = quickPizza?.id === item.id ? quickPizza : await productApi.pizza(item.id, true);
          v = Array.isArray(p?.variants) && p.variants.length ? p.variants[0] : null;
        }

        const variantId =
          v?.id ?? (quickVariantId ? Number(quickVariantId) : null);

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
        await cart.addDrink({
          productId: item.id,
          quantity: 1,
          note: "",
        });
      }

      closeQuickModal();
      cart?.refresh?.();
    } catch (e) {
      alert(e?.data?.message || e?.message || "Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="home">
      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Fresh • Fast • Hot</p>
          <h1>
            Tasty <span>Pizza</span> in minutes
          </h1>
          <p className="sub">
            Hand-tossed dough, premium ingredients, stone-baked perfection.
            Order now and get your pizza in under 30 minutes.
          </p>
          <div className="cta-row">
            <Link to="/menu" className="btn primary">
              Order now
            </Link>
            <a href="#why" className="btn ghost">
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section id="why" className="why">
        <h2>
          Why choose <span>Tasty Pizza</span>?
        </h2>
        <div className="why-grid">
          <article>
            <div className="ic">🔥</div>
            <h3>Stone-baked</h3>
            <p>That perfect crust — crisp outside, soft inside.</p>
          </article>
          <article>
            <div className="ic">🧀</div>
            <h3>Real mozzarella</h3>
            <p>Stretchy, fragrant, and full of flavor.</p>
          </article>
          <article>
            <div className="ic">⏱️</div>
            <h3>Fast delivery</h3>
            <p>Average delivery time under 30 minutes.</p>
          </article>
        </div>
      </section>

      {/* NEWEST PIZZAS */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">NEWEST PIZZAS</h2>

          {loading && (
            <div className="skeleton-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <div className="skeleton-card" key={i} />
              ))}
            </div>
          )}

          {err && <p className="error">{err}</p>}

          {!loading && !err && (
            <div className="grid">
              {latestPizzas.map((p) => (
                <article
                  className="card card--clickable"
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openQuickModal(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openQuickModal(p);
                  }}
                >
                  <div className="thumb">
                    <img
                      src={p.imageUrl || FallbackImg}
                      alt={p.name}
                      loading="lazy"
                      width={640}
                      height={480}
                    />
                  </div>
                  <div className="body">
                    <h3 className="title">{p.name}</h3>
                    {p.description && <p className="desc">{p.description}</p>}
                    <div className="meta">
                      <span className="price">
                        from {money(p.basePrice ?? p.price)} BGN
                      </span>
                      {p.spicyLevel && (
                        <span className="badge">Spicy level: {p.spicyLevel}</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* NEWEST DRINKS */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">NEWEST DRINKS</h2>

          {loading && (
            <div className="skeleton-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <div className="skeleton-card" key={i} />
              ))}
            </div>
          )}

          {!loading && !err && (
            <div className="grid drinks">
              {latestDrinks.map((d) => (
                <article
                  className="card card--clickable"
                  key={d.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openQuickModal(d)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openQuickModal(d);
                  }}
                >
                  <div className="thumb">
                    <img
                      src={d.imageUrl || FallbackImg}
                      alt={d.name}
                      loading="lazy"
                      width={640}
                      height={480}
                    />
                  </div>
                  <div className="body">
                    <h3 className="title">{d.name}</h3>
                    {d.description && <p className="desc">{d.description}</p>}
                    <div className="meta">
                      <span className="price">{money(d.price ?? d.basePrice)} BGN</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="more-row">
            <Link to="/menu" className="home-see-more-btn">
              See all <span className="home-arr" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <h2>What our customers say</h2>
        <div className="quotes">
          <blockquote>
            “Best crust in town!” <cite>— Mira</cite>
          </blockquote>
          <blockquote>
            “Arrived in 22 minutes. Hot and juicy.” <cite>— Ivan</cite>
          </blockquote>
          <blockquote>
            “My favorite Pepperoni. Perfect balance.” <cite>— George</cite>
          </blockquote>
        </div>
      </section>

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
          fallbackSrc={FallbackImg}
        />
      )}
    </div>
  );
}
