import { useMemo, useState } from "react";
import { useCashy } from "@/data/store";
import { activeContacts, sortedContacts } from "@/domain/contact";
import type { Contact } from "@/domain/types";
import { PageHeader } from "@/ui/common/PageHeader";
import { Button } from "@/ui/kit/Button";
import { ContactCard } from "@/ui/features/contacts/ContactCard";
import { ContactEditor } from "./ContactEditor";

/** Contacts screen: view/add/edit/archive/delete the people you lend to or
 *  borrow from — a card grid split Active / Archived + an inline editor modal.
 *  Mirrors `Wallets.tsx` and reuses `CardIdentity` via `ContactCard`. @ADR-contact-006 */
export function Contacts() {
  const { contacts } = useCashy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const active = useMemo(() => activeContacts(contacts), [contacts]);
  const archived = useMemo(() => sortedContacts(contacts.filter((c) => c.archived)), [contacts]);

  function openAdd() { setEditing(null); setOpen(true); }
  function openEdit(id: string) { setEditing(contacts.find((c) => c.id === id) ?? null); setOpen(true); }

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} ${contacts.length === 1 ? "person" : "people"} · who you lend to / borrow from`}
        actions={
          <Button round type="button" onClick={openAdd}>
            <span className="wb-ico wb-ico--xs">add</span> Add contact
          </Button>
        }
      />
      {contacts.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: "2px 0 0" }}>
          No contacts yet — add someone you lend to or borrow from.
        </p>
      ) : (
        <>
          <div className="cashy-loangrid">
            {active.map((c) => <ContactCard key={c.id} contact={c} onEdit={openEdit} />)}
          </div>
          {archived.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--wb-fg-muted)" }}>
                Archived <span style={{ fontWeight: 400 }}>· {archived.length}</span>
              </div>
              <div className="cashy-loangrid">
                {archived.map((c) => <ContactCard key={c.id} contact={c} onEdit={openEdit} />)}
              </div>
            </>
          )}
        </>
      )}
      <ContactEditor open={open} editing={editing} onClose={() => setOpen(false)} />
    </div>
  );
}
