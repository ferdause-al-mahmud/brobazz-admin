"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { login } from "@/lib/actions/auth";

export function LoginForm({ returnUrl, initialError }: { returnUrl: string; initialError?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const error = state?.error ?? initialError;

  return (
    <div className="mt-7">
      <form action={action} className="grid gap-4">
        <input name="returnUrl" type="hidden" value={returnUrl} />
        <Field htmlFor="email" label="Email">
          <Input autoComplete="email" defaultValue={state?.email} id="email" name="email" required type="email" />
        </Field>
        <Field htmlFor="password" label="Password">
          <div className="relative">
            <Input
              autoComplete="current-password"
              className="pr-10"
              id="password"
              name="password"
              required
              type={showPassword ? "text" : "password"}
            />
            <button
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-muted hover:text-brand-ink"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        {error && (
          <p className="rounded-lg bg-bad-soft px-3 py-2 text-xs font-medium text-bad" role="alert">
            {error}
          </p>
        )}
        <Button className="mt-1 w-full" loading={pending} type="submit">
          Sign in
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-subtle">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      {/* A full page load on purpose: this route redirects to Google. */}
      <a
        className={buttonClass({ variant: "secondary", className: "w-full" })}
        href={`/api/auth/google/start?returnUrl=${encodeURIComponent(returnUrl)}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.83h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.24c1.9-1.75 2.96-4.33 2.96-7.34Z" fill="#4285F4" />
          <path d="M12 22c2.7 0 4.98-.9 6.64-2.43l-3.24-2.5c-.9.6-2.05.95-3.4.95-2.6 0-4.82-1.76-5.6-4.13H3.06v2.58A10 10 0 0 0 12 22Z" fill="#34A853" />
          <path d="M6.4 13.89a6 6 0 0 1 0-3.78V7.53H3.06a10 10 0 0 0 0 8.94l3.34-2.58Z" fill="#FBBC05" />
          <path d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.53L6.4 10.1C7.18 7.74 9.4 5.98 12 5.98Z" fill="#EA4335" />
        </svg>
        Continue with Google
      </a>
    </div>
  );
}
