import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../../api/admin";
import { fileToBase64 } from "../../../utils/fileToBase64";
import { useLanguage } from "../../../context/LanguageContext";
import styles from "./PizzaForm.module.css";
import TranslationFields, {
  SUPPORTED_LANGUAGES,
  emptyTranslations,
  firstLanguageWithContent,
  hasAnyTranslatedValue,
  mergePreviewTranslations,
  translationsFromResponse,
  translationsToRequest,
} from "./TranslationFields";

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
  language = "en",
  busy = false,
  onCancel,
  onSubmit,
}) {
  const { t, enumLabel } = useLanguage();
  const init = useMemo(() => normalizePizza(initial), [initial]);

  const [values, setValues] = useState(init);
  const [translations, setTranslations] = useState(emptyTranslations);
  const [imageFile, setImageFile] = useState(null);

  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [baseSel, setBaseSel] = useState(new Map());

  const [allowedSel, setAllowedSel] = useState(new Map());

  const [q, setQ] = useState("");

  const [loadErr, setLoadErr] = useState(null);
  const [submitErr, setSubmitErr] = useState(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    setValues(init);
    const fallback = emptyTranslations();
    fallback.en.name = init.name || "";
    fallback.en.description = init.description || "";
    setTranslations(fallback);
    setImageFile(null);
    setSubmitErr(null);
  }, [init]);

  useEffect(() => {
    if (mode !== "edit" || !initial?.id) return;

    (async () => {
      try {
        const response = await adminApi.getTranslations("PRODUCT", initial.id);
        const next = translationsFromResponse(response);
        if (!next.en.name) next.en.name = init.name || "";
        if (!next.en.description) next.en.description = init.description || "";
        setTranslations(next);
      } catch {
        const fallback = emptyTranslations();
        fallback.en.name = init.name || "";
        fallback.en.description = init.description || "";
        setTranslations(fallback);
      }
    })();
  }, [mode, initial?.id, init]);

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
        const list = await adminApi.listIngredientsWithType("active", language);

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
          const base = await adminApi.getPizzaIngredients(pizzaId, language);
          const allowed = await adminApi.getPizzaAllowedIngredients(pizzaId, language);

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
  }, [mode, pizzaId, language]);

  function setField(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  function setTranslationField(lang, fieldName, value) {
    setTranslations((current) => ({
      ...current,
      [lang]: {
        ...current[lang],
        [fieldName]: value,
      },
    }));
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
    if (!hasAnyTranslatedValue(translations, "name")) return t("Name is required");
    if (!String(translations.en.name || "").trim()) return t("English name is required before saving. Generate translations or fill English.");

    if (!values.basePrice.trim()) return t("Base price is required");

    const n = Number(values.basePrice.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return t("Base price must be a valid non-negative number");

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

  async function generateTranslations() {
    setSubmitErr(null);

    if (!hasAnyTranslatedValue(translations, "name") && !hasAnyTranslatedValue(translations, "description")) {
      setSubmitErr("Fill at least one language before generating translations");
      return;
    }

    setTranslating(true);
    try {
      const response = await adminApi.previewTranslations({
        entityType: "PRODUCT",
        sourceLanguage: firstLanguageWithContent(translations),
        targetLanguages: SUPPORTED_LANGUAGES,
        fields: translationsToRequest(translations),
      });

      setTranslations((current) => mergePreviewTranslations(current, response));
    } catch (e) {
      setSubmitErr(e?.message || "Translation generation failed");
    } finally {
      setTranslating(false);
    }
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

    const confirmedTranslations = translationsToRequest(translations);

    let req = {
      name: confirmedTranslations.name.en,
      description: confirmedTranslations.description.en,
      basePrice: String(values.basePrice).trim().replace(",", "."),
      spicyLevel: values.spicyLevel || "MILD",
      translations: confirmedTranslations,

      variants,
      ingredients,
      allowedIngredients,
    };

    if (imageFile) {
      if (!/^image\//.test(imageFile.type)) {
        setSubmitErr(t("Only images are allowed"));
        return;
      }
      if (imageFile.size > 5 * 1024 * 1024) {
        setSubmitErr(t("Max size is 5MB"));
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
      setSubmitErr(e2?.message || t("Submit failed"));
    }
  }

  const variantsNow = ensureAtLeastOneVariant(values.variants);
  const disableAll = busy || loadingCatalog || translating;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {submitErr && <div className={styles.error}>{submitErr}</div>}
      {loadErr && <div className={styles.error}>{loadErr}</div>}

      <div className={styles.grid2}>
        <TranslationFields
          styles={styles}
          translations={translations}
          disabled={disableAll}
          translating={translating}
          onChange={setTranslationField}
          onGenerate={generateTranslations}
        />

        <div className={styles.field}>
          <label className={styles.label}>{t("Spicy level")}</label>
          <select
            className={styles.input}
            value={values.spicyLevel || "MILD"}
            onChange={(e) => setField("spicyLevel", e.target.value)}
            disabled={disableAll}
          >
            {SPICY_LEVELS.map((x) => (
              <option key={x} value={x}>
                {enumLabel(x)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("Base price")}</label>
          <input
            className={styles.input}
            inputMode="decimal"
            value={values.basePrice}
            onChange={(e) => setField("basePrice", e.target.value)}
            disabled={disableAll}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("Image (optional)")}</label>
          <input
            className={styles.inputFile}
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            disabled={disableAll}
          />
          {imageFile && <div className={styles.hint}>{t("Selected")}: {imageFile.name}</div>}
        </div>

      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>{t("Variants")}</div>
          <button type="button" className={styles.btnSmall} onClick={addVariant} disabled={disableAll}>
            + {t("Add variant")}
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>{t("Size")}</th>
                <th className={styles.th}>{t("Dough")}</th>
                <th className={styles.thSmall}>{t("Extra price")}</th>
                <th className={styles.thSmall}>{t("Actions")}</th>
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
                          {enumLabel(s)}
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
                          {enumLabel(d)}
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
                      title={t("At least one variant is required")}
                    >
                      {t("Remove")}
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
          <div className={styles.sectionTitle}>{t("Ingredients")}</div>
          <input
            className={styles.search}
            placeholder={t("Search ingredients (name or type)...")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={disableAll}
          />
        </div>

        <div className={styles.subTitle}>{t("Base ingredients")}</div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thSmall}>{t("Use")}</th>
                <th className={styles.th}>{t("Ingredient")}</th>
                <th className={styles.thSmall}>{t("Removable")}</th>
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
                    {t("No matches.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.subTitle} style={{ marginTop: 12 }}>
          {t("Allowed ingredients")}
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thSmall}>{t("Allow")}</th>
                <th className={styles.th}>{t("Ingredient")}</th>
                <th className={styles.thSmall}>{t("Extra price")}</th>
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
                    {t("No matches.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={onCancel} disabled={busy}>
          {t("Cancel")}
        </button>
        <button type="submit" className={styles.btnPrimary} disabled={disableAll}>
          {mode === "edit" ? t("Save") : t("Confirm and create")}
        </button>
      </div>
    </form>
  );
}
