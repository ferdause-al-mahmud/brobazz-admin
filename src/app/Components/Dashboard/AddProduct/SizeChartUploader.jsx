import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import axios from "axios";
import toast from "react-hot-toast";

const SizeChartUploader = ({ product, setProduct }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = useCallback(
    async (acceptedFiles) => {
      if (!acceptedFiles?.length) return;

      setUploading(true);
      setError("");

      try {
        // Upload ORIGINAL file only
        const formData = new FormData();
        formData.append("files", acceptedFiles[0]);

        const response = await axios.post(
          "https://admin.clothtar.com/api/upload",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );

        const uploadedUrl = response.data.files[0].url;

        setProduct((prev) => ({
          ...prev,
          sizeChart: uploadedUrl,
        }));

        toast.success("Size chart uploaded successfully!");
      } catch (err) {
        console.error("Error uploading size chart:", err);
        setError("Failed to upload size chart. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [setProduct],
  );

  const handleDelete = () => {
    setProduct((prev) => ({ ...prev, sizeChart: "" }));
  };

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    multiple: false,
    accept: { "image/*": [] },
  });

  return (
    <div>
      {!product.sizeChart ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed border-gray-300 p-4 text-center cursor-pointer rounded bg-gray-50 hover:bg-gray-100 transition ${
            uploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <p>Uploading...</p>
          ) : isDragActive ? (
            <p>Drop the image here...</p>
          ) : (
            <p>Click or drag an image here to upload size chart</p>
          )}
        </div>
      ) : (
        <div className="relative inline-block mt-4">
          <Image
            src={product.sizeChart}
            alt="Size Chart"
            width={300}
            height={300}
            className="rounded border border-gray-200"
          />
          <button
            type="button"
            onClick={handleDelete}
            className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded"
          >
            Delete
          </button>
        </div>
      )}

      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
};

export default SizeChartUploader;
