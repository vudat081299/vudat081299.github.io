import { useMemo, useState, type CSSProperties } from "react";
import { useCashy } from "@/data/store";
import {
  loansNetWorth,
  loanStatus,
  nextPayment,
  payableSchedule,
  sortLoans,
  totalPayable,
  totalReceivable,
  type LoanStatus,
} from "@/domain/loan";
import type { Loan, LoanSource } from "@/domain/types";
import { PageHeader } from "@/ui/common/PageHeader";
import { Button } from "@/ui/kit/Button";
import { FacetChip } from "@/ui/common/FacetChip";
import { SearchField } from "@/ui/common/SearchField";
import { LoanCard } from "@/ui/features/loans/LoanCard";
import { LoanSummary } from "@/ui/features/loans/LoanSummary";
import { LoanEditor } from "./LoanEditor";
import { SOURCES, STATUS_FILTERS } from "./loanOptions";

function LoanGroup({
  title,
  loans,
  onEdit,
  now,
}: {
  title: string;
  loans: Loan[];
  onEdit: (id: string) => void;
  now: Date;
}) {
  if (loans.length === 0) return null;
  const sorted = sortLoans(loans, now);
  return (
    <div className="wb-stack" style={{ "--wb-stack-gap": "10px" } as CSSProperties}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--wb-fg-muted)" }}>
        {title} <span style={{ fontWeight: 400 }}>· {loans.length}</span>
      </div>
      <div className="cashy-loangrid">
        {sorted.map((l) => (
          <LoanCard key={l.id} loan={l} onEdit={onEdit} now={now} />
        ))}
      </div>
    </div>
  );
}

