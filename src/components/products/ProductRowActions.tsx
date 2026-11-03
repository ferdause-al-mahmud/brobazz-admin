"use client";

import { useRouter } from "next/navigation";
import { Copy, Eye, EyeOff, Pencil, Star, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ConfirmButton, useAction } from "@/components/ui/client";
import { deleteProduct, duplicateProduct, setProductActive, setProductFeatured } from "@/lib/actions/products";

export function ProductRowActions({
  id,
  name,
  isActive,
  isFeatured,
  canDelete,
}: {
  id: string;
  name: string;
  isActive: boolean;
  isFeatured: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const { pending, run } = useAction();

  return (
    <div className="flex justify-end gap-0.5">
      <ButtonLink aria-label={`Edit ${name}`} href={`/products/${encodeURIComponent(id)}`} size="icon" title="Edit" variant="ghost">
        <Pencil />
      </ButtonLink>
      <Button
        aria-label={isFeatured ? `Unfeature ${name}` : `Feature ${name}`}
        disabled={pending}
        onClick={() => run(() => setProductFeatured(id, !isFeatured))}
        size="icon"
        title={isFeatured ? "Unfeature" : "Feature"}
        variant="ghost"
      >
        <Star className={isFeatured ? "fill-brand-secondary text-brand-secondary" : undefined} />
      </Button>
      <Button
        aria-label={isActive ? `Hide ${name}` : `Show ${name}`}
        disabled={pending}
        onClick={() => run(() => setProductActive(id, !isActive))}
        size="icon"
        title={isActive ? "Hide from store" : "Show in store"}
        variant="ghost"
      >
        {isActive ? <EyeOff /> : <Eye />}
      </Button>
      <Button
        aria-label={`Duplicate ${name}`}
        disabled={pending}
        onClick={async () => {
          const result = await duplicateProduct(id);
          run(async () => result, {
            refresh: false,
            onSuccess: () => result.ok && router.push(`/products/${encodeURIComponent(result.data)}`),
          });
        }}
        size="icon"
        title="Duplicate"
        variant="ghost"
      >
        <Copy />
      </Button>
      {canDelete && (
        <ConfirmButton
          action={() => deleteProduct(id)}
          aria-label={`Delete ${name}`}
          description="This can't be undone. Products that appear in orders can only be hidden."
          size="icon"
          title={`Delete ${name}?`}
        >
          <Trash2 />
        </ConfirmButton>
      )}
    </div>
  );
}
