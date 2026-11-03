"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonVariant } from "./Button";
import { cn } from "@/lib/cn";

type Result = { ok: true; message?: string } | { ok: false; error: string };

/** Runs a server action in a transition, toasting its message or error. */
export function useAction() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = (action: () => Promise<Result>, { refresh = true, onSuccess }: { refresh?: boolean; onSuccess?: () => void } = {}) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.message) toast.success(result.message);
      onSuccess?.();
      if (refresh) router.refresh();
    });

  return { pending, run };
}

/** A centred dialog built on <dialog>, so focus trapping and Escape come for free. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-2xl border border-line bg-surface p-0 text-foreground shadow-pop backdrop:bg-brand-ink/40 backdrop:backdrop-blur-[2px] open:animate-fade-in",
        { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl" }[size],
      )}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      ref={ref}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-brand-ink">{title}</h2>
              {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
            </div>
            <Button aria-label="Close" onClick={onClose} size="icon" variant="ghost">
              <X />
            </Button>
          </header>
          {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

/** A button that asks for confirmation before running a server action. */
export function ConfirmButton({
  action,
  title,
  description,
  confirmLabel = "Delete",
  children,
  variant = "danger-ghost",
  size = "sm",
  onDone,
  "aria-label": ariaLabel,
}: {
  action: () => Promise<Result>;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "xs" | "sm" | "md" | "icon";
  onDone?: () => void;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const { pending, run } = useAction();

  return (
    <>
      <Button aria-label={ariaLabel} onClick={() => setOpen(true)} size={size} variant={variant}>
        {children}
      </Button>
      <Modal
        description={description}
        footer={
          <>
            <Button onClick={() => setOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() => run(action, { onSuccess: () => (setOpen(false), onDone?.()) })}
              variant={variant === "primary" || variant === "gold" ? variant : "danger"}
            >
              {confirmLabel}
            </Button>
          </>
        }
        onClose={() => setOpen(false)}
        open={open}
        size="sm"
        title={title}
      />
    </>
  );
}

/** Search box that writes `?q=` to the URL (debounced) so server pages can filter. */
export function SearchBox({ placeholder, param = "q" }: { placeholder: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(param) ?? "");
  const [, startTransition] = useTransition();
  const timer = useRef<number | null>(null);

  const push = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) params.set(param, next.trim());
    else params.delete(param);
    params.delete("page");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  };

  return (
    <div className="relative w-full sm:w-72">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <input
        aria-label={placeholder}
        className="h-9 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-8 text-sm text-brand-ink outline-none transition placeholder:text-subtle focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/12"
        onChange={(event) => {
          setValue(event.target.value);
          if (timer.current) window.clearTimeout(timer.current);
          const next = event.target.value;
          timer.current = window.setTimeout(() => push(next), 300);
        }}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {value && (
        <button
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-subtle hover:text-brand-ink"
          onClick={() => {
            setValue("");
            push("");
          }}
          type="button"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** A <select> that writes its value to a URL param. */
export function ParamSelect({
  param,
  options,
  label,
}: {
  param: string;
  options: { value: string; label: string }[];
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <select
      aria-label={label}
      className="h-9 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-brand-ink outline-none focus:border-brand-primary"
      onChange={(event) => {
        const params = new URLSearchParams(searchParams.toString());
        if (event.target.value) params.set(param, event.target.value);
        else params.delete(param);
        params.delete("page");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }}
      value={searchParams.get(param) ?? ""}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
