"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Boxes,
  ExternalLink,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  Layers,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareText,
  Package,
  PackagePlus,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  TicketPercent,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { NAVIGATION, type NavIcon, type NavItem } from "@/lib/navigation";
import { logout } from "@/lib/actions/auth";

const icons: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  products: Package,
  add: PackagePlus,
  variations: SlidersHorizontal,
  categories: FolderTree,
  collections: Layers,
  stock: Boxes,
  customers: Users,
  reviews: MessageSquareText,
  coupons: TicketPercent,
  content: Megaphone,
  media: ImageIcon,
  settings: Settings,
  staff: ShieldCheck,
};

export type SidebarUser = { name: string; email: string; role: "admin" | "moderator"; avatar: string | null };
export type SidebarCounts = Partial<Record<NonNullable<NavItem["badge"]>, number>>;

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function Sidebar({
  user,
  counts,
  storefrontUrl,
}: {
  user: SidebarUser;
  counts: SidebarCounts;
  storefrontUrl: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // /products/new must not also light up "All products"; the most specific match wins.
  const items = NAVIGATION.flatMap((group) => group.items);
  const activeHref = items
    .filter((item) => isActive(pathname, item))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-brand-ink px-4 text-white lg:hidden">
        <Link className="flex items-center gap-2.5" href="/dashboard">
          <Image alt="" className="rounded-md bg-white" height={28} src="/logo.png" width={28} />
          <span className="text-sm font-bold">Brobazz Admin</span>
        </Link>
        <button
          aria-expanded={open}
          aria-label="Open menu"
          className="grid size-9 place-items-center rounded-lg hover:bg-white/10"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-brand-ink/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-ink text-white transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-5">
          <Link className="flex items-center gap-3" href="/dashboard">
            <Image alt="" className="rounded-lg bg-white p-0.5" height={34} src="/logo.png" width={34} />
            <span>
              <span className="block text-[15px] font-bold leading-tight">Brobazz</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-brand-secondary">
                Admin
              </span>
            </span>
          </Link>
          <button
            aria-label="Close menu"
            className="grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10 lg:hidden"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-4 [scrollbar-width:thin]">
          {NAVIGATION.map((group, index) => {
            const visible = group.items.filter((item) => !item.adminOnly || user.role === "admin");
            if (!visible.length) return null;
            return (
              <div className={cn(index > 0 && "mt-5")} key={group.label ?? index}>
                {group.label && (
                  <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                    {group.label}
                  </p>
                )}
                <ul className="grid gap-0.5">
                  {visible.map((item) => {
                    const Icon = icons[item.icon];
                    const active = item.href === activeHref;
                    const count = item.badge ? counts[item.badge] : undefined;
                    return (
                      <li key={item.href}>
                        <Link
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-colors",
                            active
                              ? "bg-white/10 text-white"
                              : "text-white/65 hover:bg-white/5 hover:text-white",
                          )}
                          href={item.href}
                        >
                          {active && (
                            <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.75 rounded-r bg-brand-secondary" />
                          )}
                          <Icon
                            aria-hidden="true"
                            className={cn("size-4 shrink-0", active ? "text-brand-secondary" : "text-white/50 group-hover:text-white/80")}
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                          {count ? (
                            <span className="min-w-5 rounded-full bg-brand-secondary px-1.5 text-center text-[10px] font-bold leading-5 text-brand-ink">
                              {count > 99 ? "99+" : count}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          {storefrontUrl && (
            <a
              className="mb-2 flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold text-white/65 transition-colors hover:bg-white/5 hover:text-white"
              href={storefrontUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden="true" className="size-4 text-white/50" />
              View store
            </a>
          )}
          <div className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5">
            {user.avatar ? (
              <Image alt="" className="size-8 rounded-full" height={32} src={user.avatar} width={32} />
            ) : (
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-secondary text-xs font-bold text-brand-ink">
                {user.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{user.name}</p>
              <p className="truncate text-[11px] capitalize text-white/50">{user.role}</p>
            </div>
            <form action={logout}>
              <button
                aria-label="Sign out"
                className="grid size-8 place-items-center rounded-md text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                title="Sign out"
                type="submit"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
