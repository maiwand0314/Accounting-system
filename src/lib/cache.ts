export const CACHE_TAGS = {
  dashboard: "dashboard",
  products: "products",
  movements: "movements",
  categories: "categories",
} as const;

export function companyTag(companyId: string, tag: string) {
  return `${tag}:${companyId}`;
}
