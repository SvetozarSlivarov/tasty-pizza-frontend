import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../api/admin";
import { useLanguage } from "../../context/LanguageContext";
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

export default function Ingredients() {
  const { language, t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [show, setShow] = useState("all"); // active | all | deleted

  const [name, setName] = useState("");
  const [translations, setTranslations] = useState(emptyTranslations(["name"]));
  const [translating, setTranslating] = useState(false);
  const [typeId, setTypeId] = useState("");

  const [editingId, setEditingId] = useState(null);
  const isEditing = editingId != null;

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const [ingData, typeData] = await Promise.all([
        adminApi.listIngredientsWithType(show, language),
        adminApi.listIngredientTypes(language),
      ]);

      setRows(Array.isArray(ingData) ? ingData : []);
      setTypes(Array.isArray(typeData) ? typeData : []);
    } catch (e) {
      setError(e?.message || t("Failed to load ingredients"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, language]);

  const editingRow = useMemo(
    () => rows.find((r) => r.id === editingId) || null,
    [rows, editingId]
  );

  useEffect(() => {
    if (!editingRow) return;
    setName(editingRow.name ?? "");
    const tid = editingRow?.type?.id ?? editingRow?.typeId ?? "";
    setTypeId(tid ? String(tid) : "");

    (async () => {
      setError(null);
      try {
        const response = await adminApi.getTranslations("INGREDIENT", editingRow.id);
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
    setTypeId("");
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
        entityType: "INGREDIENT",
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
    const tid = Number(typeId);

    if (!n || !Number.isFinite(tid)) return;

    setBusy(true);
    setError(null);
    try {
      if (isEditing) {
        const updated = await adminApi.updateIngredient(editingId, {
          name: n,
          typeId: tid,
          translations: confirmedTranslations,
        });
        setRows((prev) =>
          prev.map((r) => (r.id === editingId ? (updated ?? r) : r))
        );
      } else {
        const created = await adminApi.createIngredient({ name: n, typeId: tid, translations: confirmedTranslations });
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

  const softDelete = async (id) => {
    if (!window.confirm(`${t("Delete ingredient")} #${id}?`)) return;

    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteIngredient(id);
      // ако сме на deleted view, reload; иначе махаме от list-а
      if (show === "deleted") await load();
      else setRows((prev) => prev.map((r) => (r.id === id ? { ...r, deleted: true } : r)));
      if (editingId === id) resetForm();
    } catch (e) {
      setError(e?.message || t("Delete failed"));
    } finally {
      setBusy(false);
    }
  };

  const restore = async (id) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.restoreIngredient(id);
      if (show === "deleted") {
        // на deleted view -> махаме го
        setRows((prev) => prev.filter((r) => r.id !== id));
      } else {
        await load();
      }
    } catch (e) {
      setError(e?.message || t("Restore failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>{t("Ingredients")}</h2>

        <div className={styles.headerRight}>
          <select
            className={styles.input}
            value={show}
            onChange={(e) => setShow(e.target.value)}
            disabled={busy}
          >
            <option value="active">{t("Active")}</option>
            <option value="all">{t("All")}</option>
            <option value="deleted">{t("Deleted")}</option>
          </select>

          <button className={styles.btn} disabled={busy} onClick={load}>
            {t("Reload")}
          </button>
        </div>
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

          <div className={styles.row}>
            <label className={styles.label}>{t("Type")}</label>
            <select
              className={styles.input}
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              disabled={busy}
            >
              <option value="">{t("Select type...")}</option>
              {types.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inlineFormActions}>
            <button
              className={styles.btnPrimary}
              disabled={busy || translating || !translations.en.name.trim() || !typeId}
            >
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
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>{t("Name")}</th>
              <th className={styles.th}>{t("Type")}</th>
              <th className={styles.th}>{t("Status")}</th>
              <th className={styles.th}>{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={styles.td}>{r.id}</td>
                <td className={styles.td}>{r.name}</td>
                <td className={styles.td}>{r?.type?.name ?? "-"}</td>
                <td className={styles.td}>
                  {r.deleted ? t("DELETED") : t("ACTIVE")}
                </td>
                <td className={styles.td}>
                  <button
                    className={styles.btn}
                    disabled={busy}
                    onClick={() => setEditingId(r.id)}
                  >
                    {t("Edit")}
                  </button>

                  {!r.deleted ? (
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      disabled={busy}
                      onClick={() => softDelete(r.id)}
                    >
                      {t("Delete")}
                    </button>
                  ) : (
                    <button
                      className={styles.btn}
                      disabled={busy}
                      onClick={() => restore(r.id)}
                    >
                      {t("Restore")}
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td className={styles.td} colSpan={5}>
                  {t("No items")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
