import Link from "next/link";
import { cn } from "@/lib/cn";

/** Filter tabs as links, so the selection lives in the URL and works on server pages. */
export function LinkTabs({
  tabs,
  active,
}: {
  tabs: { value: string; label: string; href: string; count?: number }[];
  active: string;
}) {
  return (
    <nav aria-label="Filter" className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
      {tabs.map((tab) => {
        const selected = tab.value === active;
        return (
          <Link
            aria-current={selected ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors",
              selected
                ? "border-brand-primary text-brand-primary"
                : "border-transparent text-muted hover:text-brand-ink",
            )}
            href={tab.href}
            key={tab.value}
            scroll={false}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px]",
                  selected ? "bg-brand-primary/10" : "bg-[#eef0f4] text-muted",
                )}
              >
                {tab.count.toLocaleString()}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
