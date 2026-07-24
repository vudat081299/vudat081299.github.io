import { useEffect, useMemo, useState } from "react";
import { useCashy } from "@/data/store";
import { addContact, deleteContact, setContactArchived, updateContact } from "@/usecases";
import { activeContacts, sortedContacts, CONTACT_DEFAULT_ICON } from "@/domain/contact";
import { confirmDelete } from "@/lib/confirm";
import { SWATCHES } from "@/lib/palette";
import type { Contact } from "@/domain/types";
import { PageHeader } from "@/ui/common/PageHeader";
import { ColorPicker } from "@/ui/common/ColorPicker";
import { IconPicker } from "@/ui/common/IconPicker";
import { Modal } from "@/ui/kit/Modal";
import { Button } from "@/ui/kit/Button";
import { Input } from "@/ui/kit/Input";
import { ContactCard } from "@/ui/features/contacts/ContactCard";

function ContactEditor({ open, editing, onClose }: { open: boolean; editing: Contact | null; onClose: () => void }) {
  const { contacts } = useCashy();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [color, setColor] = useState<string>(SWATCHES[0]);
  const [icon, setIcon] = useState<string>(CONTACT_DEFAULT_ICON);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setUsername(editing?.username ?? "");
    // New contact: rotate the hue by how many contacts already exist.
    setColor(editing?.colorHex ?? SWATCHES[contacts.length % SWATCHES.length]);
    setIcon(editing?.icon ?? CONTACT_DEFAULT_ICON);
  }, [open, editing, contacts.length]);

  function save() {
    const n = name.trim();
    if (!n) return;
    const patch = { name: n, username: username.trim(), colorHex: color, icon };
    if (editing) updateContact(editing.id, patch);
    else addContact(patch);
    onClose();
  }

  async function remove() {
    if (!editing) return;
    const ok = await confirmDelete({
      title: `Delete contact "${editing.name}"?`,
      message: "This cannot be undone. If the contact is linked to a loan, archive it instead of deleting.",
    });
    if (ok && deleteContact(editing.id)) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit contact" : "Add contact"}
      maxWidth={440}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={save} disabled={!name.trim()}>
            {editing ? "Save" : "Add"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="wb-field">
          <label className="wb-label" htmlFor="contact-name">Name</label>
          <Input id="contact-name" value={name} autoFocus maxLength={80}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="e.g. Anh Minh, Bố mẹ, Chị Hoà" />
        </div>
        {/* Username: optional handle surfaced so a contact can be disambiguated /
            linked to an account, per @BR-contact-003. */}
        <div className="wb-field">
          <label className="wb-label" htmlFor="contact-username">
            Username <span className="wb-label__opt">(optional · to disambiguate / account handle)</span>
          </label>
          <Input id="contact-username" value={username} maxLength={30}
            onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="e.g. minh_vcb" />
        </div>
        <div className="wb-field"><label className="wb-label">Color</label><ColorPicker value={color} onChange={setColor} /></div>
        <div className="wb-field"><label className="wb-label">Icon</label><IconPicker value={icon} onChange={setIcon} /></div>
        {editing && (
          <div className="wb-cluster" style={{ gap: 8, justifyContent: "flex-start" }}>
            <Button variant="ghost" size="sm" type="button"
              onClick={() => { setContactArchived(editing.id, !editing.archived); onClose(); }}>
              <span className="wb-ico wb-ico--xs">{editing.archived ? "unarchive" : "archive"}</span>
              {editing.archived ? "Unarchive" : "Archive"}
            </Button>
            <Button variant="ghost" size="sm" className="cashy-btn--quiet-danger" type="button" onClick={remove}>
              <span className="wb-ico wb-ico--xs">delete</span> Delete
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

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
