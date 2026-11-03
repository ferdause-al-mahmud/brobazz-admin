"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { cn } from "@/lib/cn";

// Controls inside the row keep their own behaviour instead of opening the row's page.
const INTERACTIVE =
  "a, button, input, select, textarea, label, summary, dialog, [role='dialog']";

/**
 * A table row that opens `href` when clicked anywhere. Ctrl/⌘/middle-click opens a new tab, and
 * dragging to select text doesn't navigate. Keep a real link in the row for keyboard users.
 */
export function ClickableRow({
  href,
  className,
  ...props
}: ComponentProps<"tr"> & { href: string }) {
  const router = useRouter();

  const open = (event: MouseEvent<HTMLTableRowElement>, newTab: boolean) => {
    const target = event.target as HTMLElement;
    if (target.closest(INTERACTIVE) || window.getSelection()?.toString())
      return;
    if (newTab) window.open(href, "_blank", "noopener");
    else router.push(href);
  };

  return (
    <tr
      className={cn(
        "cursor-pointer transition-colors hover:bg-surface-muted/70 [&:last-child>td]:border-b-0",
        className,
      )}
      onAuxClick={(event) => event.button === 1 && open(event, true)}
      onClick={(event) => open(event, event.ctrlKey || event.metaKey)}
      onMouseEnter={() => router.prefetch(href)}
      {...props}
    />
  );
}
