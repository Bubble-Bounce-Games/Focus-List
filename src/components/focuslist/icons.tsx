"use client";

// Picks a Lucide icon deterministically from a project/tag name.

import {
  CheckSquare,
  Database,
  FlaskConical,
  Megaphone,
  PenLine,
  FileText,
  type LucideProps,
} from "lucide-react";

const ICONS = [
  FileText,
  PenLine,
  Database,
  FlaskConical,
  Megaphone,
  CheckSquare,
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function pickIconIndex(name: string): number {
  if (!name) return 0;
  return hashString(name) % ICONS.length;
}

// Render the task icon for a given project/tag name.
export function TaskIcon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const Cmp = ICONS[pickIconIndex(name)];
  return <Cmp {...props} />;
}
