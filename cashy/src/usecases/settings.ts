import type { SubIconStyle, ThemeMode } from "@/domain/types";
import { commit, getState } from "@/data/store";

export function setTheme(theme: ThemeMode): void {
  commit({ ...getState(), theme });
}

/** Toggle whether subscription icon tiles carry the service's hue or stay grey. */
export function setSubIconStyle(subIconStyle: SubIconStyle): void {
  commit({ ...getState(), subIconStyle });
}
