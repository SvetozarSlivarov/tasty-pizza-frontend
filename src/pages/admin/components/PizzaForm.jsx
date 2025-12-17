import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../../api/admin";
import { fileToBase64 } from "../../../utils/fileToBase64";
import styles from "./PizzaForm.module.css";

const SPICY_LEVELS = ["MILD", "MEDIUM", "HOT"];

const PIZZA_SIZES = ["SMALL", "MEDIUM", "LARGE"];
const DOUGH_TYPES = ["THIN", "CLASSIC", "WHOLEGRAIN"];

const DEFAULT_VARIANT = { size: "MEDIUM", dough: "CLASSIC", extraPrice: "0.00" };

export function normalizePizza(p) {
  const x = p || {};
  const variants = Array.isArray(x.variants) ? x.variants : [];

  return {
    name: x.name ?? "",
    description: x.description ?? "",
    basePrice: x.basePrice != null ? String(x.basePrice) : "",
    spicyLevel: x.spicyLevel ?? "MILD",
    variants: variants.length
      ? variants.map((v) => ({
          size: v.size ?? DEFAULT_VARIANT.size,
          dough: v.dough ?? DEFAULT_VARIANT.dough,
          extraPrice: v.extraPrice != null ? String(v.extraPrice) : "0.00",
        }))
      : [{ ...DEFAULT_VARIANT }],
  };
}

function moneyString(v) {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "") return "0.00";
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return "0.00";
  return n.toFixed(2);
}

function ensureAtLeastOneVariant(vs) {
  const arr = Array.isArray(vs) ? vs : [];
  return arr.length ? arr : [{ ...DEFAULT_VARIANT }];
}

