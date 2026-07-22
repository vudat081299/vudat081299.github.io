import { useEffect, useMemo, useState } from "react";

export interface Paged<T> {
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  pageItems: T[];
  total: number;
  /** 1-based index of the first item on this page (0 when empty) */
  from: number;
  /** 1-based index of the last item on this page */
  to: number;
}

/** Slice a list into pages; clamps the current page when the list shrinks. */
export function usePagination<T>(items: T[], pageSize: number): Paged<T> {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return {
    page,
    setPage,
    totalPages,
    pageItems,
    total,
    from: total === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(total, page * pageSize),
  };
}
