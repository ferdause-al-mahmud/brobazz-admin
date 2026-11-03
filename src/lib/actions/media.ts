"use server";

import { requireStaff } from "@/lib/auth/session";
import { deleteMedia, listMedia, saveImage, type MediaFile } from "@/lib/media";
import { InputError, runAction } from "./result";

/** Uploads the `files` in the form data and returns them in the same order. */
export async function uploadImages(formData: FormData) {
  return runAction(async () => {
    const user = await requireStaff();
    const files = formData.getAll("files").filter((file): file is File => file instanceof File && file.size > 0);
    if (!files.length) throw new InputError("Choose at least one image");
    if (files.length > 12) throw new InputError("Upload up to 12 images at a time");

    const saved: MediaFile[] = [];
    for (const file of files) saved.push(await saveImage(file, user.id));
    return saved;
  });
}

export async function browseMedia(page = 1) {
  return runAction(async () => {
    await requireStaff();
    return listMedia({ page, limit: 36 });
  });
}

export async function removeMedia(id: string) {
  return runAction(async () => {
    await requireStaff({ adminOnly: true });
    await deleteMedia(id);
  }, "Image deleted");
}
