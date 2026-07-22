/**
 * The business layer: Cashy's rules and calculations, and nothing else.
 *
 * Every module behind this barrel is PURE — no React, no localStorage, no
 * `Date.now()` that isn't an injectable default. That is the whole point: the
 * rules can be read, reasoned about and tested without booting an app. Anything
 * that has to touch the outside world belongs in `data/`; anything that
 * sequences a user's intent belongs in `usecases/`.
 *
 * Import a specific module (`@/domain/subscription`) when you only need one
 * area; import this barrel when a screen genuinely spans several.
 */
export * from "@/domain/sort";
export * from "@/domain/category";
export * from "@/domain/tag";
export * from "@/domain/transaction";
export * from "@/domain/subscription";
export * from "@/domain/analytics";
