import "server-only";
import mongoose from "mongoose";
import { AuthError } from "@/lib/auth/session";

// Every server action returns one of these, so forms can show the message without try/catch.
export type ActionResult<T = null> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** A problem with what the user entered; its message is shown to them. */
export class InputError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

/** Runs an action body and turns expected failures into a readable ActionResult. */
export async function runAction<T>(body: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await body(), message };
  } catch (error) {
    if (error instanceof AuthError || error instanceof InputError) {
      return {
        ok: false,
        error: error.message,
        fieldErrors: error instanceof InputError ? error.fieldErrors : undefined,
      };
    }
    if (error instanceof mongoose.Error.ValidationError) {
      const fieldErrors = Object.fromEntries(
        Object.entries(error.errors).map(([path, detail]) => [path, detail.message]),
      );
      return { ok: false, error: "Some fields need attention", fieldErrors };
    }
    if ((error as { code?: number }).code === 11000) {
      const key = Object.keys((error as { keyValue?: object }).keyValue ?? {})[0] ?? "value";
      return { ok: false, error: `That ${key === "_id" ? "code" : key} is already in use` };
    }
    // Next's redirect()/notFound() work by throwing; let them through.
    if (error && typeof error === "object" && "digest" in error) throw error;

    console.error("Admin action failed", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
