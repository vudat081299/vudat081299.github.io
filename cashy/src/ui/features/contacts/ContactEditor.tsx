import { useEffect, useState } from "react";
import { useCashy } from "@/data/store";
import { addContact, deleteContact, setContactArchived, updateContact } from "@/usecases";
import { CONTACT_DEFAULT_ICON } from "@/domain/contact";
import { confirmDelete } from "@/lib/confirm";
import { SWATCHES } from "@/lib/palette";
import type { Contact } from "@/domain/types";
import { ColorPicker } from "@/ui/common/ColorPicker";
import { IconPicker } from "@/ui/common/IconPicker";
import { Modal } from "@/ui/kit/Modal";
import { Button } from "@/ui/kit/Button";
import { Input } from "@/ui/kit/Input";

export function ContactEditor({ open, editing, onClose }: { open: boolean; editing: Contact | null; onClose: () => void }) {
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
