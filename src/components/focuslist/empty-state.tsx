"use client";

import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={`flex h-full flex-col items-center justify-center text-center ${
        compact ? "py-6" : "py-8"
      } ${className ?? ""}`}
    >
      {icon && (
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
          {icon}
        </div>
      )}
      <p className="text-title-medium text-on-surface">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-body-medium text-on-surface-variant">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
