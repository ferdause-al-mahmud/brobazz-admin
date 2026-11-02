"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const scopeLabels = {
    category: "Category",
    subcategory: "Subcategory",
    type: "Product type",
};

const ProductSerialization = () => {
    const [scope, setScope] = useState("category");
    const [value, setValue] = useState("");
    const [options, setOptions] = useState({ category: [], subcategory: [] });
    const [products, setProducts] = useState([]);
    const [draftSerials, setDraftSerials] = useState({});
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [loading, setLoading] = useState(false);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoriesError, setCategoriesError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadCategories = async () => {
            setCategoriesLoading(true);
            setCategoriesError("");
            const response = await fetch("/api/categories");
            if (!response.ok) throw new Error("Failed to load categories");
            const data = await response.json();
            const categories = new Set();
            const subcategories = new Set();
            (data.categories || []).forEach((item) => {
                if (item.category) categories.add(item.category);
                if (item.subcategory) subcategories.add(item.subcategory);
            });
            setOptions({
                category: [...categories].sort(),
                subcategory: [...subcategories].sort(),
            });
            if (scope === "category" && !value && categories.size > 0) {
                setValue([...categories].sort()[0]);
            }
        };
        loadCategories().catch((error) => {
            console.error(error);
            setCategoriesError("Failed to load categories. Please refresh and try again.");
        }).finally(() => {
            setCategoriesLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!value) {
            setProducts([]);
            return;
        }
        const loadProducts = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/product-serialization?scope=${scope}&value=${encodeURIComponent(value)}&page=${page}`);
                if (!response.ok) throw new Error("Failed to load products");
                const data = await response.json();
                const pageProducts = data.products || [];
                setProducts(pageProducts.map((product) => ({
                    ...product,
                    serial: Object.prototype.hasOwnProperty.call(draftSerials, product.id)
                        ? draftSerials[product.id]
                        : product.serial,
                })));
                setTotalPages(data.totalPages || 1);
                setTotalProducts(data.totalProducts || 0);
                setPage(data.currentPage || page);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load products");
            } finally {
                setLoading(false);
            }
        };
        loadProducts();
    }, [scope, value, page]);

    const scopeOptions = scope === "type"
        ? [{ value: "new-arrivals", label: "New arrivals" }, { value: "sale", label: "Sale" }]
        : (options[scope] || []).map((item) => ({ value: item, label: item }));

    const updateSerial = (productId, serial) => {
        setDraftSerials((current) => ({ ...current, [productId]: serial }));
        setProducts((current) => current.map((product) =>
            product.id === productId ? { ...product, serial } : product,
        ));
    };

    const save = async () => {
        setSaving(true);
        try {
            const response = await fetch("/api/product-serialization", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scope,
                    value,
                    updates: Object.entries(draftSerials).map(([productId, serial]) => ({ productId, serial })),
                }),
            });
            if (!response.ok) throw new Error("Failed to save serializations");
            setDraftSerials({});
            toast.success("Serials saved successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save serials");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Product Serialization</h1>
            <div className="flex flex-wrap gap-4 mb-6">
                <select value={scope} onChange={(event) => { setScope(event.target.value); setValue(""); setPage(1); setDraftSerials({}); }} className="border p-2 rounded">
                    {Object.entries(scopeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
                <select value={value} onChange={(event) => { setValue(event.target.value); setPage(1); setDraftSerials({}); }} className="border p-2 rounded min-w-56">
                    <option value="">Select {scopeLabels[scope]}</option>
                    {scopeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {products.length > 0 && <button type="button" onClick={save} disabled={saving} className="bg-black text-white px-5 py-2 rounded disabled:opacity-50">{saving ? "Saving..." : "Save serials"}</button>}
            </div>
            {categoriesLoading ? <p>Loading categories...</p> : categoriesError ? <p className="text-red-600">{categoriesError}</p> : loading ? <p>Loading products...</p> : value && products.length === 0 ? <p>No products found for this selection.</p> : !value ? <p>Select a category, subcategory, or product type to manage serials.</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border">
                        <thead><tr><th className="px-4 py-2 border text-left">Product</th><th className="px-4 py-2 border text-left">Serial</th></tr></thead>
                        <tbody>{products.map((product) => (
                            <tr key={product.id}>
                                <td className="px-4 py-2 border flex items-center gap-3">
                                    {product.imageUrl?.[0] && <Image src={product.imageUrl[0]} alt={product.name || product.id} width={50} height={50} />}
                                    <span>{product.name}<br /><small>{product.id}</small></span>
                                </td>
                                <td className="px-4 py-2 border">
                                    <input type="number" min="0" step="1" value={product.serial ?? ""} onChange={(event) => updateSerial(product.id, event.target.value)} className="border rounded p-2 w-28" placeholder="Not set" />
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                    <div className="flex items-center justify-between mt-4">
                        <span className="text-sm text-gray-600">
                            {totalProducts} products · Page {page} of {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className="border px-3 py-1 rounded disabled:opacity-50">Previous</button>
                            <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)} className="border px-3 py-1 rounded disabled:opacity-50">Next</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductSerialization;
