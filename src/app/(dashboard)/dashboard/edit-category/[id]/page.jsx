import { serverFetch } from "@/app/lib/serverFetch";
import CategoryForm from "@/app/Components/Dashboard/Categories/CategoryForm";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

async function getCategory(id) {
  try {
    const res = await serverFetch(`${apiUrl}/api/categories/${id}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("Failed to fetch category");
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching category:", error);
    return null;
  }
}

export default async function EditCategoryPage({ params }) {
  const { id } = await params;
  const category = await getCategory(id);

  if (!category) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Category not found</p>
      </div>
    );
  }

  return (
    <div>
      <CategoryForm initialData={category} />
    </div>
  );
}
