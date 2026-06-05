import { useEffect, useMemo, useState } from "react";
import styles from "../../../styles/Drinks.module.css";
import { useLanguage } from "../../../context/LanguageContext";
import { adminApi } from "../../../api/admin";
import TranslationFields, {
    SUPPORTED_LANGUAGES,
    emptyTranslations,
    firstLanguageWithContent,
    hasAnyTranslatedValue,
    mergePreviewTranslations,
    translationsFromResponse,
    translationsToRequest,
} from "./TranslationFields";

export function normalizeDrink(d) {
    return {
        name: d?.name ?? "",
        description: d?.description ?? "",
        // Server expects basePrice as a string (e.g. "4.90")
        basePrice:
            d?.basePrice != null
                ? String(d.basePrice)
                : d?.price != null
                    ? String(d.price)
                    : "",
        translations: d?.translations,
    };
}

const PRICE_MIN = 0.01;
const PRICE_MAX = 1000;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB

export default function DrinkForm({ initial, onSubmit, onCancel }) {
    const { t } = useLanguage();
    const isCreate = !initial?.id;
    const [model, setModel] = useState(normalizeDrink(initial));
    const [translations, setTranslations] = useState(emptyTranslations);
    const [imageFile, setImageFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fallback = emptyTranslations();
        fallback.en.name = model.name || "";
        fallback.en.description = model.description || "";

        if (isCreate || !initial?.id) {
            setTranslations(fallback);
            return;
        }

        (async () => {
            try {
                const response = await adminApi.getTranslations("PRODUCT", initial.id);
                const next = translationsFromResponse(response);
                if (!next.en.name) next.en.name = model.name || "";
                if (!next.en.description) next.en.description = model.description || "";
                setTranslations(next);
            } catch {
                setTranslations(fallback);
            }
        })();
    }, [isCreate, initial?.id, model.name, model.description]);

    function update(k, v) {
        setModel((m) => ({ ...m, [k]: v }));
    }

    function validate(next = model) {
        const e = {};
        const name = String(translations.en.name || "").trim();
        if (!hasAnyTranslatedValue(translations, "name")) e.name = t("Name is required.");
        else if (name.length < 2) e.name = t("Name must be at least 2 characters.");
        if (name.length > 100) e.name = t("Name cannot exceed 100 characters.");

        const priceNum = Number(String(next.basePrice).replace(",", "."));
        if (!Number.isFinite(priceNum)) e.basePrice = "Price must be a number.";
        else if (priceNum < PRICE_MIN) e.basePrice = `Price cannot be negative or zero.`;
        else if (priceNum > PRICE_MAX) e.basePrice = `Price cannot exceed ${PRICE_MAX.toFixed(2)}.`;

        if (next.description && String(next.description).length > 1000) {
            e.description = t("Description is too long (max 1000 characters).");
        }

        if (imageFile) {
            if (!/^image\//.test(imageFile.type)) e.image = t("Only image files are allowed.");
            if (imageFile.size > IMAGE_MAX_BYTES) e.image = t("Image must be ≤ 5MB.");
        }
        setErrors(e);
        return e;
    }

    const canSave = useMemo(() => {
        const e = validate(model);
        return Object.keys(e).length === 0;
    }, [model, imageFile, translations, isCreate]);

    function onPriceChange(raw) {
        const val = raw.replace(",", ".");
        const num = Number(val);
        update("basePrice", Number.isFinite(num) ? val : "");
    }

    function onPriceBlur() {
        const n = Number(String(model.basePrice).replace(",", "."));
        if (!Number.isFinite(n)) return;
        const bounded = Math.min(Math.max(n, PRICE_MIN), PRICE_MAX);
        update("basePrice", bounded.toFixed(2));
    }

    function onImagePick(file) {
        setImageFile(file || null);
        setTimeout(() => validate(model), 0);
    }

    function setTranslationField(lang, fieldName, value) {
        setTranslations((current) => ({
            ...current,
            [lang]: { ...current[lang], [fieldName]: value },
        }));
    }

    async function generateTranslations() {
        setErrors({});
        if (!hasAnyTranslatedValue(translations, "name") && !hasAnyTranslatedValue(translations, "description")) {
            setErrors({ name: t("Fill at least one language before generating translations.") });
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
            setErrors({ name: e?.message || t("Translation generation failed") });
        } finally {
            setTranslating(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const eMap = validate(model);
        if (Object.keys(eMap).length > 0) return;
        try {
            setBusy(true);
            const confirmedTranslations = translationsToRequest(translations);
            await onSubmit?.(normalizeDrink({
                ...model,
                name: confirmedTranslations.name.en,
                description: confirmedTranslations.description.en,
                basePrice: String(model.basePrice).replace(",", "."),
                translations: confirmedTranslations,
            }), imageFile);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <TranslationFields
                styles={styles}
                translations={translations}
                disabled={busy || translating}
                translating={translating}
                onChange={setTranslationField}
                onGenerate={generateTranslations}
            />
            {errors.name && <div className={styles.note} style={{ color: "#ff8aa6" }}>{errors.name}</div>}
            {errors.description && <div className={styles.note} style={{ color: "#ff8aa6" }}>{errors.description}</div>}

            {/* Price */}
            <div>
                <label className={styles.label}>{t("Price")} (EUR)</label>
                <input
                    className={styles.input}
                    type="text"
                    inputMode="decimal"
                    value={String(model.basePrice)}
                    onChange={(e) => onPriceChange(e.target.value)}
                    onBlur={onPriceBlur}
                    placeholder="4.90"
                />
                {errors.basePrice && (
                    <div className={styles.note} style={{ color: "#ff8aa6" }}>{errors.basePrice}</div>
                )}
                <div className={styles.note}>
                    Allowed range: {PRICE_MIN.toFixed(2)} – {PRICE_MAX.toFixed(2)} EUR
                </div>
            </div>

            {/* Image (optional) */}
            <div>
                <label className={styles.label}>{t("Image (optional)")}</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onImagePick(e.target.files?.[0] || null)}
                />
                {errors.image && (
                    <div className={styles.note} style={{ color: "#ff8aa6" }}>{errors.image}</div>
                )}
                <div className={styles.note}>{t("If provided, it will be uploaded together with the drink (max 5MB).")}</div>
            </div>

            {/* Actions */}
            <div className={styles.row}>
                <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    type="submit"
                    disabled={busy || translating || !canSave}
                >
                    {busy ? t("Saving...") : isCreate ? t("Confirm and create") : t("Save")}
                </button>
                <button
                    className={styles.btn}
                    type="button"
                    onClick={onCancel}
                    disabled={busy}
                >
                    {t("Cancel")}
                </button>
            </div>
        </form>
    );
}
