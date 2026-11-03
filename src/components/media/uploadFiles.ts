import { uploadImages } from "@/lib/actions/media";
import type { MediaFile } from "@/lib/media";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/media-config";

/**
 * Uploads images one per request, so a batch of large photos never exceeds the server action body
 * limit. Returns what was saved (in order) and a message for each file that failed.
 */
export async function uploadFiles(files: Iterable<File>) {
  const uploaded: MediaFile[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      errors.push(`${file.name} isn't an image`);
      continue;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      errors.push(`${file.name} is larger than ${MAX_UPLOAD_LABEL}`);
      continue;
    }

    const formData = new FormData();
    formData.append("files", file);
    try {
      const result = await uploadImages(formData);
      if (result.ok) uploaded.push(...result.data);
      else errors.push(`${file.name}: ${result.error}`);
    } catch {
      errors.push(`${file.name}: upload failed`);
    }
  }

  return { uploaded, errors };
}
