import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn-style class merger. clsx handles conditionals and arrays;
 * tailwind-merge resolves conflicts so later utilities win over earlier
 * (`px-2 px-4` → `px-4`).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
