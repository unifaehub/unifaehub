export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePageLimit(
  pageRaw?: string,
  limitRaw?: string,
  defaultLimit: number = DEFAULT_LIMIT,
  maxLimit: number = MAX_LIMIT,
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(String(pageRaw ?? '1'), 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(String(limitRaw ?? String(defaultLimit)), 10) || defaultLimit),
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function toPaginated<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return { data, total, page, limit };
}
