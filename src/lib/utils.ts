import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDenomination(value: number): string {
  if (value < 1) return `${Math.round(value * 100)} ct`;
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)} €`;
}

export function progressColor(pct: number): string {
  if (pct >= 100) return "text-emerald-500";
  if (pct >= 75)  return "text-amber-500";
  if (pct >= 40)  return "text-orange-400";
  return "text-slate-400";
}
