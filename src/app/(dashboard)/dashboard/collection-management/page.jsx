"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Image from "next/image";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";

const CollectionManagementPage = () => {
  const [collections, setCollections] = useState([]);
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPath, setEditPath] = useState("");
  const [editSerialNo, setEditSerialNo] = useState("");
  const [editImageFile, setEditImageFile] = useState(null);

  const fetchCollections = useCallback(async () => {
    try {
      const response = await axios.get("/api/collections");
      if (response.data?.success) {
        setCollections(response.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch collections:", error);
      toast.error("Could not load collections.");
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleCreate = async () => {
    if (!name.trim() || !path.trim() || !imageFile) {
      toast.error("Please provide a name, path, and image.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", imageFile);

      const uploadRes = await axios.post(
        "https://admin.clothtar.com/api/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const uploadedUrl = uploadRes.data.files?.[0]?.url;

      await axios.post("/api/collections", {
        name: name.trim(),
        path: path.trim(),
        imageUrl: uploadedUrl,
        serialNo: Number(serialNo || 0),
      });

      toast.success("Collection created successfully!");
      setName("");
      setPath("");
      setSerialNo("");
      setImageFile(null);
      await fetchCollections();
    } catch (error) {
      console.error("Create collection error:", error);
      toast.error("Failed to create collection.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditStart = (item) => {
    setEditingId(item._id);
    setEditName(item.name || "");
    setEditPath(item.path || "");
    setEditSerialNo(item.serialNo ?? "");
    setEditImageFile(null);
  };

  const handleEditSave = async (id) => {
    setIsUploading(true);
    try {
      let uploadedUrl = null;

      if (editImageFile) {
        const formData = new FormData();
        formData.append("files", editImageFile);

        const uploadRes = await axios.post(
          "https://admin.clothtar.com/api/upload",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );

        uploadedUrl = uploadRes.data.files?.[0]?.url;
      }

      const payload = {
        _id: id,
        name: editName.trim(),
        path: editPath.trim(),
        serialNo: Number(editSerialNo || 0),
      };

      if (uploadedUrl) payload.imageUrl = uploadedUrl;

      await axios.put("/api/collections", payload);

      toast.success("Collection updated successfully!");
      setEditingId(null);
      setEditName("");
      setEditPath("");
      setEditSerialNo("");
      setEditImageFile(null);
      await fetchCollections();
    } catch (error) {
      console.error("Update collection error:", error);
      toast.error("Failed to update collection.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    confirmAlert({
      title: "Confirm Delete",
      message: "Do you really want to delete this collection?",
      buttons: [
        {
          label: "Yes",
          onClick: async () => {
            try {
              await axios.delete("/api/collections", { data: { _id: id } });
              toast.success("Collection deleted!");
              await fetchCollections();
            } catch (error) {
              console.error("Delete collection error:", error);
              toast.error("Failed to delete collection.");
            }
          },
        },
        { label: "No" },
      ],
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Collection Management</h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="mb-3 text-lg font-semibold">Create New Collection</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Collection name"
          className="mb-3 w-full rounded border border-slate-300 bg-white px-3 py-2"
        />
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Collection path (e.g. /collections/panjabi)"
          className="mb-3 w-full rounded border border-slate-300 bg-white px-3 py-2"
        />
        <input
          type="number"
          min="1"
          value={serialNo}
          onChange={(e) => setSerialNo(e.target.value)}
          placeholder="Serial number"
          className="mb-3 w-full rounded border border-slate-300 bg-white px-3 py-2"
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          className="mb-3 w-full rounded border border-slate-300 bg-white px-3 py-2"
        />
        <button
          onClick={handleCreate}
          disabled={isUploading || !name.trim() || !path.trim() || !imageFile}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Create Collection"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {collections.map((item) => {
          const isEditing = editingId === item._id;

          return (
            <div
              key={item._id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              {isEditing ? (
                <div className="space-y-3 p-3">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    value={editPath}
                    onChange={(e) => setEditPath(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                  <input
                    type="number"
                    min="1"
                    value={editSerialNo}
                    onChange={(e) => setEditSerialNo(e.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditImageFile(e.target.files[0])}
                    className="w-full rounded border border-slate-300 px-3 py-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSave(item._id)}
                      disabled={isUploading}
                      className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isUploading ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditName("");
                        setEditPath("");
                        setEditSerialNo("");
                        setEditImageFile(null);
                      }}
                      className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Image
                    src={item.imageUrl || "/placeholder.svg"}
                    alt={item.name}
                    width={800}
                    height={450}
                    className="h-48 w-full object-cover"
                  />
                  <div className="p-3">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{item.path}</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      Serial: {item.serialNo ?? 0}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 p-3 pt-0">
                    <button
                      onClick={() => handleEditStart(item)}
                      className="rounded-full bg-white/90 p-2 text-slate-700 shadow hover:bg-white"
                      title="Edit collection"
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="rounded-full bg-red-500/90 p-2 text-white shadow hover:bg-red-600"
                      title="Delete collection"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CollectionManagementPage;
