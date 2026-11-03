"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SingleImagePicker } from "@/components/media/ImagePicker";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, PrefixInput, Switch, Textarea } from "@/components/ui/Field";
import {
  saveContentSettings,
  saveGeneralSettings,
  saveShippingSettings,
  type ContentSettings,
  type GeneralSettings,
  type ShippingSettings,
} from "@/lib/actions/settings";

type Result = { ok: true; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Local form state plus a save that reports field errors. */
function useSettingsForm<T>(initial: T, action: (value: T) => Promise<Result>) {
  const [value, setValue] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [dirty, setDirty] = useState(false);

  const update = (patch: Partial<T>) => {
    setValue((current) => ({ ...current, ...patch }));
    setDirty(true);
  };
  const save = () =>
    startSaving(async () => {
      const result = await action(value);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      setErrors({});
      setDirty(false);
      toast.success(result.message);
    });

  return { value, update, errors, saving, save, dirty };
}

function SaveBar({ dirty, saving, onSave, label = "Save" }: { dirty: boolean; saving: boolean; onSave: () => void; label?: string }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-3">
      {dirty && <span className="text-xs text-muted">Unsaved changes</span>}
      <Button disabled={!dirty} loading={saving} onClick={onSave}>
        {label}
      </Button>
    </div>
  );
}

function move<T>(list: T[], index: number, by: number) {
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(index + by, 0, item);
  return next;
}

export function GeneralSettingsForm({ initial }: { initial: GeneralSettings }) {
  const { value, update, errors, saving, save, dirty } = useSettingsForm(initial, saveGeneralSettings);

  return (
    <Card>
      <CardHeader description="Shown in the storefront header, footer, invoices and the WhatsApp order button." title="Store details" />
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <Field error={errors.storeName} htmlFor="store-name" label="Store name">
          <Input id="store-name" onChange={(event) => update({ storeName: event.target.value })} value={value.storeName} />
        </Field>
        <Field htmlFor="store-tagline" label="Tagline" optional>
          <Input id="store-tagline" onChange={(event) => update({ tagline: event.target.value })} value={value.tagline} />
        </Field>
        <Field htmlFor="store-phone" label="Support phone">
          <Input id="store-phone" onChange={(event) => update({ supportPhone: event.target.value })} placeholder="+8801…" value={value.supportPhone} />
        </Field>
        <Field hint="With country code, e.g. 8801760821140." htmlFor="store-whatsapp" label="WhatsApp number">
          <Input id="store-whatsapp" onChange={(event) => update({ whatsapp: event.target.value })} value={value.whatsapp} />
        </Field>
        <Field error={errors.supportEmail} htmlFor="store-email" label="Support email" optional>
          <Input id="store-email" onChange={(event) => update({ supportEmail: event.target.value })} type="email" value={value.supportEmail} />
        </Field>
        <Field htmlFor="store-address" label="Address" optional>
          <Input id="store-address" onChange={(event) => update({ address: event.target.value })} value={value.address} />
        </Field>
        {(["facebook", "instagram", "tiktok", "youtube"] as const).map((network) => (
          <Field error={errors[`socials.${network}`]} htmlFor={`social-${network}`} key={network} label={network[0].toUpperCase() + network.slice(1)} optional>
            <Input
              id={`social-${network}`}
              onChange={(event) => update({ socials: { ...value.socials, [network]: event.target.value } })}
              placeholder="https://"
              value={value.socials[network]}
            />
          </Field>
        ))}
        <Field className="sm:col-span-2" hint="Shown under “Shipping” on every product page." htmlFor="policy-shipping" label="Shipping information">
          <Textarea id="policy-shipping" onChange={(event) => update({ shippingPolicy: event.target.value })} value={value.shippingPolicy} />
        </Field>
        <Field className="sm:col-span-2" htmlFor="policy-returns" label="Returns & exchanges" optional>
          <Textarea id="policy-returns" onChange={(event) => update({ returnPolicy: event.target.value })} value={value.returnPolicy} />
        </Field>
      </CardBody>
      <SaveBar dirty={dirty} onSave={save} saving={saving} />
    </Card>
  );
}