export default function PizzaForm({
  mode = "create",
  pizzaId = null,
  initial = null,
  busy = false,
  onCancel,
  onSubmit,
}) {
  const init = useMemo(() => normalizePizza(initial), [initial]);

  const [values, setValues] = useState(init);
  const [imageFile, setImageFile] = useState(null);

  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [baseSel, setBaseSel] = useState(new Map());

  const [allowedSel, setAllowedSel] = useState(new Map());

  const [q, setQ] = useState("");

  const [loadErr, setLoadErr] = useState(null);
  const [submitErr, setSubmitErr] = useState(null);

  useEffect(() => {
    setValues(init);
    setImageFile(null);
    setSubmitErr(null);
  }, [init]);

  const filteredCatalog = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return catalog;

    return catalog.filter((ing) => {
      const name = String(ing.name || "").toLowerCase();
      const type = String(ing.typeName || "").toLowerCase();
      return name.includes(s) || type.includes(s);
    });
  }, [catalog, q]);

  useEffect(() => {
    (async () => {
      setLoadErr(null);
      setLoadingCatalog(true);
      try {
        const list = await adminApi.listIngredientsWithType("active");

        const active = Array.isArray(list)
          ? list.filter((x) => !x.deleted && !x.deletedAt)
          : [];

        const normalized = active.map((x) => ({
          ...x,
          typeId: x?.type?.id ?? null,
          typeName: x?.type?.name ?? "",
        }));

        setCatalog(normalized);

        if (mode === "edit" && pizzaId) {
          const base = await adminApi.getPizzaIngredients(pizzaId);
          const allowed = await adminApi.getPizzaAllowedIngredients(pizzaId);

          const bMap = new Map();
          (Array.isArray(base) ? base : []).forEach((it) => {
            bMap.set(it.ingredientId, { removable: Boolean(it.removable) });
          });
          setBaseSel(bMap);

          const aMap = new Map();
          (Array.isArray(allowed) ? allowed : []).forEach((it) => {
            aMap.set(it.ingredientId, { extraPrice: moneyString(it.extraPrice) });
          });
          setAllowedSel(aMap);
        } else {
          setBaseSel(new Map());
          setAllowedSel(new Map());
        }
      } catch (e) {
        setLoadErr(e?.message || "Failed to load ingredients");
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, [mode, pizzaId]);

  function setField(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function addVariant() {
    setValues((v) => ({
      ...v,
      variants: [...ensureAtLeastOneVariant(v.variants), { ...DEFAULT_VARIANT }],
    }));
  }

  function removeVariant(idx) {
    setValues((v) => {
      const cur = ensureAtLeastOneVariant(v.variants);
      const next = cur.filter((_, i) => i !== idx);
      return { ...v, variants: next.length ? next : [{ ...DEFAULT_VARIANT }] };
    });
  }

  function updateVariant(idx, patch) {
    setValues((v) => {
      const cur = ensureAtLeastOneVariant(v.variants);
      const next = cur.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      return { ...v, variants: next };
    });
  }

  function toggleBase(id) {
    setBaseSel((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, { removable: false });
      return next;
    });
  }

  function toggleRemovable(id) {
    setBaseSel((prev) => {
      const next = new Map(prev);
      const cur = next.get(id);
      if (!cur) return next;
      next.set(id, { ...cur, removable: !cur.removable });
      return next;
    });
  }

  function toggleAllowed(id) {
    setAllowedSel((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, { extraPrice: "0.00" });
      return next;
    });
  }

  function setAllowedPrice(id, price) {
    setAllowedSel((prev) => {
      const next = new Map(prev);
      const cur = next.get(id);
      if (!cur) return next;
      next.set(id, { ...cur, extraPrice: price });
      return next;
    });
  }

  function validate() {
    if (!values.name.trim()) return "Name is required";
    if (!values.basePrice.trim()) return "Base price is required";

    const n = Number(values.basePrice.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return "Base price must be a valid non-negative number";

    if (!values.spicyLevel) return "Spicy level is required";

    const variants = ensureAtLeastOneVariant(values.variants);
    for (const v of variants) {
      if (!v.size) return "Variant size is required";
      if (!v.dough) return "Variant dough is required";
      const ep = Number(String(v.extraPrice ?? "").replace(",", "."));
      if (!Number.isFinite(ep) || ep < 0) return "Variant extraPrice must be a valid non-negative number";
    }

    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitErr(null);

    const vErr = validate();
    if (vErr) {
      setSubmitErr(vErr);
      return;
    }

    const variants = ensureAtLeastOneVariant(values.variants).map((v) => ({
      size: v.size,
      dough: v.dough,
      extraPrice: moneyString(v.extraPrice),
    }));

    const ingredients = Array.from(baseSel.entries()).map(([ingredientId, v]) => ({
      ingredientId,
      removable: Boolean(v.removable),
    }));

    const allowedIngredients = Array.from(allowedSel.entries()).map(([ingredientId, v]) => ({
      ingredientId,
      extraPrice: moneyString(v.extraPrice),
    }));

    let req = {
      name: values.name.trim(),
      description: values.description?.trim() || "",
      basePrice: String(values.basePrice).trim().replace(",", "."),
      spicyLevel: values.spicyLevel || "MILD",

      variants,
      ingredients,
      allowedIngredients,
    };

    if (imageFile) {
      if (!/^image\//.test(imageFile.type)) {
        setSubmitErr("Only images are allowed");
        return;
      }
      if (imageFile.size > 5 * 1024 * 1024) {
        setSubmitErr("Max size is 5MB");
        return;
      }
      const { base64 } = await fileToBase64(imageFile);
      req = { ...req, imageBase64: base64 };
    }

    try {
      const res = await onSubmit(req);

      const id = (mode === "edit" ? pizzaId : res?.id) || null;
      if (id) {
        await adminApi.setPizzaIngredients(id, ingredients);
        await adminApi.setPizzaAllowedIngredients(id, allowedIngredients);
      }
    } catch (e2) {
      setSubmitErr(e2?.message || "Submit failed");
    }
  }

  const variantsNow = ensureAtLeastOneVariant(values.variants);
  const disableAll = busy || loadingCatalog;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {submitErr && <div className={styles.error}>{submitErr}</div>}
      {loadErr && <div className={styles.error}>{loadErr}</div>}

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            disabled={disableAll}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Spicy level</label>
          <select
            className={styles.input}
            value={values.spicyLevel || "MILD"}
            onChange={(e) => setField("spicyLevel", e.target.value)}
            disabled={disableAll}
          >
            {SPICY_LEVELS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Base price</label>
          <input
            className={styles.input}
            inputMode="decimal"
            value={values.basePrice}
            onChange={(e) => setField("basePrice", e.target.value)}
            disabled={disableAll}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Image (optional)</label>
          <input
            className={styles.inputFile}
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            disabled={disableAll}
          />
          {imageFile && <div className={styles.hint}>Selected: {imageFile.name}</div>}
        </div>

        <div className={styles.fieldFull}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            value={values.description}
            onChange={(e) => setField("description", e.target.value)}
            disabled={disableAll}
          />
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Variants</div>
          <button type="button" className={styles.btnSmall} onClick={addVariant} disabled={disableAll}>
            + Add variant
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Size</th>
                <th className={styles.th}>Dough</th>
                <th className={styles.thSmall}>Extra price</th>
                <th className={styles.thSmall}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {variantsNow.map((v, idx) => (
                <tr key={idx}>
                  <td className={styles.td}>
                    <select
                      className={styles.input}
                      value={v.size}
                      onChange={(e) => updateVariant(idx, { size: e.target.value })}
                      disabled={disableAll}
                    >
                      {PIZZA_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className={styles.td}>
                    <select
                      className={styles.input}
                      value={v.dough}
                      onChange={(e) => updateVariant(idx, { dough: e.target.value })}
                      disabled={disableAll}
                    >
                      {DOUGH_TYPES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className={styles.tdCenter}>
                    <input
                      className={styles.price}
                      value={String(v.extraPrice ?? "0.00")}
                      onChange={(e) => updateVariant(idx, { extraPrice: e.target.value })}
                      disabled={disableAll}
                      inputMode="decimal"
                    />
                  </td>

                  <td className={styles.tdCenter}>
                    <button
                      type="button"
                      className={styles.btnSmall}
                      onClick={() => removeVariant(idx)}
                      disabled={disableAll || variantsNow.length === 1}
                      title="At least one variant is required"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Ingredients</div>
          <input
            className={styles.search}
            placeholder="Search ingredients (name or type)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={disableAll}
          />
        </div>

        <div className={styles.subTitle}>Base ingredients</div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thSmall}>Use</th>
                <th className={styles.th}>Ingredient</th>
                <th className={styles.thSmall}>Removable</th>
              </tr>
            </thead>
            <tbody>
              {filteredCatalog.map((ing) => {
                const selected = baseSel.has(ing.id);
                const removable = selected ? Boolean(baseSel.get(ing.id)?.removable) : false;

                return (
                  <tr key={ing.id}>
                    <td className={styles.tdCenter}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleBase(ing.id)}
                        disabled={disableAll}
                      />
                    </td>

                    <td className={styles.td}>
                      <div>{ing.name}</div>
                      <div className={styles.typeHint}>{ing.typeName}</div>
                    </td>

                    <td className={styles.tdCenter}>
                      <input
                        type="checkbox"
                        checked={removable}
                        onChange={() => toggleRemovable(ing.id)}
                        disabled={disableAll || !selected}
                      />
                    </td>
                  </tr>
                );
              })}
              {!filteredCatalog.length && (
                <tr>
                  <td className={styles.td} colSpan={3}>
                    No matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.subTitle} style={{ marginTop: 12 }}>
          Allowed ingredients
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thSmall}>Allow</th>
                <th className={styles.th}>Ingredient</th>
                <th className={styles.thSmall}>Extra price</th>
              </tr>
            </thead>
            <tbody>
              {filteredCatalog.map((ing) => {
                const selected = allowedSel.has(ing.id);
                const extraPrice = selected ? String(allowedSel.get(ing.id)?.extraPrice ?? "0.00") : "0.00";

                return (
                  <tr key={ing.id}>
                    <td className={styles.tdCenter}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleAllowed(ing.id)}
                        disabled={disableAll}
                      />
                    </td>

                    <td className={styles.td}>
                      <div>{ing.name}</div>
                      <div className={styles.typeHint}>{ing.typeName}</div>
                    </td>

                    <td className={styles.tdCenter}>
                      <input
                        className={styles.price}
                        value={extraPrice}
                        onChange={(e) => setAllowedPrice(ing.id, e.target.value)}
                        disabled={disableAll || !selected}
                        inputMode="decimal"
                      />
                    </td>
                  </tr>
                );
              })}
              {!filteredCatalog.length && (
                <tr>
                  <td className={styles.td} colSpan={3}>
                    No matches.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className={styles.btnPrimary} disabled={busy}>
          {mode === "edit" ? "Save" : "Create"}
        </button>
      </div>
    </form>
  );
}
