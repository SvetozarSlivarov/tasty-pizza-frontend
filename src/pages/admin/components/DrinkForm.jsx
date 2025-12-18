import { useMemo, useState } from "react";
import styles from "../../../styles/Drinks.module.css";

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
    };
}

const PRICE_MIN = 0.01;
const PRICE_MAX = 1000;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB

export default function DrinkForm({ initial, onSubmit, onCancel }) {
    const [model, setModel] = useState(normalizeDrink(initial));
    const [imageFile, setImageFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [errors, setErrors] = useState({});

    function update(k, v) {
        setModel((m) => ({ ...m, [k]: v }));
    }

    function validate(next = model) {
        const e = {};
        const name = String(next.name || "").trim();
        if (name.length < 2) e.name = "Name must be at least 2 characters.";
        if (name.length > 100) e.name = "Name cannot exceed 100 characters.";

        const priceNum = Number(String(next.basePrice).replace(",", "."));
        if (!Number.isFinite(priceNum)) e.basePrice = "Price must be a number.";
        else if (priceNum < PRICE_MIN) e.basePrice = `Price cannot be negative or zero.`;
        else if (priceNum > PRICE_MAX) e.basePrice = `Price cannot exceed ${PRICE_MAX.toFixed(2)}.`;

        if (next.description && String(next.description).length > 1000) {
            e.description = "Description is too long (max 1000 characters).";
        }

        if (imageFile) {
            if (!/^image\//.test(imageFile.type)) e.image = "Only image files are allowed.";
            if (imageFile.size > IMAGE_MAX_BYTES) e.image = "Image must be ≤ 5MB.";
        }
        setErrors(e);
        return e;
    }

    const canSave = useMemo(() => {
        const e = validate(model);
        return Object.keys(e).length === 0;
    }, [model, imageFile]);

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

    async function handleSubmit(e) {
        e.preventDefault();
        const eMap = validate(model);
        if (Object.keys(eMap).length > 0) return;
        try {
            setBusy(true);
            await onSubmit?.(normalizeDrink({
                ...model,
                basePrice: String(model.basePrice).replace(",", "."),
            }), imageFile);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            {/* Name */}
            <div>
                <label className={styles.label}>Name</label>
                <input
                    className={styles.input}
                    value={model.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Mango Basil Cooler"
                />
                {errors.name && (
                    <div className={styles.note} style={{ color: "#ff8aa6" }}>{errors.name}</div>
                )}
            </div>

            {/* Description */}
            <div>
                <label className={styles.label}>Description</label>
                <textarea
                    className={styles.input}
                    rows={3}
                    value={model.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Refreshing sparkling drink with mango, basil and lime."
                />
                {errors.description && (
                    <div className={styles.note} style={{ color: "#ff8aa6" }}>{errors.description}</div>
                )}
            </div>

            {/* Price */}
            <div>
                <label className={styles.label}>Price (BGN)</label>
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
                    Allowed range: {PRICE_MIN.toFixed(2)} – {PRICE_MAX.toFixed(2)} BGN
                </div>
            </div>

            {/* Image (optional) */}
            <div>
                <label className={styles.label}>Image (optional)</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onImagePick(e.target.files?.[0] || null)}
                />
                {errors.image && (
                    <div className={styles.note} style={{ color: "#ff8aa6" }}>{errors.image}</div>
                )}
                <div className={styles.note}>If provided, it will be uploaded together with the drink (max 5MB).</div>
            </div>

            {/* Actions */}
            <div className={styles.row}>
                <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    type="submit"
                    disabled={busy || !canSave}
                >
                    {busy ? "Saving..." : "Save"}
                </button>
                <button
                    className={styles.btn}
                    type="button"
                    onClick={onCancel}
                    disabled={busy}
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
