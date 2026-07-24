import { useState } from "react";
import type { TxType } from "@/domain/types";
import { PageHeader } from "@/ui/common/PageHeader";
import { Button } from "@/ui/kit/Button";
import { Tree } from "./Tree";
import { CategoryEditor, type EditorState } from "./CategoryEditor";

export function Categories() {
  const [type, setType] = useState<TxType>("expense");
  const [editor, setEditor] = useState<EditorState | null>(null);

  return (
    <div className="wb-stack wb-stack--loose">
      <PageHeader
        title="Categories"
        subtitle="Drag to reorder · drop onto an item to nest"
        actions={
          <Button
            round
            type="button"
            style={{ gap: 6 }}
            onClick={() => setEditor({ editing: null, type, parentId: null })}
          >
            <span className="wb-ico wb-ico--sm">add</span>
            Add category
          </Button>
        }
      />

      <div className="wb-tabs wb-tabs--pill" style={{ width: "fit-content" }}>
        {(["expense", "income"] as TxType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={type === t ? "wb-tab is-active" : "wb-tab"}
            onClick={() => setType(t)}
          >
            {t === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      <Tree
        type={type}
        onAddChild={(parentId) => setEditor({ editing: null, type, parentId })}
        onEdit={(cat) => setEditor({ editing: cat, type: cat.type, parentId: cat.parentId ?? null })}
      />

      <CategoryEditor state={editor} onClose={() => setEditor(null)} />
    </div>
  );
}
