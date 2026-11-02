"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Collapse, FormControl, InputLabel, MenuItem, Paper, Select, Switch, TextField } from "@mui/material";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Edit2,
  FolderPlus,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import useRole from "@/app/utils/useRole";
import { useAuth } from "@/app/services/AuthProvider";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const useRedirectAdmin = (user, userLoading, role, roleLoading) => {
  const router = useRouter();
  useEffect(() => {
    if (!userLoading && !roleLoading) {
      if (!user || role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [user, userLoading, role, roleLoading, router]);
};

const NavigationTreeItem = ({
  item,
  level = 0,
  expandedIds,
  onExpand,
  onAddChild,
  onEdit,
  onDelete,
  onToggle,
  onReorder,
}) => {
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isExpanded = expandedIds.has(item._id);
  const indent = { paddingLeft: `${level * 18}px` };

  return (
    <div className="mb-2">
      <Paper
        elevation={0}
        className="border border-slate-200 bg-white transition hover:border-blue-200 hover:bg-slate-50"
        style={indent}
      >
        <div className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => hasChildren && onExpand(item._id)}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border ${
                hasChildren
                  ? "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-600"
                  : "border-slate-200 bg-slate-100 text-slate-300"
              }`}
              aria-label={isExpanded ? `Collapse ${item.title}` : `Expand ${item.title}`}
              disabled={!hasChildren}
            >
              {hasChildren ? (
                isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />
              ) : (
                <Link2 size={16} />
              )}
            </button>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-900 text-white">
              {item.type === "dropdown" ? <ChevronDown size={17} /> : <Link2 size={17} />}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-semibold text-slate-900">{item.title}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-500">
                  {item.type}
                </span>
                {hasChildren && (
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                    {item.children.length} {item.children.length === 1 ? "item" : "items"}
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-slate-400">{item.path || "Dropdown only"}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <button
              type="button"
              onClick={() => onAddChild(item)}
              className="inline-flex h-8 items-center gap-1 rounded bg-green-600 px-2.5 text-xs font-medium text-white hover:bg-green-700"
              title="Add child item"
            >
              <FolderPlus size={14} />
              Child
            </button>
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="inline-flex h-8 items-center gap-1 rounded bg-slate-700 px-2.5 text-xs font-medium text-white hover:bg-slate-800"
              title="Edit item"
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="inline-flex h-8 items-center gap-1 rounded bg-red-600 px-2.5 text-xs font-medium text-white hover:bg-red-700"
              title="Delete item"
            >
              <Trash2 size={14} />
              Delete
            </button>
            <button
              type="button"
              onClick={() => onReorder(item, "up")}
              className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
              title="Move up"
            >
              <ArrowUp size={15} />
            </button>
            <button
              type="button"
              onClick={() => onReorder(item, "down")}
              className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
              title="Move down"
            >
              <ArrowDown size={15} />
            </button>
            <div className="flex items-center gap-1 rounded bg-slate-50 pl-2">
              <span className="text-xs text-slate-400">{item.isActive ? "Active" : "Inactive"}</span>
              <Switch checked={!!item.isActive} onChange={() => onToggle(item)} size="small" />
            </div>
          </div>
        </div>
      </Paper>

      {hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <div className="mt-2 border-l border-dashed border-slate-300">
            {item.children.map((child) => (
              <NavigationTreeItem
                key={child._id}
                item={child}
                level={level + 1}
                expandedIds={expandedIds}
                onExpand={onExpand}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggle={onToggle}
                onReorder={onReorder}
              />
            ))}
          </div>
        </Collapse>
      )}
    </div>
  );
};

export default function NavigationPage() {
  const { user, loading: userLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  useRedirectAdmin(user, userLoading, role, roleLoading);

  const [navigation, setNavigation] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ title: "", type: "link", path: "", parentId: null, order: 1, isActive: true });

  const fetchNavigation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/navigation");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data.success) setNavigation(data.navigation || []);
      else setError("Failed to fetch navigation");
    } catch (err) {
      console.error(err);
      setError(err.message || "Network error");
      toast.error("Failed to fetch navigation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNavigation(); }, []);

  const parentOptions = useMemo(() => {
    const flat = [];
    const walk = (nodes, prefix = "") => {
      nodes.forEach((node) => {
        flat.push({ _id: node._id, title: `${prefix}${node.title}` });
        if (node.children?.length) walk(node.children, `${prefix}${node.title} / `);
      });
    };
    walk(navigation);
    return flat;
  }, [navigation]);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openAddModal = (parent = null) => {
    setEditingItem(null);
    setForm({ title: "", type: "link", path: "", parentId: parent?._id || null, order: 1, isActive: true });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({ title: item.title || "", type: item.type || "link", path: item.path || "", parentId: item.parentId || null, order: item.order || 1, isActive: !!item.isActive });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.type) return toast.error("Title and type are required");
    if (form.type === "link" && !form.path) return toast.error("Path required for link");

    try {
      if (editingItem) {
        const res = await fetch(`/api/navigation/${editingItem._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const data = await res.json();
        if (data.success) {
          toast.success("Navigation updated successfully");
          fetchNavigation();
          setShowModal(false);
        } else {
          toast.error(data.message || "Failed to update");
        }
      } else {
        const res = await fetch("/api/navigation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const data = await res.json();
        if (data.success) {
          toast.success("Navigation added successfully");
          fetchNavigation();
          if (form.parentId) {
            setExpandedIds((prev) => new Set(prev).add(form.parentId));
          }
          setShowModal(false);
        } else {
          toast.error(data.message || "Failed to add");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    }
  };

  const handleDelete = async (item) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch(`/api/navigation/${item._id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Navigation deleted");
        fetchNavigation();
      } else {
        toast.error(data.message || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    }
  };

  const toggleActive = async (item) => {
    try {
      const res = await fetch(`/api/navigation/${item._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !item.isActive, title: item.title, type: item.type, path: item.path, parentId: item.parentId, order: item.order }) });
      const data = await res.json();
      if (data.success) {
        toast.success("Navigation status updated");
        // optimistic update
        const updateLocal = (nodes) => nodes.map((node) => {
          if (node._id === item._id) return { ...node, isActive: !node.isActive };
          if (node.children) return { ...node, children: updateLocal(node.children) };
          return node;
        });
        setNavigation((prev) => updateLocal(prev));
      } else {
        toast.error(data.message || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    }
  };

  const handleReorder = async (item, direction) => {
    try {
      const res = await fetch("/api/navigation/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item._id, direction }) });
      const data = await res.json();
      if (data.success) {
        toast.success("Reordered");
        fetchNavigation();
      } else {
        toast.error(data.message || "Failed to reorder");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Navigation Management</h1>
          <p className="text-sm text-slate-400">Manage the customer website navigation structure.</p>
        </div>
        <button onClick={() => openAddModal(null)} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          <Plus size={16} />
          Add Navigation
        </button>
      </div>

      <div className="rounded bg-white p-4 shadow">
        {loading ? (
          <div className="py-10 text-center">Loading...</div>
        ) : error ? (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : (
          <div>
            {navigation.length === 0 ? (
              <div className="py-6 text-center text-slate-500">No navigation items found.</div>
            ) : (
              navigation.map((item) => (
                <NavigationTreeItem
                  key={item._id}
                  item={item}
                  expandedIds={expandedIds}
                  onExpand={toggleExpanded}
                  onAddChild={(navItem) => openAddModal(navItem)}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onToggle={toggleActive}
                  onReorder={handleReorder}
                />
              ))
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold">{editingItem ? "Edit Navigation" : "Add Navigation"}</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <FormControl>
                <InputLabel>Type</InputLabel>
                <Select value={form.type} label="Type" onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <MenuItem value="link">Link</MenuItem>
                  <MenuItem value="dropdown">Dropdown</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Path" value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} />
              <FormControl>
                <InputLabel>Parent</InputLabel>
                <Select value={form.parentId || ""} label="Parent" onChange={(e) => setForm({ ...form, parentId: e.target.value || null })}>
                  <MenuItem value="">No Parent</MenuItem>
                  {parentOptions.map((parent) => (
                    <MenuItem key={parent._id} value={parent._id}>
                      {parent.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField label="Order" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />

              <div className="flex items-center gap-3">
                <Switch checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                <span>Active</span>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded bg-slate-200 px-4 py-2 hover:bg-slate-300">Cancel</button>
              <button onClick={handleSubmit} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
