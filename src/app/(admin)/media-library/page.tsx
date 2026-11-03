import type { Metadata } from "next";
import { MediaLibrary } from "@/components/media/MediaLibrary";
import { PageHeader, Pagination } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { listMedia } from "@/lib/media";

export const metadata: Metadata = { title: "Media library" };

const PAGE_SIZE = 48;

export default async function MediaLibraryPage({ searchParams }: PageProps<"/media-library">) {
  const user = await requireStaffPage();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { files, total } = await listMedia({ page, limit: PAGE_SIZE });

  return (
    <>
      <PageHeader description="Uploads are resized and converted to WebP, and stored in the database so both the admin and the storefront can serve them." title="Media library" />
      <MediaLibrary canDelete={user.role === "admin"} files={files} />
      {total > PAGE_SIZE && (
        <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface">
          <Pagination hrefFor={(next) => `/media-library?page=${next}`} page={page} pageSize={PAGE_SIZE} total={total} totalPages={Math.ceil(total / PAGE_SIZE)} />
        </div>
      )}
    </>
  );
}