export function Loans() {
  const { loans } = useCashy();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loan | null>(null);
  const now = useMemo(() => new Date(), []);

  // Filters. The screen already groups by direction, so the filter narrows the
  // OTHER axes — name, status, source — plus whether put-away (archived) loans
  // show. The stat row above stays on the full set: it's your whole position, not
  // a view of the current filter.
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LoanStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<LoanSource | "all">("all");
  const [showArchived, setShowArchived] = useState(false);

  const payable = useMemo(() => totalPayable(loans), [loans]);
  const receivable = useMemo(() => totalReceivable(loans), [loans]);
  const net = useMemo(() => loansNetWorth(loans), [loans]);
  const activeCount = useMemo(() => loans.filter((l) => !l.archived).length, [loans]);
  // When I owe money, bucketed by when it's due, and the next payment coming up —
  // the fuel for the overview's "what's coming" panel.
  const schedule = useMemo(() => payableSchedule(loans, now), [loans, now]);
  const next = useMemo(() => nextPayment(loans, now), [loans, now]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return loans.filter((l) => {
      if (q && !l.counterparty.toLowerCase().includes(q)) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (statusFilter !== "all" && loanStatus(l, now) !== statusFilter) return false;
      return true;
    });
  }, [loans, query, sourceFilter, statusFilter, now]);

  const borrowed = useMemo(
    () => visible.filter((l) => !l.archived && l.direction === "borrowed"),
    [visible],
  );
  const lent = useMemo(
    () => visible.filter((l) => !l.archived && l.direction === "lent"),
    [visible],
  );
  const archivedList = useMemo(
    () => (showArchived ? visible.filter((l) => l.archived) : []),
    [visible, showArchived],
  );

  const filtersActive =
    query.trim() !== "" || statusFilter !== "all" || sourceFilter !== "all";
  const nothingShown = borrowed.length === 0 && lent.length === 0 && archivedList.length === 0;

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(id: string) {
    setEditing(loans.find((l) => l.id === id) ?? null);
    setOpen(true);
  }

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        title="Loans"
        subtitle={`${activeCount} active · money you owe and money owed to you`}
        actions={
          <Button type="button" round onClick={openAdd}>
            <span className="wb-ico wb-ico--xs">add</span>
            Add loan
          </Button>
        }
      />

      <LoanSummary
        payable={payable}
        receivable={receivable}
        net={net}
        schedule={schedule}
        next={next}
      />

      {loans.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: "2px 0 0" }}>
          No loans yet — add one for a debt you owe, or money you've lent out.
        </p>
      ) : (
        <>
          {/* Filter bar: search a name, narrow by status or source, and choose
              whether put-away loans show. Grouping already handles direction. */}
          <div className="wb-filterbar">
            {/* Seamless search pill — same control as the transaction filter. */}
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search a name…"
              className="wb-filterbar__search"
              ariaLabel="Search loans by name"
            />

            <FacetChip
              label="Status"
              value={statusFilter === "all" ? undefined : STATUS_FILTERS.find((s) => s.value === statusFilter)?.label}
              active={statusFilter !== "all"}
              panelWidth={200}
              onClear={() => setStatusFilter("all")}
            >
              {({ close }) => (
                <div className="wb-menu cashy-facet-pop" style={{ border: 0, boxShadow: "none" }}>
                  <div className="wb-stack" style={{ "--wb-stack-gap": "1px" } as CSSProperties}>
                    {STATUS_FILTERS.map((s) => (
                      <label key={s.value} className="wb-radio wb-menu__item">
                        <input
                          type="radio"
                          name="loan-status"
                          checked={statusFilter === s.value}
                          onChange={() => {
                            setStatusFilter(s.value);
                            close();
                          }}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </FacetChip>

            <FacetChip
              label="Source"
              value={sourceFilter === "all" ? undefined : SOURCES.find((s) => s.value === sourceFilter)?.label}
              active={sourceFilter !== "all"}
              panelWidth={200}
              onClear={() => setSourceFilter("all")}
            >
              {({ close }) => (
                <div className="wb-menu cashy-facet-pop" style={{ border: 0, boxShadow: "none" }}>
                  <div className="wb-stack" style={{ "--wb-stack-gap": "1px" } as CSSProperties}>
                    <label className="wb-radio wb-menu__item">
                      <input
                        type="radio"
                        name="loan-source"
                        checked={sourceFilter === "all"}
                        onChange={() => {
                          setSourceFilter("all");
                          close();
                        }}
                      />
                      All sources
                    </label>
                    {SOURCES.map((s) => (
                      <label key={s.value} className="wb-radio wb-menu__item">
                        <input
                          type="radio"
                          name="loan-source"
                          checked={sourceFilter === s.value}
                          onChange={() => {
                            setSourceFilter(s.value);
                            close();
                          }}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </FacetChip>

            <FacetChip
              label="Archived"
              value={showArchived ? "Shown" : undefined}
              active={showArchived}
              panelWidth={170}
              onClear={() => setShowArchived(false)}
            >
              {({ close }) => (
                <div className="wb-menu cashy-facet-pop" style={{ border: 0, boxShadow: "none" }}>
                  <div className="wb-stack" style={{ "--wb-stack-gap": "1px" } as CSSProperties}>
                    {[
                      { v: false, label: "Hidden" },
                      { v: true, label: "Shown" },
                    ].map((o) => (
                      <label key={String(o.v)} className="wb-radio wb-menu__item">
                        <input
                          type="radio"
                          name="loan-arch"
                          checked={showArchived === o.v}
                          onChange={() => {
                            setShowArchived(o.v);
                            close();
                          }}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </FacetChip>

            {(filtersActive || showArchived) && (
              <button
                type="button"
                className="cashy-facet-clear"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setSourceFilter("all");
                  setShowArchived(false);
                }}
              >
                Clear all
              </button>
            )}
          </div>

          {nothingShown ? (
            <p style={{ fontSize: 13, color: "var(--wb-fg-muted)", margin: "2px 0 0" }}>
              {filtersActive
                ? "No loans match your filters."
                : "Nothing to show — every loan is archived. Use the Archived filter to show them."}
            </p>
          ) : (
            <>
              <LoanGroup title="Money I owe" loans={borrowed} onEdit={openEdit} now={now} />
              <LoanGroup title="Owed to me" loans={lent} onEdit={openEdit} now={now} />
              <LoanGroup title="Archived" loans={archivedList} onEdit={openEdit} now={now} />
            </>
          )}
        </>
      )}

      <LoanEditor open={open} editing={editing} onClose={() => setOpen(false)} />
    </div>
  );
}
