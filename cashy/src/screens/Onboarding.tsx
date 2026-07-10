import { useState } from "react";
import { Wallet } from "lucide-react";
import { createWorkspace } from "@/lib/store";
import { AVATAR_COLORS } from "@/lib/palette";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Onboarding() {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(AVATAR_COLORS[5]);

  function submit() {
    createWorkspace({ displayName: name.trim() || "Của tôi", avatarColor: color });
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div
            className="grid size-11 place-items-center rounded-xl text-white"
            style={{ background: color }}
          >
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Chào mừng đến Cashy</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Sổ chi tiêu cá nhân — số liệu là nhân vật chính.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Tên không gian</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Ví dụ: Chi tiêu của Đạt"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Màu nhận diện</Label>
            <div className="flex flex-wrap gap-1.5">
              {AVATAR_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  className={cn(
                    "size-7 rounded-md ring-offset-2 ring-offset-card transition",
                    color === hex && "ring-2 ring-foreground/40",
                  )}
                  style={{ background: hex }}
                  aria-label={hex}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-[13px] text-muted-foreground">
            <span>Đơn vị tiền tệ</span>
            <span className="font-medium text-foreground">VND (₫)</span>
          </div>

          <Button className="w-full" onClick={submit}>
            Tạo không gian
          </Button>
        </div>
      </div>
    </div>
  );
}
