import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";

// One record per uploaded image. The file itself lives on disk in UPLOAD_DIR, or on a remote
// upload server when UPLOAD_ENDPOINT is set (see src/lib/media.ts); this record keeps what the
// media library lists and lets us delete it.
// Admin-only: the storefront serves files straight from disk and never reads this collection.
const mediaSchema = new Schema(
  {
    fileName: { type: String, required: true, unique: true },
    /** Absolute URL for files stored on a remote upload server. Unset for files in UPLOAD_DIR. */
    url: { type: String },
    originalName: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    uploadedBy: { type: String },
  },
  { timestamps: true, collection: "media_uploads" },
);

export type MediaDoc = InferSchemaType<typeof mediaSchema>;

const createMediaModel = () => model("Media", mediaSchema);

export const Media = (models.Media as ReturnType<typeof createMediaModel> | undefined) ?? createMediaModel();
