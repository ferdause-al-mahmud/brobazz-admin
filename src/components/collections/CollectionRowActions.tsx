"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Home, Pencil, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmButton, useAction } from "@/components/ui/client";
import { deleteCollection, moveCollection, setCollectionFlag } from "@/lib/actions/collections";
import { cn } from "@/lib/cn";

export function CollectionRowActions({
  id,
  name,
  isActive,
  showOnHome,
  isFirst,
  isLast,
  canDelete,
}: {
  id: string;
  name: string;
  isActive: boolean;
  showOnHome: boolean;
  isFirst: boolean;
  isLast: boolean;
  canDelete: boolean;
}) {
  const { pending, run } = useAction();

  return (
    <div className="flex justify-end gap-0.5">
      <Button aria-label="Move up" disabled={isFirst || pending} onClick={() => run(() => moveCollection(id, -1))} size="icon" variant="ghost">
        <ArrowUp />
      </Button>
      <Button aria-label="Move down" disabled={isLast || pending} onClick={() => run(() => moveCollection(id, 1))} size="icon" variant="ghost">
        <ArrowDown />
      </Button>
      <Button
        aria-label={showOnHome ? "Remove from homepage" : "Show on homepage"}
        disabled={pending}
        onClick={() => run(() => setCollectionFlag(id, "showOnHome", !showOnHome))}
        size="icon"
        title={showOnHome ? "Remove from homepage" : "Show on homepage"}
        variant="ghost"
      >
        <Home className={cn(showOnHome && "text-brand-secondary")} />
      </Button>
      <Button
        aria-label={isActive ? "Turn off" : "Turn on"}
        disabled={pending}
        onClick={() => run(() => setCollectionFlag(id, "isActive", !isActive))}
        size="icon"
        title={isActive ? "Turn off" : "Turn on"}
        variant="ghost"
      >
        {isActive ? <EyeOff /> : <Eye />}
      </Button>
      <ButtonLink aria-label={`Edit ${name}`} href={`/collections/${id}`} size="icon" variant="ghost">
        <Pencil />
      </ButtonLink>
      {canDelete && (
        <ConfirmButton action={() => deleteCollection(id)} aria-label={`Delete ${name}`} description="Products in it aren't affected." size="icon" title={`Delete ${name}?`}>
          <Trash2 />
        </ConfirmButton>
      )}
    </div>
  );
}
