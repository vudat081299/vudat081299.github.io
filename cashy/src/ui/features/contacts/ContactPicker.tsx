import { useMemo, useState } from "react";
import { useCashy } from "@/data/store";
import { addContact } from "@/usecases";
import { activeContacts, contactLabel, CONTACT_DEFAULT_ICON } from "@/domain/contact";
import { SWATCHES } from "@/lib/palette";
import { Icon } from "@/ui/kit/icons";
import { Button } from "@/ui/kit/Button";
import { Input } from "@/ui/kit/Input";

/**
 * The contact picker — search an active contact by name/username, or create a
 * new one inline and have it selected immediately, so a caller (the loan editor
 * in slice B) never forces the user to pre-register a contact on the Contacts
 * screen first. @BR-contact-004
 *
 * A bare control, like `WalletPicker`/`CategorySelect` — it renders no label of
 * its own; the caller wraps it in its own `wb-field` + `<label>`.
 */
export function ContactPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { contacts } = useCashy();
  const [q, setQ] = useState("");
  const active = useMemo(() => activeContacts(contacts), [contacts]);
  const selected = value ? (contacts.find((c) => c.id === value) ?? null) : null;

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return active;
    return active.filter(
      (c) => c.name.toLowerCase().includes(needle) || (c.username ?? "").toLowerCase().includes(needle),
    );
  }, [active, q]);

  const trimmed = q.trim();
  const canCreate =
    trimmed.length > 0 && !active.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());

  /**
   * Create a contact from whatever's typed and select it immediately — the one
   * inline-create-and-select path @BR-contact-004 owns. `addContact` returns
   * null only when the trimmed name fails validation (empty / too long); in
   * that case leave the query as-is rather than silently clearing it.
   */
  function createAndSelect() {
    const id = addContact({
      name: trimmed,
      colorHex: SWATCHES[contacts.length % SWATCHES.length],
      icon: CONTACT_DEFAULT_ICON,
    });
    if (id) {
      onChange(id);
      setQ("");
    }
  }

  if (selected) {
    return (
      <div className="wb-cluster" style={{ gap: 8, alignItems: "center" }}>
        <span
          className="cashy-tile"
          aria-hidden="true"
          style={{ width: 22, height: 22, color: selected.colorHex, flex: "none" }}
        >
          <Icon name={selected.icon} size={13} />
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {contactLabel(selected)}
        </span>
        <Button variant="ghost" size="sm" type="button" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="wb-stack" style={{ gap: 6 }}>
      <Input
        value={q}
        placeholder="Search or create a contact…"
        onChange={(e) => setQ(e.target.value)}
      />
      {(matches.length > 0 || canCreate) && (
        <div className="wb-stack" style={{ gap: 2 }}>
          {matches.map((c) => (
            <Button
              key={c.id}
              variant="ghost"
              size="sm"
              type="button"
              style={{ justifyContent: "flex-start" }}
              onClick={() => {
                onChange(c.id);
                setQ("");
              }}
            >
              {contactLabel(c)}
            </Button>
          ))}
          {canCreate && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              style={{ justifyContent: "flex-start" }}
              onClick={createAndSelect}
            >
              <span className="wb-ico wb-ico--xs">add</span> Create &quot;{trimmed}&quot;
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
