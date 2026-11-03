import "server-only";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import mongoose from "mongoose";
import sharp from "sharp";
import { connectToDatabase } from "@/lib/db";
import { InputError } from "@/lib/actions/result";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/media-config";
import { Media } from "@/lib/models/Media";

// Uploaded images are saved as files on the server, in UPLOAD_DIR, and served at
// /uploads/<file> by both apps (customer/lib/media.ts has the same reader). Both apps must point
// UPLOAD_DIR at the same folder. In production nginx can serve /uploads/ straight from that folder;
// the route handlers are the fallback and are what runs in development.
//
// Remote mode (for testing before the apps are deployed): when UPLOAD_ENDPOINT is set, files are
// POSTed to that upload server instead (multipart field "files", answering
// { success, files: [{ url, fileName }] }), and its absolute URL is stored. UPLOAD_PUBLIC_URL is
// where those files are served from; next.config.ts allows that host for next/image.
//
// A record in the media_uploads collection keeps the original name and size for the media library.
// Images uploaded before the move to disk are still in MongoDB GridFS and served at /media/<id>.

/** Absolute upload folder. Defaults to "uploads" next to the two app folders (../uploads). */
export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), "..", "uploads"));
export const UPLOAD_URL_PREFIX = "/uploads";
const UPLOAD_ENDPOINT = process.env.UPLOAD_ENDPOINT?.trim() || null;
const UPLOAD_PUBLIC_URL = process.env.UPLOAD_PUBLIC_URL?.trim().replace(/\/+$/, "") || null;

// Names we generate: <uuid>.<ext>. Anything else (dots, slashes) is rejected before touching the disk.
const FILE_NAME_PATTERN = /^[a-z0-9-]+\.(webp|jpe?g|png|gif|avif)$/i;
const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  avif: "image/avif",
};

export type MediaFile = {
  id: string;
  url: string;
  name: string;
  size: number;
  width: number | null;
  height: number | null;
  uploadedAt: string;
};

const urlFor = (record: { fileName: string; url?: string | null }) =>
  record.url ?? `${UPLOAD_URL_PREFIX}/${record.fileName}`;

type UploadServerReply = { success?: boolean; msg?: string; files?: { url?: string; fileName?: string }[] };

/** Sends one WebP image to UPLOAD_ENDPOINT and returns where the upload server stored it. */
async function sendToUploadServer(endpoint: string, data: Buffer, name: string) {
  const form = new FormData();
  form.append("files", new Blob([new Uint8Array(data)], { type: "image/webp" }), `${name}.webp`);

  let response: Response;
  try {
    response = await fetch(endpoint, { method: "POST", body: form, signal: AbortSignal.timeout(60_000) });
  } catch (error) {
    console.error("Upload server unreachable", error);
    throw new InputError("Couldn't reach the upload server. Please try again.");
  }

  const reply = (await response.json().catch(() => null)) as UploadServerReply | null;
  const saved = reply?.files?.[0];
  if (!response.ok || !reply?.success || !saved?.url || !saved.fileName) {
    console.error("Upload server rejected the image", response.status, reply);
    throw new InputError(`The upload server rejected the image${reply?.msg ? `: ${reply.msg}` : ` (HTTP ${response.status})`}`);
  }
  if (UPLOAD_PUBLIC_URL && !saved.url.startsWith(`${UPLOAD_PUBLIC_URL}/`)) {
    // next/image only allows the UPLOAD_PUBLIC_URL host, so any other URL would show as broken.
    throw new InputError(`The upload server returned ${saved.url}, which isn't under UPLOAD_PUBLIC_URL`);
  }
  return { fileName: saved.fileName, url: saved.url };
}

/**
 * Resizes to at most 2400px, converts to WebP, then writes it to UPLOAD_DIR (or sends it to
 * UPLOAD_ENDPOINT when set) and records it.
 */
