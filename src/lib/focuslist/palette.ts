// Colour assignment for projects and tags, plus the two inline-style helpers
// the rows and pills use. Colours are picked deterministically from the name
// (same hash idiom as components/focuslist/icons.tsx) so a project keeps its
// colour across reloads without storing anything extra.

import type { CSSProperties } from "react";

export const PALETTE = [
  "#6252e8", // indigo — matches --primary
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#14b8a6", // teal
  "#8b5cf6", // violet
  "#ef7234", // orange
] as const;

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function colorForName(name: string): string {
  if (!name) return PALETTE[0];
  return PALETTE[hashString(name) % PALETTE.length];
}

// Soft tinted chip used for project and tag pills.
export function pillStyle(color: string): CSSProperties {
  return {
    backgroundColor: `color-mix(in srgb, ${color} 14%, #ffffff)`,
    color,
  };
}

// Rounded tile behind a task's icon. The icon itself inherits `color`.
export function iconTileStyle(accent: string): CSSProperties {
  return {
    backgroundColor: `color-mix(in srgb, ${accent} 12%, #ffffff)`,
    color: accent,
  };
}
