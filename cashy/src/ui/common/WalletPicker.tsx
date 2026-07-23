import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Wallet } from "@/domain/types";
import { Popover } from "@/ui/kit/Popover";
import { Icon } from "@/ui/kit/icons";

/**
 * A wallet picker — the flat sibling of `CategorySelect`. Wallets aren't a tree,
 * so this is a plain list in a Popover: a neutral icon tile + name per row. The
 * chosen wallet shows in the trigger with the same tile, so the field reads the
 * same closed as open. `excludeId` drops one wallet from the list (a transfer's
 * other leg — you can't send money to the same wallet).
 */
export function WalletPicker({
  id,
  wallets,
  value,
  onChange,
  allowNone = true,
  placeholder = "No wallet",
  excludeId,
}: {
  id?: string;
  wallets: Wallet[];
  value: string | null;
  onChange: (id: string | null) => void;
  allowNone?: boolean;
  placeholder?: string;
  excludeId?: string;
}) {
  const options = useMemo(
    () =>
      wallets
        .filter((w) => w.id !== excludeId)
        .sort((a, b) => Number(a.archived) - Number(b.archived) || a.order - b.order),
    [wallets, excludeId],
  );
  const selected = value ? (wallets.find((w) => w.id === value) ?? null) : null;

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
                <WalletTile w={selected} />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selected.name}
                </span>
              </>
            ) : (
              <span style={{ flex: 1, color: "var(--wb-fg-muted)" }}>{placeholder}</span>
            )}
            <span className="wb-ico wb-ico--sm" style={{ color: "var(--wb-fg-muted)", flex: "none" }}>
              expand_more
            </span>
          </button>
        )}
      >
        {({ close }) => (
          <div
            className="wb-menu"
            style={{ border: 0, boxShadow: "none", padding: 0, background: "none", maxHeight: 260, overflowY: "auto" }}
          >
            {allowNone && (
              <button
                type="button"
                className="wb-menu__item"
                onClick={() => {
                  onChange(null);
                  close();
                }}
                style={{ color: "var(--wb-fg-muted)" }}
              >
                <span style={{ flex: 1 }}>{placeholder}</span>
                {value === null && <span className="wb-ico wb-ico--xs">check</span>}
              </button>
            )}
            {options.map((w) => (
              <button
                key={w.id}
                type="button"
                className="wb-menu__item"
                style={{ gap: 8 }}
                onClick={() => {
                  onChange(w.id);
                  close();
                }}
              >
                <WalletTile w={w} />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {w.name}
                  {w.archived && <span style={{ color: "var(--wb-fg-muted)" }}> · archived</span>}
                </span>
                {value === w.id && <span className="wb-ico wb-ico--xs">check</span>}
              </button>
            ))}
            {options.length === 0 && (
              <div style={{ padding: 12, textAlign: "center", fontSize: 12, color: "var(--wb-fg-muted)" }}>
                No wallets — add one on the Wallets screen.
              </div>
            )}
          </div>
        )}
      </Popover>
    </div>
  );
}

/** The small neutral icon chip shared by the trigger and every row. */
function WalletTile({ w }: { w: Wallet }) {
  return (
    <span className="cashy-tile" style={{ width: 22, height: 22, flex: "none" }}>
      <Icon name={w.icon} size={13} />
    </span>
  );
}
