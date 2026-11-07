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
  saveFooterSettings,
  saveGeneralSettings,
  saveNavbarSettings,
  saveShippingSettings,
  type ContentSettings,
  type FooterLink,
  type FooterSettings,
  type GeneralSettings,
  type NavbarSettings,
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
      <CardHeader description="Shown in the storefront navbar, footer, invoices and the WhatsApp order button." title="Store details" />
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <Field error={errors.storeName} htmlFor="store-name" label="Store name">
          <Input id="store-name" onChange={(event) => update({ storeName: event.target.value })} value={value.storeName} />
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

/** Logo upload with a note about the recommended file. */
function LogoField({ error, hint, label, onChange, value }: { error?: string; hint: string; label: string; onChange: (url: string | null) => void; value: string | null }) {
  return (
    <Field error={error} hint={hint} label={label}>
      <div className="max-w-72">
        <SingleImagePicker aspect="aspect-[5/2]" fit="contain" label="Upload logo" onChange={onChange} value={value} />
      </div>
    </Field>
  );
}

export function NavbarSettingsForm({ initial }: { initial: NavbarSettings }) {
  const { value, update, errors, saving, save, dirty } = useSettingsForm(initial, saveNavbarSettings);

  return (
    <Card>
      <CardHeader description="The bar at the top of every storefront page." title="Navbar" />
      <CardBody className="grid gap-5 sm:grid-cols-2">
        <LogoField
          error={errors.headerLogo}
          hint="Shown on a white background. A PNG with a transparent background works best. Remove it to use the built-in logo."
          label="Navbar logo"
          onChange={(headerLogo) => update({ headerLogo })}
          value={value.headerLogo}
        />
        <Field hint="Shown above the support phone number on larger screens. Leave empty to show only the number." htmlFor="nav-phone-label" label="Phone label" optional>
          <Input id="nav-phone-label" onChange={(event) => update({ phoneLabel: event.target.value })} placeholder="Order inquiry" value={value.phoneLabel} />
        </Field>
      </CardBody>
      <SaveBar dirty={dirty} onSave={save} saving={saving} />
    </Card>
  );
}

function FooterLinksEditor({
  errors,
  field,
  links,
  onChange,
}: {
  errors: Record<string, string>;
  field: "helpLinks" | "policyLinks";
  links: FooterLink[];
  onChange: (links: FooterLink[]) => void;
}) {
  const setLink = (index: number, patch: Partial<FooterLink>) => onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));

  return (
    <div className="grid gap-2">
      {links.map((link, index) => (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" key={index}>
          <Input
            aria-invalid={Boolean(errors[`${field}.${index}.label`])}
            aria-label="Label"
            onChange={(event) => setLink(index, { label: event.target.value })}
            placeholder="Label, e.g. About us"
            title={errors[`${field}.${index}.label`]}
            value={link.label}
          />
          <Input
            aria-invalid={Boolean(errors[`${field}.${index}.href`])}
            aria-label="Link"
            onChange={(event) => setLink(index, { href: event.target.value })}
            placeholder="/about or https://…"
            title={errors[`${field}.${index}.href`]}
            value={link.href}
          />
          <div className="flex items-center gap-1">
            <label className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold">
              <input checked={link.isActive} className="size-4 accent-brand-primary" onChange={(event) => setLink(index, { isActive: event.target.checked })} type="checkbox" />
              On
            </label>
            <Button aria-label="Move up" disabled={index === 0} onClick={() => onChange(move(links, index, -1))} size="icon" variant="ghost">
              <ArrowUp />
            </Button>
            <Button aria-label="Move down" disabled={index === links.length - 1} onClick={() => onChange(move(links, index, 1))} size="icon" variant="ghost">
              <ArrowDown />
            </Button>
            <Button aria-label="Remove" onClick={() => onChange(links.filter((_, i) => i !== index))} size="icon" variant="danger-ghost">
              <Trash2 />
            </Button>
          </div>
        </div>
      ))}
      {links.length === 0 && <p className="text-sm text-muted">No links: this column is hidden.</p>}
      <div>
        <Button onClick={() => onChange([...links, { label: "", href: "", isActive: true }])} size="sm" variant="secondary">
          <Plus /> Add link
        </Button>
      </div>
    </div>
  );
}

export function FooterSettingsForm({ initial, storeName }: { initial: FooterSettings; storeName: string }) {
  const { value, update, errors, saving, save, dirty } = useSettingsForm(initial, saveFooterSettings);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader description="The first footer column. The address, phone, email and social links come from Store details." title="Brand" />
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <LogoField
            error={errors.footerLogo}
            hint="Shown on the dark brand-colour background, so use a light or white version. Remove it to use the built-in logo."
            label="Footer logo"
            onChange={(footerLogo) => update({ footerLogo })}
            value={value.footerLogo}
          />
          <Field hint="A sentence or two about the store, shown under the logo." htmlFor="footer-tagline" label="Description">
            <Textarea id="footer-tagline" onChange={(event) => update({ tagline: event.target.value })} value={value.tagline} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader description="The link columns. The first one lists the categories shown in the menu, plus “All products”." title="Columns" />
        <CardBody className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field htmlFor="footer-shop-heading" label="Shop heading">
              <Input id="footer-shop-heading" onChange={(event) => update({ shopHeading: event.target.value })} placeholder="Shop" value={value.shopHeading} />
            </Field>
            <Field htmlFor="footer-help-heading" label="Help heading">
              <Input id="footer-help-heading" onChange={(event) => update({ helpHeading: event.target.value })} placeholder="Help" value={value.helpHeading} />
            </Field>
            <Field htmlFor="footer-policies-heading" label="Policies heading">
              <Input id="footer-policies-heading" onChange={(event) => update({ policiesHeading: event.target.value })} placeholder="Policies" value={value.policiesHeading} />
            </Field>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold text-brand-ink">{value.helpHeading || "Help"} links</h3>
            <FooterLinksEditor errors={errors} field="helpLinks" links={value.helpLinks} onChange={(helpLinks) => update({ helpLinks })} />
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold text-brand-ink">{value.policiesHeading || "Policies"} links</h3>
            <FooterLinksEditor errors={errors} field="policyLinks" links={value.policyLinks} onChange={(policyLinks) => update({ policyLinks })} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader description="The smaller texts at the end of the footer. The designer credit is fixed." title="Bottom texts" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field hint="The pill under the policy links. Leave empty to hide it." htmlFor="footer-badge" label="Highlight" optional>
            <Input id="footer-badge" onChange={(event) => update({ badgeText: event.target.value })} placeholder="Cash on delivery all over Bangladesh" value={value.badgeText} />
          </Field>
          <Field hint="Leave empty to use the text shown in grey." htmlFor="footer-copyright" label="Copyright line" optional>
            <Input id="footer-copyright" onChange={(event) => update({ copyright: event.target.value })} placeholder={`© 2026 ${storeName}. All rights reserved.`} value={value.copyright} />
          </Field>
        </CardBody>
      </Card>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-background/90 backdrop-blur sm:-mx-6 lg:-mx-8">
        <SaveBar dirty={dirty} label="Save footer" onSave={save} saving={saving} />
      </div>
    </div>
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
