import type { PaginationMeta } from "@/Shared/Schemas/Common";

export function toSkipTake(page: number, limit: number) {
  return { skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
