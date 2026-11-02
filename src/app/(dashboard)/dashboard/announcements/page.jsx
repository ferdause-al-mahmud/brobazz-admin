"use client";

import React, { useEffect, useState } from "react";
import { Megaphone, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import useRole from "@/app/utils/useRole";
import { useAuth } from "@/app/services/AuthProvider";

const useRedirectAdmin = (user, userLoading, role, roleLoading) => {
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !roleLoading && (!user || role !== "admin")) {
      router.push("/dashboard");
    }
  }, [user, userLoading, role, roleLoading, router]);
};

const emptyForm = { text: "", order: 1, isActive: true };

export default function AnnouncementsPage() {
  const { user, loading: userLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  useRedirectAdmin(user, userLoading, role, roleLoading);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/announcements", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch announcements");
      }

      setAnnouncements(data.announcements || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userLoading && !roleLoading && user && role === "admin") {
      fetchAnnouncements();
    }
  }, [user, userLoading, role, roleLoading]);

  const resetForm = () => {
    setEditingAnnouncement(null);
    setForm({ ...emptyForm, order: announcements.length + 1 });
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setForm({
      text: announcement.text || "",
      order: announcement.order || 1,
      isActive: !!announcement.isActive,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.text.trim()) {
      toast.error("Announcement text is required");
      return;
    }

    setSaving(true);
    try {
      const url = editingAnnouncement
        ? `/api/announcements/${editingAnnouncement._id}`
        : "/api/announcements";
      const method = editingAnnouncement ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: form.text,
          order: Number(form.order),
          isActive: !!form.isActive,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save announcement");
      }

      toast.success(
        editingAnnouncement ? "Announcement updated" : "Announcement added",
      );
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (announcement) => {
    try {
      const response = await fetch(`/api/announcements/${announcement._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: announcement.text,
          order: announcement.order,
          isActive: !announcement.isActive,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update status");
      }

      setAnnouncements((current) =>
        current.map((item) =>
          item._id === announcement._id
            ? { ...item, isActive: !item.isActive }
            : item,
        ),
      );
      toast.success("Announcement status updated");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to update status");
    }
  };

  const handleDelete = async (announcement) => {
    if (!confirm("Delete this announcement?")) return;

    try {
      const response = await fetch(`/api/announcements/${announcement._id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete announcement");
      }

      toast.success("Announcement deleted");
      fetchAnnouncements();
      if (editingAnnouncement?._id === announcement._id) resetForm();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to delete announcement");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Announcement Bar
          </h1>
          <p className="text-sm text-slate-500">
            Manage the scrolling announcements shown at the top of the customer
            website.
          </p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          New Announcement
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2 text-slate-900">
          <Megaphone className="h-5 w-5" />
          <h2 className="text-lg font-semibold">
            {editingAnnouncement ? "Edit Announcement" : "Add Announcement"}
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_120px_140px]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Sentence
            </span>
            <textarea
              value={form.text}
              onChange={(event) =>
                setForm({ ...form, text: event.target.value })
              }
              rows={3}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
              placeholder="Write announcement text"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Order
            </span>
            <input
              type="number"
              min="0"
              value={form.order}
              onChange={(event) =>
                setForm({ ...form, order: event.target.value })
              }
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
            />
          </label>

          <label className="flex items-center gap-3 pt-6 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={!!form.isActive}
              onChange={(event) =>
                setForm({ ...form, isActive: event.target.checked })
              }
              className="h-4 w-4 accent-slate-900"
            />
            Active
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {editingAnnouncement && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>

      <div className="rounded border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-900">
            All Announcements
          </h2>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            No announcements found.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {announcements.map((announcement) => (
              <div
                key={announcement._id}
                className="grid gap-3 p-4 lg:grid-cols-[80px_1fr_140px_160px] lg:items-center"
              >
                <div className="text-sm font-semibold text-slate-500">
                  #{announcement.order || 0}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {announcement.text}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {announcement.isActive
                      ? "Active on client site"
                      : "Hidden from client site"}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!announcement.isActive}
                    onChange={() => handleToggle(announcement)}
                    className="h-4 w-4 accent-slate-900"
                  />
                  Active
                </label>
                <div className="flex gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => handleEdit(announcement)}
                    className="inline-flex items-center gap-2 rounded bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(announcement)}
                    className="inline-flex items-center gap-2 rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
