import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FolderTree, Layers, MessageSquareText } from "lucide-react";
import { ContentSettingsForm } from "@/components/settings/SettingsForms";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { getSettings } from "@/lib/data/settings";
import { Category } from "@/lib/models/Category";
import { Collection } from "@/lib/models/Collection";
import { Review } from "@/lib/models/Review";

export const metadata: Metadata = { title: "Store content" };

export default async function ContentPage() {
  await requireStaffPage({ adminOnly: true });
  await connectToDatabase();
  const [settings, homeCategories, homeCollections, featuredReviews] = await Promise.all([
    getSettings(),
    Category.countDocuments({ showOnHome: true, isActive: true }),
    Collection.countDocuments({ showOnHome: true, isActive: true }),
    Review.countDocuments({ featured: true, status: "approved" }),
  ]);

  const homepage = [
    { href: "/products/categories", icon: FolderTree, title: "Category tiles", text: `${homeCategories} categor${homeCategories === 1 ? "y" : "ies"} shown`, hint: "Turn on “Show on homepage” for a category" },
    { href: "/collections", icon: Layers, title: "Product rows", text: `${homeCollections} collection${homeCollections === 1 ? "" : "s"} shown`, hint: "Rows follow the collection order" },
    { href: "/reviews?status=approved", icon: MessageSquareText, title: "Testimonials", text: `${featuredReviews} review${featuredReviews === 1 ? "" : "s"} featured`, hint: "Feature published reviews" },
  ];

  return (
    <>
      <PageHeader description="What customers see around the products: announcements, the homepage banner and the menu highlight." title="Store content" />

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-bold text-brand-ink">Homepage sections</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {homepage.map(({ href, icon: Icon, title, text, hint }) => (
            <Link className="group" href={href} key={href}>
              <Card className="flex h-full items-start gap-3 p-4 transition-colors group-hover:border-brand-primary/40">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-primary/8 text-brand-primary">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-brand-ink">{title}</span>
                  <span className="block text-sm text-brand-ink/80">{text}</span>
                  <span className="mt-0.5 block text-xs text-muted">{hint}</span>
                </span>
                <ArrowRight className="mt-1 size-4 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-brand-primary" />
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <ContentSettingsForm initial={{ announcements: settings.announcements, heroSlides: settings.heroSlides, navSpotlight: settings.navSpotlight }} />
    </>
  );
}
