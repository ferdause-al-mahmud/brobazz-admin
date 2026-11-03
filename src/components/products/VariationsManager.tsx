"use client";

import { useState } from "react";
import { Pencil, Plus, SlidersHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Field, Input } from "@/components/ui/Field";
import { ConfirmButton, Modal, useAction } from "@/components/ui/client";
import { EmptyState } from "@/components/ui/Page";
import { addStarterAttributes, deleteAttribute, saveAttribute, type AttributeInput } from "@/lib/actions/catalog";
import { PRODUCT_TYPES, productTypeLabels } from "@/lib/store-definitions";
import type { AttributePreset } from "./ProductForm";

export function VariationsManager({ presets }: { presets: AttributePreset[] }) {
  const [editing, setEditing] = useState<{ id: string | null; input: AttributeInput } | null>(null);
  const { pending, run } = useAction();

  const openNew = () => setEditing({ id: null, input: { name: "", values: [], productTypes: [] } });

  return (
    <>
      <div className="mb-4 flex justify-end gap-2">
        {presets.length > 0 && (
          <Button onClick={openNew}>
            <Plus /> Add variation
          </Button>
        )}
      </div>

      {presets.length === 0 ? (
        <Card>
          <EmptyState
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button loading={pending} onClick={() => run(addStarterAttributes)} variant="gold">
                  <Sparkles /> Add common sizes and colours
                </Button>
                <Button onClick={openNew} variant="secondary">
                  <Plus /> Create one
                </Button>
              </div>
            }
            description="For example Size (S–XXL) for clothing, Belt size (30–42) for belts, or Colour for both."
            icon={<SlidersHorizontal />}
            title="No variations yet"
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {presets.map((preset) => (
            <Card className="flex flex-col p-5" key={preset.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold text-brand-ink">{preset.name}</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    {preset.productTypes.length
                      ? preset.productTypes.map((type) => productTypeLabels[type as "leather"]).join(", ")
                      : "All product types"}
                  </p>
                </div>
                <div className="flex gap-0.5">
                  <Button
                    aria-label={`Edit ${preset.name}`}
                    onClick={() =>
                      setEditing({
                        id: preset.id,
                        input: { name: preset.name, values: preset.values, productTypes: preset.productTypes as AttributeInput["productTypes"] },
                      })
                    }
                    size="icon"
                    variant="ghost"
                  >
                    <Pencil />
                  </Button>
                  <ConfirmButton action={() => deleteAttribute(preset.id)} aria-label={`Delete ${preset.name}`} description="Products that already use these values keep them." size="icon" title={`Delete ${preset.name}?`}>
                    <Trash2 />
                  </ConfirmButton>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {preset.values.map((value) => (
                  <Badge key={value} tone="brand">
                    {value}
                  </Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && <AttributeDialog editing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function AttributeDialog({ editing, onClose }: { editing: { id: string | null; input: AttributeInput }; onClose: () => void }) {
  const [input, setInput] = useState(editing.input);
  const [draft, setDraft] = useState("");
  const { pending, run } = useAction();

  const addValues = (raw: string) => {
    const next = raw.split(",").map((value) => value.trim()).filter((value) => value && !input.values.includes(value));
    setInput((current) => ({ ...current, values: [...current.values, ...next] }));
    setDraft("");
  };

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            loading={pending}
            onClick={() => {
              const values = draft.trim() ? [...input.values, ...draft.split(",").map((v) => v.trim()).filter(Boolean)] : input.values;
              run(() => saveAttribute({ ...input, values }, editing.id), { onSuccess: onClose });
            }}
          >
            Save
          </Button>
        </>
      }
      onClose={onClose}
      open
      title={editing.id ? `Edit ${editing.input.name}` : "New variation"}
    >
      <div className="grid gap-4">
        <Field htmlFor="attr-name" label="Name">
          <Input autoFocus id="attr-name" onChange={(event) => setInput({ ...input, name: event.target.value })} placeholder="Size" value={input.name} />
        </Field>
        <Field hint="Type a value and press Enter, or paste a comma-separated list." label="Values">
          <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line-strong px-2 py-1.5 focus-within:border-brand-primary">
            {input.values.map((value) => (
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-primary/8 py-0.5 pl-2 pr-1 text-xs font-semibold" key={value}>
                {value}
                <button
                  aria-label={`Remove ${value}`}
                  className="grid size-4 place-items-center rounded text-muted hover:text-bad"
                  onClick={() => setInput({ ...input, values: input.values.filter((item) => item !== value) })}
                  type="button"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <input
              className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none"
              onChange={(event) => (event.target.value.includes(",") ? addValues(event.target.value) : setDraft(event.target.value))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addValues(draft);
                }
              }}
              placeholder="S, M, L"
              value={draft}
            />
          </div>
        </Field>
        <Field hint="Leave both unticked to suggest it for every product." label="Suggest for">
          <div className="flex gap-5">
            {PRODUCT_TYPES.map((type) => (
              <Checkbox
                checked={input.productTypes.includes(type)}
                key={type}
                label={productTypeLabels[type]}
                onChange={(event) =>
                  setInput({
                    ...input,
                    productTypes: event.target.checked ? [...input.productTypes, type] : input.productTypes.filter((item) => item !== type),
                  })
                }
              />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}
