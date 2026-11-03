import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-brand-ink placeholder:text-subtle transition outline-none focus:border-brand-primary focus:ring-3 focus:ring-brand-primary/12 disabled:bg-surface-muted disabled:text-muted aria-invalid:border-bad aria-invalid:focus:ring-bad/12";

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
  optional,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  optional?: boolean;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <label className="text-xs font-semibold text-brand-ink" htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 font-normal text-subtle">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-bad" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-10", className)} {...props} />;
}

/** An input with a fixed prefix such as "৳". */
export function PrefixInput({ prefix, className, ...props }: ComponentProps<"input"> & { prefix: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
        {prefix}
      </span>
      <input className={cn(control, "h-10 pl-7", className)} {...props} />
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(control, "h-10 appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

/** A labelled on/off switch backed by a real checkbox, so it works in plain forms too. */
export function Switch({
  label,
  description,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4", className)}>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-brand-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input className="peer sr-only" type="checkbox" {...props} />
        <span className="h-5 w-9 rounded-full bg-line-strong transition-colors peer-checked:bg-brand-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-secondary peer-disabled:opacity-50" />
        <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function Checkbox({ label, className, ...props }: Omit<ComponentProps<"input">, "type"> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-brand-ink", className)}>
      <input className="size-4 rounded border-line-strong accent-brand-primary" type="checkbox" {...props} />
      {label}
    </label>
  );
}
