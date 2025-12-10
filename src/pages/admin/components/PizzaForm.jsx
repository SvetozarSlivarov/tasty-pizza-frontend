import { useMemo, useState } from "react";
import styles from "../../../styles/Pizzas.module.css";

export const DEFAULT_VARIANT = { size: "medium", dough: "classic", extraPrice: 0 };

export function hasValidVariants(variants) {
    const arr = Array.isArray(variants) ? variants : [];
    if (arr.length < 1) return false;
    return arr.every((v) => v?.size && v?.dough && Number.isFinite(v?.extraPrice ?? 0));
}

export function normalizePizza(p) {
    const variants = Array.isArray(p?.variants) ? p.variants : [];
    return {
        name: p?.name ?? "",
        basePrice: typeof p?.basePrice === "number" ? p.basePrice : 0,
        isAvailable: p?.isAvailable ?? true,
        description: p?.description ?? "",
        spicyLevel: p?.spicyLevel ?? "mild",
        imageUrl: p?.imageUrl ?? null,
        variants: variants.map((v) => ({
            size: v?.size ?? "",
            dough: v?.dough ?? "",
            extraPrice: typeof v?.extraPrice === "number" ? v.extraPrice : 0,
        })),
    };
}

const PRICE_MIN = 0.01;
const PRICE_MAX = 1000;
const EXTRA_MIN = 0;
const EXTRA_MAX = 100;
const DESC_MAX = 400;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const SPICY_VALUES = new Set(["mild", "medium", "hot"]);

