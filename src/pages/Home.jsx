import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/modal.css";
import "../styles/home.css";
import { catalogApi, productApi } from "../api/catalog";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import QuickModal from "../components/QuickModal";
import { isPizza, isPasta } from "../utils/productType";

const FallbackImg = "images/fallBackImg.png";

function money(v) {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : String(v);
}

export default function Home() {
  const navigate = useNavigate();
  const cart = useCart();
  const { language, t, enumLabel } = useLanguage();

  const [latestPizzas, setLatestPizzas] = useState([]);
  const [latestPastas, setLatestPastas] = useState([]);
  const [latestDrinks, setLatestDrinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Quick modal state
  const [quickItem, setQuickItem] = useState(null);
  const [quickPizza, setQuickPizza] = useState(null);
  const [quickPasta, setQuickPasta] = useState(null);
  const [quickVariantId, setQuickVariantId] = useState(null);
  const [quickSauceId, setQuickSauceId] = useState(null);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const [pz, pa, dr] = await Promise.all([
          catalogApi.pizzas(false, language),
          catalogApi.pastas(true, language),
          catalogApi.drinks(language),
        ]);

        if (!mounted) return;

        const byIdDesc = (a, b) => (b?.id ?? 0) - (a?.id ?? 0);
        setLatestPizzas((Array.isArray(pz) ? pz : []).slice().sort(byIdDesc).slice(0, 3));
        setLatestPastas((Array.isArray(pa) ? pa : []).slice().sort(byIdDesc).slice(0, 3));
        setLatestDrinks((Array.isArray(dr) ? dr : []).slice().sort(byIdDesc).slice(0, 3));
      } catch (e) {
        console.error(e);
        setErr(e?.message || t("Failed to load"));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [language]);

  const closeQuickModal = () => {
    setQuickItem(null);
    setQuickError(null);
    setQuickPizza(null);
    setQuickPasta(null);
    setQuickVariantId(null);
    setQuickSauceId(null);
  };

  const openQuickModal = async (item) => {
    setQuickItem(item);
    setQuickError(null);
    setQuickPizza(null);
    setQuickPasta(null);
    setQuickVariantId(null);
    setQuickSauceId(null);

    if (isPizza(item)) {

      try {
        setQuickLoading(true);
        const p = await productApi.pizza(item.id, true, language);
        setQuickPizza(p);
        if (p?.variants?.length) setQuickVariantId(String(p.variants[0].id));
      } catch (e) {
        setQuickError(e?.data?.message || e?.message || t("Failed to load pizza details."));
      } finally {
        setQuickLoading(false);
      }
    } else if (isPasta(item)) {
      try {
        setQuickLoading(true);
        const p = await productApi.pasta(item.id, language);
        setQuickPasta(p);
        if (p?.sauces?.length) setQuickSauceId(String(p.sauces[0].id));
      } catch (e) {
        setQuickError(e?.data?.message || e?.message || t("Failed to load pasta details."));
      } finally {
        setQuickLoading(false);
      }
    }
  };

  const goDetails = (item) => {
    const path = isPizza(item) ? `/pizza/${item.id}` : isPasta(item) ? `/pasta/${item.id}` : `/drink/${item.id}`;
    navigate(path);
  };

  const onAddToCart = async (item, variant = null) => {
    try {
      setAdding(true);

      if (isPizza(item)) {
        let v = variant;

        if (!v) {
          const p = quickPizza?.id === item.id ? quickPizza : await productApi.pizza(item.id, true, language);
          v = Array.isArray(p?.variants) && p.variants.length ? p.variants[0] : null;
        }

        const variantId =
          v?.id ?? (quickVariantId ? Number(quickVariantId) : null);

        if (!variantId) throw new Error(t("Please select a pizza variant."));

        await cart.addPizza({
          productId: item.id,
          variantId,
          quantity: 1,
          removeIngredientIds: [],
          addIngredientIds: [],
          note: "",
        });
      } else if (isPasta(item)) {
        let s = variant;

        if (!s) {
          const p = quickPasta?.id === item.id ? quickPasta : await productApi.pasta(item.id, language);
          s = Array.isArray(p?.sauces) && p.sauces.length ? p.sauces[0] : null;
        }

        const pastaSauceId =
          s?.id ?? (quickSauceId ? Number(quickSauceId) : null);

        if (!pastaSauceId) throw new Error(t("Please select a pasta sauce."));

        await cart.addPasta({
          productId: item.id,
          pastaSauceId,
          quantity: 1,
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
      alert(e?.data?.message || e?.message || t("Failed to add to cart"));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="home">
      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">{t("Fresh • Fast • Hot")}</p>
          <h1>
            {t("Tasty Pizza in minutes")}
          </h1>
          <p className="sub">
            {t("Hand-tossed dough, premium ingredients, stone-baked perfection.")}{" "}
            {t("Order now and get your pizza in under 30 minutes.")}
          </p>
          <div className="cta-row">
            <Link to="/menu" className="btn primary">
              {t("Order now")}
            </Link>
            <a href="#why" className="btn ghost">
              {t("Learn more")}
            </a>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section id="why" className="why">
        <h2>
          {t("Why choose Tasty Pizza?")}
        </h2>
        <div className="why-grid">
          <article>
            <div className="ic">🔥</div>
            <h3>{t("Stone-baked")}</h3>
            <p>{t("That perfect crust — crisp outside, soft inside.")}</p>
          </article>
          <article>
            <div className="ic">🧀</div>
            <h3>{t("Real mozzarella")}</h3>
            <p>{t("Stretchy, fragrant, and full of flavor.")}</p>
          </article>
          <article>
            <div className="ic">⏱️</div>
            <h3>{t("Fast delivery")}</h3>
            <p>{t("Average delivery time under 30 minutes.")}</p>
          </article>
        </div>
      </section>

      {/* NEWEST PIZZAS */}
      <section className="section">
        <div className="container">
          <div className="section-heading-row">
            <h2 className="section-title">{t("NEWEST PIZZAS")}</h2>
            <Link to="/menu#pizzas" className="home-see-more-btn">
              {t("See all")} <span className="home-arr" aria-hidden="true">→</span>
            </Link>
          </div>

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
                        {t("from")} {money(p.basePrice ?? p.price)} EUR
                      </span>
                      {p.spicyLevel && (
                        <span className="badge">{t("Spicy level")}: {enumLabel(p.spicyLevel)}</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* NEWEST PASTAS */}
      <section className="section">
        <div className="container">
          <div className="section-heading-row">
            <h2 className="section-title">{t("NEWEST PASTAS")}</h2>
            <Link to="/menu#pastas" className="home-see-more-btn">
              {t("See all")} <span className="home-arr" aria-hidden="true">→</span>
            </Link>
          </div>

          {loading && (
            <div className="skeleton-grid">
              {Array.from({ length: 3 }).map((_, i) => (
                <div className="skeleton-card" key={i} />
              ))}
            </div>
          )}

          {!loading && !err && (
            <div className="grid">
              {latestPastas.map((p) => (
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
                      <span className="price">{money(p.basePrice ?? p.price)} EUR</span>
                      {p.spicyLevel && (
                        <span className="badge">{t("Spicy level")}: {enumLabel(p.spicyLevel)}</span>
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
          <div className="section-heading-row">
            <h2 className="section-title">{t("NEWEST DRINKS")}</h2>
            <Link to="/menu#drinks" className="home-see-more-btn">
              {t("See all")} <span className="home-arr" aria-hidden="true">→</span>
            </Link>
          </div>

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
                      <span className="price">{money(d.price ?? d.basePrice)} EUR</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="testimonials">
        <h2>{t("What our customers say")}</h2>
        <div className="quotes">
          <blockquote>
            “{t("Best crust in town!")}” <cite>— Mira</cite>
          </blockquote>
          <blockquote>
            “{t("Arrived in 22 minutes. Hot and juicy.")}” <cite>— Ivan</cite>
          </blockquote>
          <blockquote>
            “{t("My favorite Pepperoni. Perfect balance.")}” <cite>— George</cite>
          </blockquote>
        </div>
      </section>

      {quickItem && (
        <QuickModal
          item={quickItem}
          pizzaDetails={quickPizza}
          pastaDetails={quickPasta}
          selectedVariantId={quickVariantId}
          setSelectedVariantId={setQuickVariantId}
          selectedSauceId={quickSauceId}
          setSelectedSauceId={setQuickSauceId}
          onAdd={onAddToCart}
          onDetails={goDetails}
          onClose={closeQuickModal}
          loading={quickLoading}
          error={quickError}
          adding={adding}
          currency="EUR"
          fallbackSrc={FallbackImg}
        />
      )}
    </div>
  );
}
