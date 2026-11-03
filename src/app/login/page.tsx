import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getStaffUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

const googleErrors: Record<string, string> = {
  google_login_failed: "Google sign-in failed. Please try again.",
  google_login_cancelled: "Google sign-in was cancelled.",
  google_account_conflict: "This Google account can't be linked to the existing user.",
  google_no_access: "This Google account doesn't have access to the admin panel.",
  google_unavailable: "Google sign-in isn't configured. Ask an administrator.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const returnUrl = typeof params.returnUrl === "string" ? params.returnUrl : "/dashboard";
  if (await getStaffUser()) redirect(returnUrl.startsWith("/") ? returnUrl : "/dashboard");

  const error = typeof params.error === "string" ? googleErrors[params.error] : undefined;

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-brand-primary/60 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -left-24 size-[24rem] rounded-full bg-brand-secondary/20 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <Image alt="" className="rounded-xl bg-white p-1" height={44} src="/logo.png" width={44} />
          <span className="text-lg font-bold">Brobazz</span>
        </div>
        <div className="relative max-w-md">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-secondary">Store admin</p>
          <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-[-0.03em]">
            Run the shop from one place.
          </h1>
          <p className="mt-4 text-sm leading-6 text-white/70">
            Orders, products, stock, collections and everything customers see on the storefront.
          </p>
        </div>
        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Brobazz</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image alt="" className="rounded-lg" height={40} src="/logo.png" width={40} />
            <span className="text-lg font-bold text-brand-ink">Brobazz Admin</span>
          </div>
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-brand-ink">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use your staff account to continue.</p>
          <LoginForm initialError={error} returnUrl={returnUrl} />
        </div>
      </section>
    </main>
  );
}
