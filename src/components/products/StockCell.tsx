"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAction } from "@/components/ui/client";
import { setStock } from "@/lib/actions/products";
import { cn } from "@/lib/cn";

/** Inline stock editor: type a number or nudge it, then save. */
export function StockCell({ productId, variantId, stock, label }: { productId: string; variantId: string | null; stock: number; label: string }) {
  const [value, setValue] = useState(stock);
  const [saved, setSaved] = useState(stock);
  const { pending, run } = useAction();
  const changed = value !== saved;

  const save = () =>
    run(() => setStock(productId, variantId, value), { onSuccess: () => setSaved(value) });

  return (
    <form
      className="flex items-center justify-end gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (changed) save();
      }}
    >
      <Button aria-label={`One less ${label}`} disabled={value <= 0} onClick={() => setValue((current) => Math.max(0, current - 1))} size="icon" variant="ghost">
        <Minus />
      </Button>
      <input
        aria-label={`Stock for ${label}`}
        className={cn(
          "h-8 w-16 rounded-md border bg-surface px-2 text-center text-sm font-semibold tabular-nums outline-none focus:border-brand-primary",
          changed ? "border-brand-secondary" : "border-line-strong",
        )}
        min={0}
        onChange={(event) => setValue(Math.max(0, Math.floor(Number(event.target.value) || 0)))}
        type="number"
        value={value}
      />
      <Button aria-label={`One more ${label}`} onClick={() => setValue((current) => current + 1)} size="icon" variant="ghost">
        <Plus />
      </Button>
      <Button aria-label="Save stock" className={cn(!changed && "invisible")} loading={pending} size="icon" type="submit" variant="primary">
        {!pending && <Check />}
      </Button>
    </form>
  );
}
