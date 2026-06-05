import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin";
import { useLanguage } from "../../context/LanguageContext";
import TypeTable from "./components/TypeTable";
import styles from "../../styles/admin.module.css";
import TranslationFields, {
  SUPPORTED_LANGUAGES,
  emptyTranslations,
  firstLanguageWithContent,
  hasAnyTranslatedValue,
  mergePreviewTranslations,
  translationsFromResponse,
  translationsToRequest,
} from "./components/TranslationFields";

export default function IngredientTypes() {
  const { language, t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [translations, setTranslations] = useState(emptyTranslations(["name"]));
  const [translating, setTranslating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const isEditing = editingId != null;

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const data = await adminApi.listIngredientTypes(language);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || t("Failed to load ingredient types"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, [language]);

  const editingRow = useMemo(
    () => rows.find((r) => r.id === editingId) || null,
    [rows, editingId]
  );

  useEffect(() => {
    if (!editingRow) return;
    setName(editingRow.name ?? "");

    (async () => {
      setError(null);
      try {
        const response = await adminApi.getTranslations("INGREDIENT_TYPE", editingRow.id);
        const next = translationsFromResponse(response, ["name"]);
        if (!next.en.name) next.en.name = editingRow.name ?? "";
        setTranslations(next);
      } catch (e) {
        const fallback = emptyTranslations(["name"]);
        fallback.en.name = editingRow.name ?? "";
        setTranslations(fallback);
      }
    })();
  }, [editingRow, t]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setTranslations(emptyTranslations(["name"]));
  };

  function setTranslationField(lang, fieldName, value) {
    setTranslations((current) => ({
      ...current,
      [lang]: { ...current[lang], [fieldName]: value },
    }));
  }

  async function generateTranslations() {
    setError(null);
    if (!hasAnyTranslatedValue(translations, "name")) {
      setError(t("Fill at least one language before generating translations"));
      return;
    }

    setTranslating(true);
    try {
      const response = await adminApi.previewTranslations({
        entityType: "INGREDIENT_TYPE",
        sourceLanguage: firstLanguageWithContent(translations, ["name"]),
        targetLanguages: SUPPORTED_LANGUAGES,
        fields: translationsToRequest(translations, ["name"]),
      });
      setTranslations((current) => mergePreviewTranslations(current, response, ["name"]));
    } catch (e) {
      setError(e?.message || t("Translation generation failed"));
    } finally {
      setTranslating(false);
    }
  }

  const submit = async (e) => {
    e.preventDefault();
    const confirmedTranslations = translationsToRequest(translations, ["name"]);
    const n = isEditing ? confirmedTranslations.name.en || name.trim() : confirmedTranslations.name.en;
    if (!n) return;

    setBusy(true);
    setError(null);
    try {
      if (isEditing) {
        const updated = await adminApi.updateIngredientType(editingId, { name: n, translations: confirmedTranslations });
        setRows((prev) =>
          prev.map((r) => (r.id === editingId ? (updated ?? { ...r, name: n }) : r))
        );
      } else {
        const created = await adminApi.createIngredientType({ name: n, translations: confirmedTranslations });
        // ако backend връща новия обект
        if (created?.id != null) setRows((prev) => [created, ...prev]);
        else await load();
      }
      resetForm();
    } catch (e2) {
      setError(e2?.message || t("Save failed"));
    } finally {
      setBusy(false);
    }
  };

  const deleteType = async (id) => {
    const row = rows.find((r) => r.id === id);
    const label = row?.name ? `"${row.name}"` : `#${id}`;

    if (!window.confirm(`Delete ingredient type ${label}?`)) return;

    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteIngredientType(id);
      setRows((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) resetForm();
    } catch (e) {
      // вероятно type е in-use
      setError(e?.message || t("Delete failed (type may be in use)"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>{t("Ingredient Types")}</h2>
        <button className={styles.btn} disabled={busy} onClick={load}>
          {t("Reload")}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.card} onSubmit={submit}>
        <div className={styles.inlineFormRow}>
          <TranslationFields
            styles={styles}
            fields={["name"]}
            translations={translations}
            disabled={busy || translating}
            translating={translating}
            onChange={setTranslationField}
            onGenerate={generateTranslations}
          />

          <div className={styles.inlineFormActions}>
            <button className={styles.btnPrimary} disabled={busy || translating || !translations.en.name.trim()}>
              {isEditing ? t("Update") : t("Confirm and create")}
            </button>

            {isEditing && (
              <button
                type="button"
                className={styles.btn}
                disabled={busy}
                onClick={resetForm}
              >
                {t("Cancel")}
              </button>
            )}
          </div>
        </div>
      </form>

      <div className={styles.card}>
        <TypeTable
          rows={rows}
          busy={busy}
          onEdit={(id) => setEditingId(id)}
          onDelete={deleteType}
        />
      </div>
    </div>
  );
}