export default function PizzaForm({
                                      initial,
                                      onSubmit,
                                      onCancel,
                                      busy,
                                      showImagePicker = false,
                                  }) {
    const [form, setForm] = useState(() => {
        const base = normalizePizza(initial ?? {});
        const has = Array.isArray(base.variants) && base.variants.length > 0;
        return { ...base, variants: has ? base.variants : [DEFAULT_VARIANT] };
    });

    const [imageFile, setImageFile] = useState(null);
    const [errors, setErrors] = useState({});

    function setField(k, v) {
        setForm((m) => ({ ...m, [k]: v }));
    }

    function validate(next = form) {
        const e = {};


        const name = String(next.name || "").trim();
        if (name.length < 2) e.name = "Name must be at least 2 characters.";
        else if (name.length > 60) e.name = "Name cannot exceed 60 characters.";

        const bp = Number(next.basePrice);
        if (!Number.isFinite(bp)) e.basePrice = "Base price must be a number.";
        else if (bp < PRICE_MIN) e.basePrice = "Base price cannot be negative.";
        else if (bp > PRICE_MAX) e.basePrice = `Base price cannot exceed ${PRICE_MAX.toFixed(2)}.`;

        if (!SPICY_VALUES.has(String(next.spicyLevel))) {
            e.spicyLevel = "Invalid spicy level.";
        }

        if (next.description && String(next.description).length > DESC_MAX) {
            e.description = `Description is too long (max ${DESC_MAX} characters).`;
        }

        const variants = Array.isArray(next.variants) ? next.variants : [];
        if (variants.length < 1) {
            e.variants = "At least one variant is required.";
        } else {
            const bad = [];
            variants.forEach((vr, i) => {
                const sizeOk = !!vr?.size;
                const doughOk = !!vr?.dough;
                const ex = Number(vr?.extraPrice ?? 0);
                const priceOk = Number.isFinite(ex) && ex >= EXTRA_MIN && ex <= EXTRA_MAX;
                if (!sizeOk || !doughOk || !priceOk) bad.push(i);
            });
            if (bad.length) {
                e.variants = "Each variant needs size, dough and extra price between 0.00 and 100.00.";
            }
        }

        if (showImagePicker && imageFile) {
            if (!/^image\//.test(imageFile.type)) e.image = "Only image files are allowed.";
            if (imageFile.size > IMAGE_MAX_BYTES) e.image = "Image must be ≤ 5MB.";
        }

        setErrors(e);
        return e;
    }

    const canSave = useMemo(() => {
        const e = validate(form);
        return Object.keys(e).length === 0;
        // eslint-disable-next-line
    }, [form, imageFile]);

    function onBasePriceChange(raw) {
        const val = raw.replace(",", ".");
        setField("basePrice", val);
    }
    function onBasePriceBlur() {
        const n = Number(form.basePrice);
        if (!Number.isFinite(n)) return;
        const bounded = Math.min(Math.max(n, PRICE_MIN), PRICE_MAX);
        setField("basePrice", Number(bounded.toFixed(2)));
    }

    const addVariant = () =>
        setForm((v) => ({ ...v, variants: [...v.variants, { ...DEFAULT_VARIANT }] }));

    const updateVariant = (i, patch) =>
        setForm((v) => ({
            ...v,
            variants: v.variants.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
        }));

    const removeVariant = (i) =>
        setForm((v) => {
            const next = v.variants.filter((_, idx) => idx !== i);
            return { ...v, variants: next.length ? next : [DEFAULT_VARIANT] };
        });

    function onExtraChange(i, raw) {
        const val = raw.replace(",", ".");
        const num = Number(val);
        updateVariant(i, {
            extraPrice: Number.isFinite(num) ? num : val,
        });
    }
    function onExtraBlur(i) {
        const n = Number(form.variants[i]?.extraPrice);
        if (!Number.isFinite(n)) return updateVariant(i, { extraPrice: 0 });
        const bounded = Math.min(Math.max(n, EXTRA_MIN), EXTRA_MAX);
        updateVariant(i, { extraPrice: Number(bounded.toFixed(2)) });
    }

    function onImagePick(file) {
        setImageFile(file || null);
        setTimeout(() => validate(form), 0);
    }

    function submit(e) {
        e.preventDefault();
        const eMap = validate(form);
        if (Object.keys(eMap).length > 0) return;

        const payload = {
            name: String(form.name).trim(),
            basePrice: Number(form.basePrice),
            isAvailable: !!form.isAvailable,
            description: form.description || "",
            spicyLevel: form.spicyLevel,
            imageUrl: form.imageUrl ?? null,
            variants: (form.variants ?? []).map(({ size, dough, extraPrice }) => ({
                size,
                dough,
                extraPrice: Number(extraPrice) || 0,
            })),
        };
        onSubmit?.(payload, imageFile);
    }

    return (
        <form className={styles.form} onSubmit={submit}>
            <div className={styles.field}>
                <label>Name</label>
                <input
                    className={styles.input}
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    required
                />
                {errors.name && <div className={styles.note} style={{ color: "#ff8aa6" }}>{errors.name}</div>}
            </div>

            <div className={styles.field}>
                <label>Base price</label>
                <input
                    type="text"
                    inputMode="decimal"
                    className={styles.input}
                    value={String(form.basePrice)}
                    onChange={(e) => onBasePriceChange(e.target.value)}
                    onBlur={onBasePriceBlur}
                    required
                />
                {errors.basePrice && <div className={styles.note} style={{ color: "#ff8aa6" }}>{errors.basePrice}</div>}
                <div className={styles.note}>Allowed: {PRICE_MIN.toFixed(2)}–{PRICE_MAX.toFixed(2)}</div>
            </div>

            <div className={styles.row}>
                <input
                    id="available"
                    type="checkbox"
                    className={styles.checkbox}
                    checked={!!form.isAvailable}
                    onChange={(e) => setField("isAvailable", e.target.checked)}
                />
                <label htmlFor="available">Available</label>
            </div>

            <div className={styles.field}>
                <label>Spicy level</label>
                <select
                    className={styles.select}
                    value={form.spicyLevel}
                    onChange={(e) => setField("spicyLevel", e.target.value)}
                >
                    <option value="mild">mild</option>
                    <option value="medium">medium</option>
                    <option value="hot">hot</option>
                </select>
                {errors.spicyLevel && <div className={styles.note} style={{ color: "#ff8aa6" }}>{errors.spicyLevel}</div>}
            </div>

            <div className={styles.field}>
                <label>Description (optional)</label>
                <textarea
                    className={styles.textarea}
                    rows={3}
                    value={form.description || ""}
                    onChange={(e) => setField("description", e.target.value)}
                />
                {errors.description && <div className={styles.note} style={{ color: "#ff8aa6" }}>{errors.description}</div>}
            </div>

            {form.imageUrl && (
                <div className={styles.field}>
                    <label>Current image</label>
                    <img src={form.imageUrl} alt="pizza" className={styles.img} />
                </div>
            )}

            <div className={styles.field}>
                <label>Variants</label>
                <div className={styles.variants}>
                    {(form.variants ?? []).map((vr, i) => (
                        <div key={i} className={styles.variantRow}>
                            <select
                                className={styles.variantInput}
                                value={vr.size}
                                onChange={(e) => updateVariant(i, { size: e.target.value })}
                            >
                                <option value="">Size…</option>
                                <option value="small">small</option>
                                <option value="medium">medium</option>
                                <option value="large">large</option>
                            </select>

                            <select
                                className={styles.variantInput}
                                value={vr.dough}
                                onChange={(e) => updateVariant(i, { dough: e.target.value })}
                            >
                                <option value="">Dough…</option>
                                <option value="thin">thin</option>
                                <option value="classic">classic</option>
                                <option value="wholegrain">wholegrain</option>
                            </select>

                            <input
                                className={styles.variantInput}
                                type="text"
                                inputMode="decimal"
                                placeholder="Extra price"
                                value={String(vr.extraPrice ?? 0)}
                                onChange={(e) => onExtraChange(i, e.target.value)}
                                onBlur={() => onExtraBlur(i)}
                            />

                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnDanger}`}
                                onClick={() => removeVariant(i)}
                            >
                                Remove
                            </button>
                        </div>
                    ))}

                    <div className={styles.row}>
                        <button type="button" className={styles.btn} onClick={addVariant}>
                            + Add variant
                        </button>
                        <button
                            type="button"
                            className={styles.btn}
                            onClick={() => setForm((v) => ({ ...v, variants: [{ ...DEFAULT_VARIANT }] }))}
                            title="Reset variants to default"
                        >
                            Reset to default (medium/classic)
                        </button>
                    </div>

                    {errors.variants && (
                        <div className={styles.note} style={{ color: "#ff8aa6" }}>{errors.variants}</div>
                    )}
                </div>
            </div>

            {showImagePicker && (
                <div className={styles.field}>
                    <label>Image (optional)</label>
                    <input type="file" accept="image/*" onChange={(e) => onImagePick(e.target.files?.[0] || null)} />
                    {errors.image && <div className={styles.note} style={{ color: "#ff8aa6" }}>{errors.image}</div>}
                    <div className={styles.note}>If provided, it will upload right after save (max 5MB).</div>
                </div>
            )}

            <div className={styles.row}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={busy || !canSave}>
                    {busy ? "Saving..." : "Save"}
                </button>
                <button className={styles.btn} type="button" onClick={onCancel} disabled={busy}>
                    Cancel
                </button>
            </div>
        </form>
    );
}
