// Category & tag identity colours. These mirror the web-builder chart palette
// (`--wb-chart-1…8` + two neutrals) so every category dot, donut slice and
// ranked bar reads like the rest of the UI — bright, harmonious, never murky.
// Used as vivid *marks* (dot / icon / donut slice) and, softened to tier-3, as
// ranked-bar fills; never as a flat area fill behind text.
export const SWATCHES = [
  "#6366f1", // indigo   (chart-1)
  "#14b8a6", // teal     (chart-2)
  "#f59e0b", // amber    (chart-3)
  "#ec4899", // pink     (chart-4)
  "#3b82f6", // blue     (chart-5)
  "#8b5cf6", // violet   (chart-6)
  "#06b6d4", // cyan     (chart-7)
  "#84cc16", // lime     (chart-8)
  "#f43f5e", // rose
  "#64748b", // slate
] as const;