export async function saveImage(file: File, uploadedBy?: string): Promise<MediaFile> {
  if (!file.type.startsWith("image/")) throw new InputError(`${file.name} isn't an image`);
  if (file.size > MAX_UPLOAD_BYTES) throw new InputError(`${file.name} is larger than ${MAX_UPLOAD_LABEL}`);

  let converted;
  try {
    converted = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate() // respect the camera orientation
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new InputError(`${file.name} couldn't be read as an image`);
  }
  const { data, info } = converted;

  let stored: { fileName: string; url?: string };
  let localPath: string | null = null;
  if (UPLOAD_ENDPOINT) {
    stored = await sendToUploadServer(UPLOAD_ENDPOINT, data, path.parse(file.name).name || "image");
  } else {
    stored = { fileName: `${randomUUID()}.webp` };
    localPath = path.join(UPLOAD_DIR, stored.fileName);
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(localPath, data, { flag: "wx" }); // never overwrite an existing file
  }

  try {
    await connectToDatabase();
    const record = await Media.create({
      fileName: stored.fileName,
      url: stored.url,
      originalName: file.name,
      contentType: "image/webp",
      size: data.length,
      width: info.width,
      height: info.height,
      uploadedBy,
    });
    return {
      id: String(record._id),
      url: urlFor(stored),
      name: file.name,
      size: data.length,
      width: info.width,
      height: info.height,
      uploadedAt: record.createdAt.toISOString(),
    };
  } catch (error) {
    // Don't leave a file on disk that the media library can't show or delete.
    if (localPath) await unlink(localPath).catch(() => {});
    throw error;
  }
}

export async function listMedia({ page = 1, limit = 48 } = {}) {
  await connectToDatabase();
  const [records, total] = await Promise.all([
    Media.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Media.countDocuments(),
  ]);
  return {
    total,
    files: records.map<MediaFile>((record) => ({
      id: String(record._id),
      url: urlFor(record),
      name: record.originalName,
      size: record.size,
      width: record.width ?? null,
      height: record.height ?? null,
      uploadedAt: record.createdAt.toISOString(),
    })),
  };
}

/**
 * Removes the file from disk and its record. Products still pointing at it will show a broken image.
 * Files on a remote upload server can't be deleted from here (it has no delete API), so only
 * their record is removed.
 */
export async function deleteMedia(id: string) {
  if (!mongoose.isValidObjectId(id)) return;
  await connectToDatabase();
  const record = await Media.findById(id).lean();
  if (!record) return;

  if (!record.url && FILE_NAME_PATTERN.test(record.fileName)) {
    await unlink(path.join(UPLOAD_DIR, record.fileName)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error; // already gone is fine
    });
  }
  await Media.deleteOne({ _id: record._id });
}

/** Streams /uploads/<file> from UPLOAD_DIR, or null when it doesn't exist. */
export async function uploadResponse(fileName: string): Promise<Response | null> {
  if (!FILE_NAME_PATTERN.test(fileName)) return null;

  const filePath = path.join(UPLOAD_DIR, fileName);
  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) return null;

  const extension = fileName.split(".").pop()!.toLowerCase();
  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
      "Content-Length": String(info.size),
      // File names are random and never reused, so they can be cached for good.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

// ---- Legacy: images uploaded before the move to disk, stored in GridFS (bucket "media") ----

const LEGACY_ID_PATTERN = /^([a-f0-9]{24})(?:\.[a-z0-9]+)?$/i;

/** Streams a GridFS image served at /media/<id>.<ext>, or null when it doesn't exist. */
export async function mediaResponse(file: string): Promise<Response | null> {
  const id = LEGACY_ID_PATTERN.exec(file)?.[1];
  if (!id) return null;

  const { connection } = await connectToDatabase();
  if (!connection.db) return null;
  const bucket = new mongoose.mongo.GridFSBucket(connection.db, { bucketName: "media" });
  const objectId = new mongoose.Types.ObjectId(id);
  const [stored] = await bucket.find({ _id: objectId }).limit(1).toArray();
  if (!stored) return null;

  return new Response(Readable.toWeb(bucket.openDownloadStream(objectId)) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": (stored.metadata?.contentType as string | undefined) ?? "application/octet-stream",
      "Content-Length": String(stored.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
