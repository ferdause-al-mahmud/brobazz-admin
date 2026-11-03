import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-brand-primary"
            href={back.href}
          >
            <ChevronLeft aria-hidden="true" className="size-3.5" />
            {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-brand-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <span className="grid size-12 place-items-center rounded-full bg-brand-primary/8 text-brand-primary [&_svg]:size-6">
        {icon}
      </span>
      <h3 className="mt-3 text-sm font-bold text-brand-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs leading-5 text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Previous/next links that keep the current query string. */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
}) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const linkClass =
    "inline-flex h-8 items-center gap-1 rounded-md border border-line-strong bg-surface px-2.5 text-xs font-semibold text-brand-ink transition-colors hover:border-brand-primary/50";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-muted">
      <span>
        {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className={linkClass} href={hrefFor(page - 1)}>
            <ChevronLeft aria-hidden="true" className="size-3.5" /> Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link className={linkClass} href={hrefFor(page + 1)}>
            Next <ChevronRight aria-hidden="true" className="size-3.5" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

/** Builds "/path?a=1&b=2" from the current params plus overrides; empty values are dropped. */
export function withParams(
  path: string,
  current: Record<string, string | undefined>,
  overrides: Record<string, string | number | undefined | null>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
