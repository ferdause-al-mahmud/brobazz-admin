import "server-only";
import { Readable } from "node:stream";
import mongoose from "mongoose";
import sharp from "sharp";
import { connectToDatabase } from "@/lib/db";

// Uploaded images live in MongoDB GridFS (bucket "media"), which both apps can read, so no
// separate file host is needed. URLs look like /media/<id>.webp and are served by both apps
// (customer/lib/media.ts has the same reader). To move to S3 or Cloudinary later, replace
// saveImage() and keep returning a URL.

const BUCKET = "media";
const ID_PATTERN = /^([a-f0-9]{24})(?:\.[a-z0-9]+)?$/i;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

async function bucket() {
  const { connection } = await connectToDatabase();
  if (!connection.db) throw new Error("Database not connected");
  return new mongoose.mongo.GridFSBucket(connection.db, { bucketName: BUCKET });
}

export type MediaFile = {
  id: string;
  url: string;
  name: string;
  size: number;
  width: number | null;
  height: number | null;
  uploadedAt: string;
};

/** Resizes to at most 2400px, converts to WebP and stores it. */
export async function saveImage(file: File, uploadedBy?: string): Promise<MediaFile> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is larger than 10 MB`);

  const { data, info } = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate() // respect the camera orientation
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86 })
    .toBuffer({ resolveWithObject: true });

  const id = new mongoose.Types.ObjectId();
  const store = await bucket();
  await new Promise<void>((resolve, reject) => {
    store
      .openUploadStreamWithId(id, `${id}.webp`, {
        metadata: {
          contentType: "image/webp",
          originalName: file.name,
          width: info.width,
          height: info.height,
          uploadedBy,
        },
      })
      .on("finish", () => resolve())
      .on("error", reject)
      .end(data);
  });

  return {
    id: String(id),
    url: `/media/${id}.webp`,
    name: file.name,
    size: data.length,
    width: info.width,
    height: info.height,
    uploadedAt: new Date().toISOString(),
  };
}

export async function listMedia({ page = 1, limit = 48 } = {}) {
  const store = await bucket();
  const { connection } = await connectToDatabase();
  const [files, total] = await Promise.all([
    store.find({}).sort({ uploadDate: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    connection.db!.collection(`${BUCKET}.files`).countDocuments(),
  ]);
  return {
    total,
    files: files.map<MediaFile>((file) => ({
      id: String(file._id),
      url: `/media/${file.filename}`,
      name: (file.metadata?.originalName as string | undefined) ?? file.filename,
      size: file.length,
      width: (file.metadata?.width as number | undefined) ?? null,
      height: (file.metadata?.height as number | undefined) ?? null,
      uploadedAt: file.uploadDate.toISOString(),
    })),
  };
}

export async function deleteMedia(id: string) {
  if (!mongoose.isValidObjectId(id)) return;
  await (await bucket()).delete(new mongoose.Types.ObjectId(id));
}

/** Streams a stored image as a Response, or null when it doesn't exist. */
export async function mediaResponse(file: string): Promise<Response | null> {
  const id = ID_PATTERN.exec(file)?.[1];
  if (!id) return null;

  const store = await bucket();
  const objectId = new mongoose.Types.ObjectId(id);
  const [stored] = await store.find({ _id: objectId }).limit(1).toArray();
  if (!stored) return null;

  return new Response(Readable.toWeb(store.openDownloadStream(objectId)) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": (stored.metadata?.contentType as string | undefined) ?? "application/octet-stream",
      "Content-Length": String(stored.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
