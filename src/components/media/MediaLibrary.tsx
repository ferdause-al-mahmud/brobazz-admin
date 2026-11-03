"use client";

import Image from "next/image";
import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, ImageIcon, LoaderCircle, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/client";
import { EmptyState } from "@/components/ui/Page";
import { removeMedia, uploadImages } from "@/lib/actions/media";
import { formatBytes, formatDate } from "@/lib/format";
import type { MediaFile } from "@/lib/media";

export function MediaLibrary({ files, canDelete }: { files: MediaFile[]; canDelete: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [uploading, startUpload] = useTransition();

  const upload = (list: FileList) => {
    const formData = new FormData();
    Array.from(list).forEach((file) => formData.append("files", file));
    startUpload(async () => {
      const result = await uploadImages(formData);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(`${result.data.length} uploaded`);
        router.refresh();
      }
    });
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button loading={uploading} onClick={() => input.current?.click()}>
          {!uploading && <Upload />} Upload images
        </Button>
        <input
          accept="image/*"
          className="sr-only"
          multiple
          onChange={(event) => {
            if (event.target.files?.length) upload(event.target.files);
            event.target.value = "";
          }}
          ref={input}
          type="file"
        />
      </div>
      <Card>
        {files.length === 0 ? (
          <EmptyState description="Images you upload for products, categories and banners are kept here." icon={<ImageIcon />} title="No images yet" />
        ) : (
          <ul className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {files.map((file) => (
              <li className="group overflow-hidden rounded-xl border border-line" key={file.id}>
                <div className="relative aspect-square bg-surface-muted">
                  <Image alt={file.name} className="object-cover" fill sizes="200px" src={file.url} />
                </div>
                <div className="p-2.5">
                  <p className="truncate text-xs font-semibold text-brand-ink" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[11px] text-muted">
                    {file.width && file.height ? `${file.width}×${file.height} · ` : ""}
                    {formatBytes(file.size)} · {formatDate(file.uploadedAt)}
                  </p>
                  <div className="mt-1.5 flex gap-1">
                    <Button
                      onClick={() => {
                        navigator.clipboard
                          .writeText(file.url)
                          .then(() => toast.success("Image link copied"))
                          .catch(() => toast.error("Couldn't copy"));
                      }}
                      size="xs"
                      variant="secondary"
                    >
                      <Copy /> Copy link
                    </Button>
                    {canDelete && (
                      <ConfirmButton
                        action={() => removeMedia(file.id)}
                        aria-label={`Delete ${file.name}`}
                        description="Anything still using this image will show it as missing."
                        size="xs"
                        title="Delete this image?"
                      >
                        <Trash2 />
                      </ConfirmButton>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {uploading && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <LoaderCircle className="size-3.5 animate-spin" /> Uploading and optimising…
        </p>
      )}
    </>
  );
}
