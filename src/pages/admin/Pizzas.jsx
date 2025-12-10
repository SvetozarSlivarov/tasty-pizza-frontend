import { useEffect, useState } from "react";
import styles from "../../styles/Pizzas.module.css";
import { adminApi } from "../../api/admin";
import { fileToBase64 } from "../../utils/fileToBase64";
import PizzaForm, { normalizePizza } from "./components/PizzaForm";
import PizzaIngredientsEditor from "./components/PizzaIngredientsEditor";
import Modal from "./components/Modal";

export default function PizzasAdmin() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);

    const [imageBusy, setImageBusy] = useState(false);
    const [imageError, setImageError] = useState(null);

    const [showIngredientsFor, setShowIngredientsFor] = useState(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const list = await adminApi.listPizzas(false, true);
            setRows(Array.isArray(list) ? list : []);
        } catch (e) {
            setError(e?.message || "Failed to load pizzas");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);


    async function handleCreate(payload, imageFile) {
        setBusy(true);
        try {
            const created = await adminApi.createPizza(payload);
            const id = created?.id;

            if (id && imageFile) {
                try {
                    setImageBusy(true);
                    const { filename, contentType, base64 } = await fileToBase64(imageFile);
                    await adminApi.uploadPizzaImageBase64(id, {
                        filename: filename ?? "image.jpg",
                        contentType: contentType || "image/jpeg",
                        dataBase64: base64, // <-- важно: подаваме string
                    });
                } finally {
                    setImageBusy(false);
                }
            }

            setCreating(false);
            if (id) setShowIngredientsFor(id);
            await load();
        } catch (e) {
            alert(e?.message || "Create failed");
        } finally {
            setBusy(false);
        }
    }

    async function handleUpdate(id, payload, imageFile) {
        setBusy(true);
        try {
            await adminApi.updatePizza(id, payload);

            if (imageFile) {
                try {
                    setImageBusy(true);
                    const { filename, contentType, base64 } = await fileToBase64(imageFile);
                    await adminApi.uploadPizzaImageBase64(id, {
                        filename: filename ?? "image.jpg",
                        contentType: contentType || "image/jpeg",
                        dataBase64: base64, // <-- важно
                    });
                } finally {
                    setImageBusy(false);
                }
            }

            setEditing(null);
            await load();
        } catch (e) {
            alert(e?.message || "Update failed");
        } finally {
            setBusy(false);
        }
    }

    async function onUploadImage(id, file) {
        if (!file) return;
        try {
            setImageBusy(true);
            setImageError(null);
            if (!/^image\//.test(file.type)) throw new Error("Only images are allowed");
            if (file.size > 5 * 1024 * 1024) throw new Error("Max size is 5MB");

            const { filename, contentType, base64 } = await fileToBase64(file);
            await adminApi.uploadPizzaImageBase64(id, {
                filename: filename ?? "image.jpg",
                contentType: contentType || "image/jpeg",
                dataBase64: base64,
            });
            await load();
        } catch (e) {
            setImageError(e?.message || "Image upload failed");
        } finally {
            setImageBusy(false);
        }
    }

    async function onEditClick(row) {
        try {
            const full = await adminApi.getPizza(row.id, true);
            setEditing({ id: full?.id ?? row.id, ...normalizePizza(full) });
        } catch (_) {
            setEditing({ id: row.id, ...normalizePizza(row) });
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div className={styles.title}>Pizzas</div>
                <div className={styles.actions}>
                    <button
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={() => setCreating(true)}
                        disabled={busy}
                    >
                        + New pizza
                    </button>
                </div>
            </div>

            {error && <div className={`${styles.panel} ${styles.error}`}>Error: {error}</div>}

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                    <tr>
                        <th className={styles.th}>ID</th>
                        <th className={styles.th}>Image</th>
                        <th className={styles.th}>Name</th>
                        <th className={styles.th}>Price</th>
                        <th className={styles.th}>Available</th>
                        <th className={styles.th}>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td className={styles.td} colSpan={6}>Loading…</td></tr>
                    ) : rows?.length ? (
                        rows.map((r) => (
                            <tr key={r.id} className={!r.isAvailable ? styles.rowMuted : undefined}>
                                <td className={styles.td}>{r.id}</td>
                                <td className={styles.td}>
                                    {r.imageUrl
                                        ? <img className={styles.img} src={r.imageUrl} alt={r.name} />
                                        : <span className={styles.note}>no image</span>}
                                </td>
                                <td className={styles.td}>{r.name}</td>
                                <td className={styles.td}>
                                    {typeof r.basePrice === "number" ? r.basePrice.toFixed(2) : r.basePrice}
                                </td>
                                <td className={styles.td}>
                                    {r.isAvailable ? <span>✔</span> : <span>✖</span>}
                                </td>
                                <td className={styles.td}>
                                    <div className={styles.row}>
                                        <button className={styles.btn} onClick={() => onEditClick(r)} disabled={busy}>
                                            Edit
                                        </button>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            disabled={imageBusy}
                                            onChange={(e) => onUploadImage(r.id, e.target.files?.[0] || null)}
                                            title="Upload image as Base64 to backend"
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td className={styles.td} colSpan={6}>No records.</td></tr>
                    )}
                    </tbody>
                </table>
            </div>

            {imageError && <div className={`${styles.panel} ${styles.error}`}>Image error: {imageError}</div>}

            {/* CREATE MODAL */}
            <Modal title="Create pizza" isOpen={creating} onClose={() => setCreating(false)}>
                <PizzaForm
                    onSubmit={handleCreate}
                    onCancel={() => setCreating(false)}
                    busy={busy}
                    showImagePicker
                />
            </Modal>

            {/* EDIT MODAL */}
            <Modal title="Edit pizza" isOpen={Boolean(editing)} onClose={() => setEditing(null)}>
                {editing && (
                    <PizzaForm
                        initial={editing}
                        onSubmit={(payload, img) => handleUpdate(editing.id, payload, img)}
                        onCancel={() => setEditing(null)}
                        busy={busy}
                    />
                )}
            </Modal>
            {showIngredientsFor && (
                <div className={styles.panel} style={{ marginTop: 16 }}>
                    <h3 className={styles.panelTitle}>Step 2: Ingredients for new pizza</h3>
                    <PizzaIngredientsEditor pizzaId={showIngredientsFor} />
                    <div className={styles.row} style={{ marginTop: 12 }}>
                        <button className={styles.btn} onClick={() => setShowIngredientsFor(null)}>
                            Finish
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
