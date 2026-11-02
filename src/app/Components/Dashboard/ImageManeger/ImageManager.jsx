"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import toast from "react-hot-toast";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import Image from "next/image";

const ImageManager = () => {
  const [images, setImages] = useState([]);
  const [newImageFile, setNewImageFile] = useState(null);
  const [bannerLink, setBannerLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editBannerLink, setEditBannerLink] = useState("");

  const fetchImages = useCallback(async () => {
    try {
      const response = await axios.get(`/api/banner`);
      if (response.data.success) {
        setImages(response.data.data);
      } else {
        toast.error("Failed to fetch banner images.");
      }
    } catch (error) {
      console.error("Fetch banner error:", error);
      toast.error("Could not load banners.");
    }
  }, []);

  const handleUpload = async () => {
    if (!newImageFile) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("files", newImageFile);

      const uploadRes = await axios.post(
        "https://admin.clothtar.com/api/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const uploadedUrl = uploadRes.data.files[0].url;

      await axios.post("/api/banner", {
        url: uploadedUrl,
        link: bannerLink.trim(),
      });

      toast.success("Banner uploaded successfully!");
      setNewImageFile(null);
      setBannerLink("");
      await fetchImages();
    } catch (error) {
      console.error("Banner upload error:", error);
      toast.error("Failed to upload banner.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditStart = (image) => {
    setEditingBannerId(image._id);
    setEditBannerLink(image.link || "");
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
          { headers: { "Content-Type": "multipart/form-data" } },
        );

        uploadedUrl = uploadRes.data.files?.[0]?.url;
      }

      const payload = { _id: id, link: editBannerLink.trim() };
      if (uploadedUrl) payload.url = uploadedUrl;

      await axios.put("/api/banner", payload);

      toast.success("Banner updated successfully!");
      setEditingBannerId(null);
      setEditImageFile(null);
      setEditBannerLink("");
      await fetchImages();
    } catch (error) {
      console.error("Banner update error:", error);
      toast.error("Failed to update banner.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    confirmAlert({
      title: "Confirm Delete",
      message: "Do you really want to delete this banner?",
      buttons: [
        {
          label: "Yes",
          onClick: async () => {
            setIsDeleting(true);
            try {
              await axios.delete(`/api/banner`, {
                data: { _id: id },
              });

              toast.success("Banner deleted!");
              await fetchImages();
            } catch (error) {
              console.error("Delete error:", error);
              toast.error("Failed to delete banner.");
            } finally {
              setIsDeleting(false);
            }
          },
        },
        { label: "No" },
      ],
    });
  };

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Banner Manager</h1>

      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="block mb-2 text-lg font-semibold">
          Add a New Banner Image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setNewImageFile(e.target.files[0])}
          className="border rounded px-3 py-2 w-full mb-4 bg-white"
        />

        <input
          type="url"
          value={bannerLink}
          onChange={(e) => setBannerLink(e.target.value)}
          placeholder="Optional redirect link (https://example.com)"
          className="border rounded px-3 py-2 w-full mb-4 bg-white"
        />

        <button
          onClick={handleUpload}
          disabled={!newImageFile || isUploading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isUploading ? "Uploading..." : "Upload Image"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((image) => {
          const isEditing = editingBannerId === image._id;

          return (
            <div
              key={image._id}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              {isEditing ? (
                <div className="space-y-3 p-3">
                  <label className="block text-sm font-semibold text-slate-700">
                    Replace Image (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditImageFile(e.target.files[0])}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2"
                  />

                  <label className="block text-sm font-semibold text-slate-700">
                    Redirect Link
                  </label>
                  <input
                    type="url"
                    value={editBannerLink}
                    onChange={(e) => setEditBannerLink(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSave(image._id)}
                      disabled={isUploading}
                      className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isUploading ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingBannerId(null);
                        setEditImageFile(null);
                        setEditBannerLink("");
                      }}
                      className="rounded bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Image
                    src={image.url}
                    alt="Banner Image"
                    width={800}
                    height={450}
                    className="h-48 w-full object-cover"
                  />

                  {image.link ? (
                    <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[11px] text-white">
                      Link: {image.link}
                    </div>
                  ) : null}

                  <div className="absolute right-2 top-2 flex gap-2">
                    <button
                      onClick={() => handleEditStart(image)}
                      className="rounded-full bg-white/90 p-2 text-slate-700 shadow hover:bg-white"
                      title="Edit banner"
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(image._id)}
                      disabled={isDeleting}
                      className="rounded-full bg-red-500/90 p-2 text-white shadow hover:bg-red-600"
                      title="Delete banner"
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

export default ImageManager;
