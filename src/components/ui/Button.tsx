import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-brand-primary text-white hover:bg-brand-ink shadow-sm",
  secondary: "border border-line-strong bg-surface text-brand-ink hover:border-brand-primary/50 hover:bg-surface-muted",
  ghost: "text-muted hover:bg-brand-ink/5 hover:text-brand-ink",
  danger: "bg-bad text-white hover:bg-[#962f2f] shadow-sm",
  "danger-ghost": "text-bad hover:bg-bad-soft",
  gold: "bg-brand-secondary text-brand-ink hover:bg-[#c4a12d] shadow-sm",
};

const sizes = {
  xs: "h-7 gap-1 rounded-md px-2 text-xs",
  sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
  md: "h-10 gap-2 rounded-lg px-4 text-sm",
  icon: "size-8 rounded-md",
};

export type ButtonVariant = keyof typeof variants;
type Size = keyof typeof sizes;

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  loading,
  children,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: Size; loading?: boolean }) {
  return (
    <button
      className={buttonClass({ variant, size, className })}
      disabled={loading || props.disabled}
      type={type}
      {...props}
    >
      {loading && <LoaderCircle aria-hidden="true" className="animate-spin" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: Size; children: ReactNode }) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
