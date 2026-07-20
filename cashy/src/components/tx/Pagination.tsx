/** Compact page list: always first + last + current±1, gaps elsewhere. */
function pageList(page: number, total: number): (number | "…")[] {
  const want = new Set([1, total, page - 1, page, page + 1]);
  const nums = [...want].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const n of nums) {
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

/** `wb-pagination` control. Renders nothing for a single page. */
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="wb-pagination" aria-label="Phân trang">
      <button
        type="button"
        className="wb-page"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="Trang trước"
      >
        <span className="wb-ico wb-ico--sm">chevron_left</span>
      </button>
      {pageList(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="wb-page wb-page--gap">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={p === page ? "wb-page is-active" : "wb-page"}
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className="wb-page"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="Trang sau"
      >
        <span className="wb-ico wb-ico--sm">chevron_right</span>
      </button>
    </nav>
  );
}
