/**
 * Everything the app can DO, as plain functions.
 *
 * A usecase reads the current state, asks `domain/` what the next one should be,
 * and commits it. That is the whole job — no rendering, no rule of its own that
 * couldn't be moved down into the domain once it earns a second caller.
 *
 * This is the only layer the UI is allowed to write through: screens import
 * usecases, `data/store` stays private to them.
 */
export * from "@/usecases/settings";
export * from "@/usecases/workspace";
export * from "@/usecases/categories";
export * from "@/usecases/tags";
export * from "@/usecases/transactions";
export * from "@/usecases/subscriptions";
export * from "@/usecases/wallets";
export * from "@/usecases/loans";
