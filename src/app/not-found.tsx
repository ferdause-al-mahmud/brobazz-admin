import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-primary/8 text-brand-primary">
          <SearchX className="size-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-brand-ink">Page not found</h1>
        <p className="mt-1 text-sm text-muted">It may have been moved or deleted.</p>
        <ButtonLink className="mt-6" href="/dashboard">
          Back to dashboard
        </ButtonLink>
      </div>
    </main>
  );
}
