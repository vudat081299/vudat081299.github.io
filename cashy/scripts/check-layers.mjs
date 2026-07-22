#!/usr/bin/env node
/**
 * Guards the one-way dependency rule the src/ layout encodes:
 *
 *     ui  ->  usecases  ->  domain
 *                       \-> data
 *
 * Layering that is only written down in a README rots within a month. This runs
 * in CI (`pnpm check:layers`) so a violation fails the build instead of quietly
 * becoming the new convention.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = new URL("../src/", import.meta.url).pathname;

/** Each rule: files under `dir` may not import anything matching `forbid`. */
const RULES = [
  {
    dir: "domain",
    forbid: [/^@\/(data|usecases|ui)\b/, /^react$/, /^react-dom/],
    why: "domain must stay pure — no store, no React, no IO",
  },
  {
    dir: "data",
    forbid: [/^@\/(usecases|ui)\b/],
    why: "data is below usecases; it may only reach down into domain/lib",
  },
  {
    dir: "usecases",
    forbid: [/^@\/ui\b/],
    why: "usecases must not know what renders them",
  },
  {
    dir: "ui/kit",
    forbid: [/^@\/(domain|data|usecases)\b/],
    why: "the design system must not know Cashy's business at all",
  },
  {
    dir: "ui",
    forbid: [/^@\/data\/(?!store|draft)/],
    why: "UI reads state via useCashy() and writes via usecases — nothing else in data/",
  },
];

/** Named imports from @/data/store that UI is allowed to use. */
const STORE_ALLOWED_IN_UI = new Set(["useCashy"]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

const IMPORT_RE = /import\s+(?:type\s+)?(?:\{([^}]*)\}|[\w*\s,]+)?\s*from\s*["']([^"']+)["']/g;
const violations = [];

for (const file of walk(SRC)) {
  const rel = relative(SRC, file);
  const src = readFileSync(file, "utf8");

  for (const [, named, spec] of src.matchAll(IMPORT_RE)) {
    for (const rule of RULES) {
      if (rel !== rule.dir && !rel.startsWith(rule.dir + "/")) continue;
      if (rule.forbid.some((re) => re.test(spec))) {
        violations.push(`${rel}\n    imports "${spec}"\n    → ${rule.why}`);
      }
    }

    // UI may read the store, but never write through it.
    if (rel.startsWith("ui/") && spec === "@/data/store" && named) {
      const bad = named
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((n) => !STORE_ALLOWED_IN_UI.has(n));
      if (bad.length) {
        violations.push(
          `${rel}\n    imports { ${bad.join(", ")} } from "@/data/store"\n` +
            `    → UI writes through usecases/, not the store directly`,
        );
      }
    }
  }
}

if (violations.length) {
  console.error(`\n✗ ${violations.length} layering violation(s):\n`);
  for (const v of violations) console.error("  " + v + "\n");
  process.exit(1);
}
console.log("✓ layering rules hold (ui → usecases → domain, data below usecases)");
