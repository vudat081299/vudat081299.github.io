import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Category, TxType } from "@/domain/types";
import { flattenTree, type FlatNode } from "@/domain";
import { Popover } from "@/ui/kit/Popover";
import { Icon } from "@/ui/kit/icons";

/**
 * The category picker — a tree, not a flat dropdown. A native `<select>` can only
 * fake hierarchy with leading spaces, which don't survive every OS's option
 * renderer and give the child rows no icon or colour. This shows the real thing:
 * each category on its own row, indented by depth, with its coloured icon tile,
 * and a search box on top for a long list. Parent rows are pickable too — they're
 * ordinary categories, just ones with children.
 *
 * The chosen category shows in the trigger with the same tile, so the field reads
 * the same closed as open.
 */
export function CategorySelect({
  id,
  categories,
  type,
  value,
  onChange,
}: {
  id?: string;
  categories: Category[];
  /** only categories of this side of the ledger are offered */
  type: TxType;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const nodes = useMemo(() => flattenTree(categories, type), [categories, type]);
  const selected = value ? (categories.find((c) => c.id === value) ?? null) : null;

  // Match the panel to the field's width so the dropdown lines up under it rather
  // than floating at some arbitrary fixed size. The field width only changes with
  // the modal, so a ResizeObserver covers every case cheaply.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [panelW, setPanelW] = useState<number>();
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setPanelW(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef}>
      <Popover
        panelWidth={panelW}
        trigger={({ open, toggle }) => (
          <button
            id={id}
            type="button"
            className="wb-input"
            onClick={toggle}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              cursor: "pointer",
              textAlign: "left",
              borderColor: open ? "var(--wb-fg)" : undefined,
            }}
          >
            {selected ? (
              <>
                <CatTile cat={selected} />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selected.name}
                </span>
              </>
            ) : (
              <span style={{ flex: 1, color: "var(--wb-fg-muted)" }}>Uncategorised</span>
            )}
            <span
              className="wb-ico wb-ico--sm"
              style={{ color: "var(--wb-fg-muted)", flex: "none" }}
            >
              expand_more
            </span>
          </button>
        )}
      >
        {({ close }) => (
          <CategoryPanel
            nodes={nodes}
            categories={categories}
            value={value}
            onPick={(cid) => {
              onChange(cid);
              close();
            }}
          />
        )}
      </Popover>
    </div>
  );
}

/** The small coloured icon chip shared by the trigger and every row. */
function CatTile({ cat }: { cat: Category }) {
  return (
    <span
      className="cashy-tile"
      style={{ width: 22, height: 22, color: cat.colorHex, flex: "none" }}
    >
      <Icon name={cat.icon} size={13} />
    </span>
  );
}

function CategoryPanel({
  nodes,
  categories,
  value,
  onPick,
}: {
  nodes: FlatNode[];
  categories: Category[];
  value: string | null;
  onPick: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  // The panel remounts on every open, so focusing here lands the caret in the
  // search box each time it opens — start typing to filter immediately.
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const visible = useMemo(() => filterNodes(nodes, categories, query), [nodes, categories, query]);

  return (
    <div>
      <div style={{ padding: "2px 2px 6px" }}>
        <input
          ref={searchRef}
          className="wb-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search categories…"
          style={{ fontSize: 13, padding: "6px 10px" }}
        />
      </div>
      <div
        className="wb-menu"
        style={{
          border: 0,
          boxShadow: "none",
          padding: 0,
          background: "none",
          maxHeight: 260,
          overflowY: "auto",
        }}
      >
        <button
          type="button"
          className="wb-menu__item"
          onClick={() => onPick(null)}
          style={{ color: "var(--wb-fg-muted)" }}
        >
          <span style={{ flex: 1 }}>Uncategorised</span>
          {value === null && <span className="wb-ico wb-ico--xs">check</span>}
        </button>
        {visible.map(({ cat, depth }) => (
          <button
            key={cat.id}
            type="button"
            className="wb-menu__item"
            // Indent by depth so nesting reads at a glance; the search results keep
            // their depth too, so a matched child still sits under its parent.
            style={{ paddingLeft: 10 + depth * 16 }}
            onClick={() => onPick(cat.id)}
          >
            <CatTile cat={cat} />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {cat.name}
            </span>
            {value === cat.id && <span className="wb-ico wb-ico--xs">check</span>}
          </button>
        ))}
        {visible.length === 0 && (
          <div
            style={{ padding: 12, textAlign: "center", fontSize: 12, color: "var(--wb-fg-muted)" }}
          >
            No categories found
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Filter the flattened tree to names matching `query`, but keep each match's
 * ancestors so a matched child never appears orphaned from its parent. Empty
 * query returns the whole tree unchanged.
 */
function filterNodes(nodes: FlatNode[], categories: Category[], query: string): FlatNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  const byId = new Map(categories.map((c) => [c.id, c] as const));
  const keep = new Set<string>();
  for (const { cat } of nodes) {
    if (!cat.name.toLowerCase().includes(q)) continue;
    let cur: Category | undefined = cat;
    while (cur) {
      keep.add(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
  }
  return nodes.filter((n) => keep.has(n.cat.id));
}
