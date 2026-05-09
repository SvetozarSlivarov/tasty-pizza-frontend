import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../../api/admin";
import { fileToBase64 } from "../../../utils/fileToBase64";
import styles from "./PizzaForm.module.css";

const SPICY_LEVELS = ["MILD", "MEDIUM", "HOT"];

export function normalizePasta(p) {
  const x = p || {};
  return {
    name: x.name ?? "",
    description: x.description ?? "",
    basePrice: x.basePrice != null ? String(x.basePrice) : "",
    sauces: Array.isArray(x.sauces) ? x.sauces : [],
    allowedIngredients: Array.isArray(x.allowedIngredients) ? x.allowedIngredients : [],
  };
}

function moneyString(v) {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "") return "0.00";
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return "0.00";
  return n.toFixed(2);
}

export default function PastaForm({ mode = "create", initial = null, busy = false, onCancel, onSubmit }) {
  const init = useMemo(() => normalizePasta(initial), [initial]);
  const [values, setValues] = useState(init);
  const [imageFile, setImageFile] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [sauceSel, setSauceSel] = useState(new Map());
  const [allowedSel, setAllowedSel] = useState(new Map());
  const [q, setQ] = useState("");
  const [loadErr, setLoadErr] = useState(null);
  const [submitErr, setSubmitErr] = useState(null);

  useEffect(() => {
    setValues(init);
    setImageFile(null);
    setSubmitErr(null);

    const sMap = new Map();
    (init.sauces || []).forEach((it) => {
      const ingredientId = it.ingredientId;
      if (ingredientId != null) sMap.set(ingredientId, { extraPrice: moneyString(it.extraPrice), spicyLevel: it.spicyLevel || "MILD" });
    });
    setSauceSel(sMap);

    const aMap = new Map();
    (init.allowedIngredients || []).forEach((it) => {
      const ingredientId = it.ingredientId;
      if (ingredientId != null) aMap.set(ingredientId, { extraPrice: moneyString(it.extraPrice) });
    });
    setAllowedSel(aMap);
  }, [init]);

  useEffect(() => {
    (async () => {
      setLoadErr(null);
      setLoadingCatalog(true);
      try {
        const list = await adminApi.listIngredientsWithType("active");
        const active = Array.isArray(list) ? list.filter((x) => !x.deleted && !x.deletedAt) : [];
        setCatalog(active.map((x) => ({ ...x, typeId: x?.type?.id ?? null, typeName: x?.type?.name ?? "" })));
      } catch (e) {
        setLoadErr(e?.message || "Failed to load ingredients");
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, []);

  const filteredCatalog = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return catalog;
    return catalog.filter((ing) => String(ing.name || "").toLowerCase().includes(s) || String(ing.typeName || "").toLowerCase().includes(s));
  }, [catalog, q]);

  const sauceCatalog = useMemo(() => filteredCatalog.filter((ing) => String(ing.typeName || "").toLowerCase().includes("sauce")), [filteredCatalog]);
  const addonCatalog = useMemo(() => filteredCatalog.filter((ing) => !sauceSel.has(ing.id)), [filteredCatalog, sauceSel]);

  function setField(name, value) { setValues((v) => ({ ...v, [name]: value })); }
  function toggleSauce(id) { setSauceSel((prev) => { const next = new Map(prev); next.has(id) ? next.delete(id) : next.set(id, { extraPrice: "0.00", spicyLevel: "MILD" }); return next; }); }
  function setSaucePatch(id, patch) { setSauceSel((prev) => { const next = new Map(prev); const cur = next.get(id); if (!cur) return next; next.set(id, { ...cur, ...patch }); return next; }); }
  function toggleAllowed(id) { setAllowedSel((prev) => { const next = new Map(prev); next.has(id) ? next.delete(id) : next.set(id, { extraPrice: "0.00" }); return next; }); }
  function setAllowedPrice(id, price) { setAllowedSel((prev) => { const next = new Map(prev); const cur = next.get(id); if (!cur) return next; next.set(id, { ...cur, extraPrice: price }); return next; }); }

  function validate() {
    if (!values.name.trim()) return "Name is required";
    if (!values.basePrice.trim()) return "Base price is required";
    const n = Number(values.basePrice.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return "Base price must be a valid non-negative number";
    if (sauceSel.size === 0) return "At least one pasta sauce is required";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitErr(null);
    const vErr = validate();
    if (vErr) { setSubmitErr(vErr); return; }

    const sauces = Array.from(sauceSel.entries()).map(([ingredientId, v]) => ({ ingredientId, extraPrice: moneyString(v.extraPrice), spicyLevel: v.spicyLevel || "MILD" }));
    const allowedIngredients = Array.from(allowedSel.entries()).filter(([ingredientId]) => !sauceSel.has(ingredientId)).map(([ingredientId, v]) => ({ ingredientId, extraPrice: moneyString(v.extraPrice) }));

    let req = {
      name: values.name.trim(),
      description: values.description?.trim() || "",
      basePrice: String(values.basePrice).trim().replace(",", "."),
      sauces,
      allowedIngredients,
    };

    if (imageFile) {
      if (!/^image\//.test(imageFile.type)) { setSubmitErr("Only images are allowed"); return; }
      if (imageFile.size > 5 * 1024 * 1024) { setSubmitErr("Max size is 5MB"); return; }
      const { base64 } = await fileToBase64(imageFile);
      req = { ...req, imageBase64: base64 };
    }

    try { await onSubmit(req); }
    catch (e2) { setSubmitErr(e2?.message || "Submit failed"); }
  }

  const disableAll = busy || loadingCatalog;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {submitErr && <div className={styles.error}>{submitErr}</div>}
      {loadErr && <div className={styles.error}>{loadErr}</div>}

      <div className={styles.grid2}>
        <div className={styles.field}><label className={styles.label}>Name</label><input className={styles.input} value={values.name} onChange={(e) => setField("name", e.target.value)} disabled={disableAll} /></div>
        <div className={styles.field}><label className={styles.label}>Base price</label><input className={styles.input} inputMode="decimal" value={values.basePrice} onChange={(e) => setField("basePrice", e.target.value)} disabled={disableAll} /></div>
        <div className={styles.field}><label className={styles.label}>Image (optional)</label><input className={styles.inputFile} type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} disabled={disableAll} />{imageFile && <div className={styles.hint}>Selected: {imageFile.name}</div>}</div>
        <div className={styles.fieldFull}><label className={styles.label}>Description</label><textarea className={styles.textarea} value={values.description} onChange={(e) => setField("description", e.target.value)} disabled={disableAll} /></div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}><div className={styles.sectionTitle}>Sauces and add-ons</div><input className={styles.search} placeholder="Search ingredients..." value={q} onChange={(e) => setQ(e.target.value)} disabled={disableAll} /></div>
        <div className={styles.subTitle}>Sauces</div>
        <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th className={styles.thSmall}>Use</th><th className={styles.th}>Sauce</th><th className={styles.thSmall}>Spice</th><th className={styles.thSmall}>Extra price</th></tr></thead><tbody>
          {sauceCatalog.map((ing) => { const selected = sauceSel.has(ing.id); const cur = sauceSel.get(ing.id) || {}; return <tr key={ing.id}><td className={styles.tdCenter}><input type="checkbox" checked={selected} onChange={() => toggleSauce(ing.id)} disabled={disableAll} /></td><td className={styles.td}><div>{ing.name}</div><div className={styles.typeHint}>{ing.typeName}</div></td><td className={styles.tdCenter}><select className={styles.input} value={cur.spicyLevel || "MILD"} onChange={(e) => setSaucePatch(ing.id, { spicyLevel: e.target.value })} disabled={disableAll || !selected}>{SPICY_LEVELS.map((x) => <option key={x} value={x}>{x}</option>)}</select></td><td className={styles.tdCenter}><input className={styles.price} value={cur.extraPrice ?? "0.00"} onChange={(e) => setSaucePatch(ing.id, { extraPrice: e.target.value })} disabled={disableAll || !selected} inputMode="decimal" /></td></tr>; })}
          {!sauceCatalog.length && <tr><td className={styles.td} colSpan={4}>No sauce ingredients found.</td></tr>}
        </tbody></table></div>

        <div className={styles.subTitle} style={{ marginTop: 12 }}>Allowed add-ons</div>
        <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th className={styles.thSmall}>Allow</th><th className={styles.th}>Ingredient</th><th className={styles.thSmall}>Extra price</th></tr></thead><tbody>
          {addonCatalog.map((ing) => { const selected = allowedSel.has(ing.id); const extraPrice = selected ? String(allowedSel.get(ing.id)?.extraPrice ?? "0.00") : "0.00"; return <tr key={ing.id}><td className={styles.tdCenter}><input type="checkbox" checked={selected} onChange={() => toggleAllowed(ing.id)} disabled={disableAll} /></td><td className={styles.td}><div>{ing.name}</div><div className={styles.typeHint}>{ing.typeName}</div></td><td className={styles.tdCenter}><input className={styles.price} value={extraPrice} onChange={(e) => setAllowedPrice(ing.id, e.target.value)} disabled={disableAll || !selected} inputMode="decimal" /></td></tr>; })}
          {!addonCatalog.length && <tr><td className={styles.td} colSpan={3}>No matches.</td></tr>}
        </tbody></table></div>
      </section>

      <div className={styles.actions}><button type="button" className={styles.btn} onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className={styles.btnPrimary} disabled={busy}>{mode === "edit" ? "Save" : "Create"}</button></div>
    </form>
  );
}
