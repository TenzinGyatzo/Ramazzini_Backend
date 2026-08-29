export const INICIO_HOY_LIST_CAP = 300;

export function applyHoyListCap<T>(items: T[]): {
  items: T[];
  total: number;
  truncated: boolean;
} {
  const total = items.length;
  const truncated = total > INICIO_HOY_LIST_CAP;
  return {
    items: truncated ? items.slice(0, INICIO_HOY_LIST_CAP) : items,
    total,
    truncated,
  };
}
