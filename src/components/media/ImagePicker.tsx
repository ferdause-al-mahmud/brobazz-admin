"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Images, Link2, LoaderCircle, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/client";
import { browseMedia } from "@/lib/actions/media";
import type { MediaFile } from "@/lib/media";
import { cn } from "@/lib/cn";
import { uploadFiles } from "./uploadFiles";

/** Uploads files and returns their URLs; shared by the gallery and single-image pickers. */
function useUpload(onUploaded: (urls: string[]) => void) {
  const [uploading, startUpload] = useTransition();
  const upload = (files: FileList | File[]) => {
    const list = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!list.length) return;
    startUpload(async () => {
      const { uploaded, errors } = await uploadFiles(list);
      errors.forEach((error) => toast.error(error));
      if (!uploaded.length) return;
      onUploaded(uploaded.map((file) => file.url));
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded`);
    });
  };
  return { uploading, upload };
}

/** Pick previously uploaded images from the media library, or paste an image URL. */
function LibraryModal({
  open,
  onClose,
  onPick,
  multiple,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (urls: string[]) => void;
  multiple: boolean;
}) {
  const [files, setFiles] = useState<MediaFile[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [loading, startLoading] = useTransition();

  const load = (nextPage: number) =>
    startLoading(async () => {
      const result = await browseMedia(nextPage);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setFiles((current) => (nextPage === 1 ? result.data.files : [...(current ?? []), ...result.data.files]));
      setTotal(result.data.total);
      setPage(nextPage);
    });

  // Load the first page the first time the dialog opens.
  const [loadedOnce, setLoadedOnce] = useState(false);
  if (open && !loadedOnce) {
    setLoadedOnce(true);
    load(1);
  }

  const toggle = (fileUrl: string) =>
    setSelected((current) =>
      current.includes(fileUrl)
        ? current.filter((item) => item !== fileUrl)
        : multiple
          ? [...current, fileUrl]
          : [fileUrl],
    );

  const finish = (urls: string[]) => {
    onPick(urls);
    setSelected([]);
    setUrl("");
    onClose();
  };

  return (
    <Modal
      description="Choose from images you've uploaded before, or use an image link."
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button disabled={!selected.length} onClick={() => finish(selected)}>
            Use {selected.length > 1 ? `${selected.length} images` : "image"}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      size="lg"
      title="Media library"
    >
      <form
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const value = url.trim();
          if (!/^(https:\/\/|\/)/.test(value)) {
            toast.error("Enter an https:// image link");
            return;
          }
          finish([value]);
        }}
      >
        <div className="relative flex-1">
          <Link2 aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <input
            aria-label="Image URL"
            className="h-9 w-full rounded-lg border border-line-strong pl-9 pr-3 text-sm outline-none focus:border-brand-primary"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
            value={url}
          />
        </div>
        <Button size="sm" type="submit" variant="secondary">
          Add link
        </Button>
      </form>

      {files === null ? (
        <div className="grid place-items-center py-16 text-muted">
          <LoaderCircle className="size-6 animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">No images uploaded yet.</p>
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {files.map((file) => {
              const index = selected.indexOf(file.url);
              return (
                <li key={file.id}>
                  <button
                    aria-pressed={index >= 0}
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-surface-muted",
                      index >= 0 ? "border-brand-primary" : "border-transparent hover:border-line-strong",
                    )}
                    onClick={() => toggle(file.url)}
                    title={file.name}
                    type="button"
                  >
                    <Image alt={file.name} className="object-cover" fill sizes="140px" src={file.url} />
                    {index >= 0 && (
                      <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                        {multiple ? index + 1 : <Check className="size-3" />}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {files.length < total && (
            <div className="mt-4 flex justify-center">
              <Button loading={loading} onClick={() => load(page + 1)} size="sm" variant="secondary">
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

/** An ordered gallery: upload, pick from the library, reorder, remove. The first image is the cover. */
export function GalleryPicker({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { uploading, upload } = useUpload((urls) => onChange([...value, ...urls]));

  const move = (index: number, by: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    onChange(next);
  };

  return (
    <div>
      <div
        className={cn(
          "grid grid-cols-3 gap-3 rounded-xl border-2 border-dashed p-3 transition-colors sm:grid-cols-4 lg:grid-cols-5",
          dragging ? "border-brand-primary bg-brand-primary/5" : "border-line",
        )}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          upload(event.dataTransfer.files);
        }}
      >
        {value.map((url, index) => (
          <div
            className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-muted"
            key={`${url}-${index}`}
          >
            <Image alt={`Image ${index + 1}`} className="object-cover" fill sizes="160px" src={url} />
            {index === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded bg-brand-ink/85 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Cover
              </span>
            )}
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <span className="flex gap-1">
                <IconButton disabled={index === 0} label="Move earlier" onClick={() => move(index, -1)}>
                  <ArrowLeft />
                </IconButton>
                <IconButton disabled={index === value.length - 1} label="Move later" onClick={() => move(index, 1)}>
                  <ArrowRight />
                </IconButton>
              </span>
              <IconButton label="Remove image" onClick={() => onChange(value.filter((_, i) => i !== index))} tone="danger">
                <Trash2 />
              </IconButton>
            </div>
          </div>
        ))}

        <button
          className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-line bg-surface-muted text-xs font-semibold text-muted transition-colors hover:border-brand-primary hover:text-brand-primary disabled:opacity-60"
          disabled={uploading}
          onClick={() => input.current?.click()}
          type="button"
        >
          {uploading ? <LoaderCircle className="size-5 animate-spin" /> : <Upload className="size-5" />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>Drag images here or upload. JPG, PNG or WebP up to 10 MB; converted to WebP.</span>
        <Button onClick={() => setLibraryOpen(true)} size="xs" variant="ghost">
          <Images /> Choose from library
        </Button>
      </div>
      <input
        accept="image/*"
        className="sr-only"
        multiple
        onChange={(event) => {
          if (event.target.files) upload(event.target.files);
          event.target.value = "";
        }}
        ref={input}
        type="file"
      />
      <LibraryModal multiple onClose={() => setLibraryOpen(false)} onPick={(urls) => onChange([...value, ...urls])} open={libraryOpen} />
    </div>
  );
}

/** A single image (category tile, size chart, banner). */
export function SingleImagePicker({
  value,
  onChange,
  aspect = "aspect-square",
  label = "Add image",
  fit = "cover",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  aspect?: string;
  label?: string;
  /** "contain" shows the whole image (logos) instead of cropping it to fill the box. */
  fit?: "cover" | "contain";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const { uploading, upload } = useUpload((urls) => onChange(urls[0] ?? null));

  return (
    <div>
      {value ? (
        <div className={cn("group relative overflow-hidden rounded-lg border border-line bg-surface-muted", aspect)}>
          <Image alt="" className={fit === "contain" ? "object-contain p-3" : "object-cover"} fill sizes="320px" src={value} />
          <div className="absolute right-1.5 top-1.5 flex gap-1">
            <IconButton label="Replace image" onClick={() => input.current?.click()}>
              <ImagePlus />
            </IconButton>
            <IconButton label="Remove image" onClick={() => onChange(null)} tone="danger">
              <Trash2 />
            </IconButton>
          </div>
        </div>
      ) : (
        <button
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-line bg-surface-muted text-xs font-semibold text-muted transition-colors hover:border-brand-primary hover:text-brand-primary",
            aspect,
          )}
          disabled={uploading}
          onClick={() => input.current?.click()}
          type="button"
        >
          {uploading ? <LoaderCircle className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
          {uploading ? "Uploading…" : label}
        </button>
      )}
      <Button className="mt-1.5" onClick={() => setLibraryOpen(true)} size="xs" variant="ghost">
        <Images /> From library
      </Button>
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) upload(event.target.files);
          event.target.value = "";
        }}
        ref={input}
        type="file"
      />
      <LibraryModal multiple={false} onClose={() => setLibraryOpen(false)} onPick={(urls) => onChange(urls[0] ?? null)} open={libraryOpen} />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "grid size-7 place-items-center rounded-md bg-white/95 shadow-sm transition-colors disabled:opacity-40 [&_svg]:size-3.5",
        tone === "danger" ? "text-bad hover:bg-bad hover:text-white" : "text-brand-ink hover:bg-brand-primary hover:text-white",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