export function ShippingSettingsForm({ initial }: { initial: ShippingSettings }) {
  const { value, update, errors, saving, save, dirty } = useSettingsForm(initial, saveShippingSettings);
  const setOption = (index: number, patch: Partial<ShippingSettings["shippingOptions"][number]>) =>
    update({ shippingOptions: value.shippingOptions.map((option, i) => (i === index ? { ...option, ...patch } : option)) });

  return (
    <Card>
      <CardHeader description="Delivery areas and charges customers choose from at checkout." title="Delivery" />
      <CardBody className="grid gap-4">
        {errors.shippingOptions && <p className="text-xs text-bad">{errors.shippingOptions}</p>}
        {value.shippingOptions.map((option, index) => (
          <div className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_120px_auto]" key={index}>
            <Field error={errors[`shippingOptions.${index}.label`]} label="Area">
              <Input onChange={(event) => setOption(index, { label: event.target.value })} placeholder="Inside Dhaka" value={option.label} />
            </Field>
            <Field label="Delivery time / note">
              <Input onChange={(event) => setOption(index, { eta: event.target.value })} placeholder="Delivered in 24–48 hours" value={option.eta} />
            </Field>
            <Field error={errors[`shippingOptions.${index}.cost`]} label="Charge">
              <PrefixInput min={0} onChange={(event) => setOption(index, { cost: Number(event.target.value) })} prefix="৳" type="number" value={option.cost} />
            </Field>
            <div className="flex items-end gap-1 pb-1">
              <label className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-ink">
                <input checked={option.isActive} className="size-4 accent-brand-primary" onChange={(event) => setOption(index, { isActive: event.target.checked })} type="checkbox" />
                On
              </label>
              <Button aria-label="Move up" disabled={index === 0} onClick={() => update({ shippingOptions: move(value.shippingOptions, index, -1) })} size="icon" variant="ghost">
                <ArrowUp />
              </Button>
              <Button
                aria-label="Remove"
                // Saved options are referenced by past orders; turn them off instead.
                disabled={Boolean(initial.shippingOptions.find((saved) => saved.value === option.value && option.value))}
                onClick={() => update({ shippingOptions: value.shippingOptions.filter((_, i) => i !== index) })}
                size="icon"
                title="Saved options can only be turned off"
                variant="danger-ghost"
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
        <div>
          <Button onClick={() => update({ shippingOptions: [...value.shippingOptions, { value: "", label: "", eta: "", cost: 0, isActive: true }] })} size="sm" variant="secondary">
            <Plus /> Add delivery area
          </Button>
        </div>
        <Field error={errors.freeShippingThreshold} hint="Orders with a subtotal at or above this ship free. Leave empty to turn off." htmlFor="free-threshold" label="Free delivery over" optional>
          <div className="max-w-56">
            <PrefixInput
              id="free-threshold"
              min={0}
              onChange={(event) => update({ freeShippingThreshold: event.target.value === "" ? null : Number(event.target.value) })}
              prefix="৳"
              type="number"
              value={value.freeShippingThreshold ?? ""}
            />
          </div>
        </Field>
      </CardBody>
      <SaveBar dirty={dirty} onSave={save} saving={saving} />
    </Card>
  );
}

export function ContentSettingsForm({ initial }: { initial: ContentSettings }) {
  const { value, update, errors, saving, save, dirty } = useSettingsForm(initial, saveContentSettings);
  const setAnnouncement = (index: number, patch: Partial<ContentSettings["announcements"][number]>) =>
    update({ announcements: value.announcements.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  const setSlide = (index: number, patch: Partial<ContentSettings["heroSlides"][number]>) =>
    update({ heroSlides: value.heroSlides.map((item, i) => (i === index ? { ...item, ...patch } : item)) });

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader description="The scrolling strip at the very top of every page. Messages can be in Bangla or English." title="Announcement bar" />
        <CardBody className="grid gap-3">
          {value.announcements.map((announcement, index) => (
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto]" key={index}>
              <Input aria-label="Message" onChange={(event) => setAnnouncement(index, { text: event.target.value })} placeholder="Free delivery over ৳3,000" value={announcement.text} />
              <Input
                aria-invalid={Boolean(errors[`announcements.${index}.link`])}
                aria-label="Link"
                onChange={(event) => setAnnouncement(index, { link: event.target.value })}
                placeholder="Link (optional), e.g. /collections/eid"
                title={errors[`announcements.${index}.link`]}
                value={announcement.link}
              />
              <div className="flex items-center gap-1">
                <label className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold">
                  <input checked={announcement.isActive} className="size-4 accent-brand-primary" onChange={(event) => setAnnouncement(index, { isActive: event.target.checked })} type="checkbox" />
                  On
                </label>
                <Button aria-label="Move up" disabled={index === 0} onClick={() => update({ announcements: move(value.announcements, index, -1) })} size="icon" variant="ghost">
                  <ArrowUp />
                </Button>
                <Button aria-label="Move down" disabled={index === value.announcements.length - 1} onClick={() => update({ announcements: move(value.announcements, index, 1) })} size="icon" variant="ghost">
                  <ArrowDown />
                </Button>
                <Button aria-label="Remove" onClick={() => update({ announcements: value.announcements.filter((_, i) => i !== index) })} size="icon" variant="danger-ghost">
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
          {value.announcements.length === 0 && <p className="text-sm text-muted">No messages: the storefront shows its built-in promotions.</p>}
          <div>
            <Button onClick={() => update({ announcements: [...value.announcements, { text: "", link: "", isActive: true }] })} size="sm" variant="secondary">
              <Plus /> Add message
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader description="The full-width banner at the top of the homepage. The first active banner is shown." title="Hero banner" />
        <CardBody className="grid gap-4">
          {value.heroSlides.map((slide, index) => (
            <div className="grid gap-4 rounded-xl border border-line p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" key={index}>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                <Field error={errors[`heroSlides.${index}.image`]} label="Desktop image (wide)">
                  <SingleImagePicker aspect="aspect-[16/7]" onChange={(image) => setSlide(index, { image: image ?? "" })} value={slide.image || null} />
                </Field>
                <Field label="Mobile image" optional>
                  <SingleImagePicker aspect="aspect-[4/5]" onChange={(mobileImage) => setSlide(index, { mobileImage })} value={slide.mobileImage} />
                </Field>
              </div>
              <div className="grid content-start gap-3">
                <Field label="Headline" optional>
                  <Input onChange={(event) => setSlide(index, { title: event.target.value })} value={slide.title} />
                </Field>
                <Field label="Text" optional>
                  <Input onChange={(event) => setSlide(index, { subtitle: event.target.value })} value={slide.subtitle} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Button label" optional>
                    <Input onChange={(event) => setSlide(index, { ctaLabel: event.target.value })} placeholder="Shop now" value={slide.ctaLabel} />
                  </Field>
                  <Field error={errors[`heroSlides.${index}.ctaHref`]} label="Button link" optional>
                    <Input onChange={(event) => setSlide(index, { ctaHref: event.target.value })} placeholder="/collections/new-arrivals" value={slide.ctaHref} />
                  </Field>
                </div>
                <div className="flex items-center justify-between">
                  <Switch checked={slide.isActive} label="Active" onChange={(event) => setSlide(index, { isActive: event.target.checked })} />
                  <div className="flex gap-1">
                    <Button aria-label="Move up" disabled={index === 0} onClick={() => update({ heroSlides: move(value.heroSlides, index, -1) })} size="icon" variant="ghost">
                      <ArrowUp />
                    </Button>
                    <Button aria-label="Remove banner" onClick={() => update({ heroSlides: value.heroSlides.filter((_, i) => i !== index) })} size="icon" variant="danger-ghost">
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {value.heroSlides.length === 0 && <p className="text-sm text-muted">No banner set: the storefront shows its built-in one.</p>}
          <div>
            <Button
              onClick={() =>
                update({ heroSlides: [...value.heroSlides, { image: "", mobileImage: null, title: "", subtitle: "", ctaLabel: "", ctaHref: "", isActive: true }] })
              }
              size="sm"
              variant="secondary"
            >
              <Plus /> Add banner
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader description="The highlighted button at the end of the category bar. Leave the label empty to hide it." title="Menu highlight" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="spotlight-label" label="Label" optional>
            <Input id="spotlight-label" onChange={(event) => update({ navSpotlight: { ...value.navSpotlight, label: event.target.value } })} placeholder="Flash sale" value={value.navSpotlight.label} />
          </Field>
          <Field error={errors["navSpotlight.href"]} htmlFor="spotlight-href" label="Link">
            <Input id="spotlight-href" onChange={(event) => update({ navSpotlight: { ...value.navSpotlight, href: event.target.value } })} placeholder="/collections/flash-sale" value={value.navSpotlight.href} />
          </Field>
        </CardBody>
      </Card>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-background/90 backdrop-blur sm:-mx-6 lg:-mx-8">
        <SaveBar dirty={dirty} label="Save store content" onSave={save} saving={saving} />
      </div>
    </div>
  );
}
