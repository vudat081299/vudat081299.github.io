import type { Contact } from "@/domain/types";
import { CardIdentity } from "@/ui/common/CardIdentity";
import { Card } from "@/ui/kit/Card";

/** One contact as a card: tinted icon tile + name, with the @username (if any)
 *  as the subtitle. Presentational; click opens the editor. @ADR-contact-006 */
export function ContactCard({ contact, onEdit }: { contact: Contact; onEdit?: (id: string) => void }) {
  const clickable = Boolean(onEdit);
  return (
    <Card
      variant={clickable ? "hover" : "default"}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onEdit?.(contact.id) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit?.(contact.id);
              }
            }
          : undefined
      }
      style={{ opacity: contact.archived ? 0.55 : 1 }}
    >
      <div className="wb-card__body cashy-cardstack">
        <CardIdentity
          icon={contact.icon}
          tint={contact.colorHex}
          title={contact.name}
          subtitle={contact.username ? `@${contact.username}` : undefined}
          archived={contact.archived}
        />
      </div>
    </Card>
  );
}
