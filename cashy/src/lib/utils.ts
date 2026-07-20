import { clsx, type ClassValue } from "clsx";

/**
 * Join class names conditionally. Cashy has no Tailwind, so there is nothing
 * to de-duplicate — plain clsx is enough.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
