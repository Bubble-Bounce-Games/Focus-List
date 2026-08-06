"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

type ProgressSliderProps = {
  value: number;
  accent: string;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
};

// Long horizontal range slider with a colored fill and round thumb.
// Controlled + keyboard accessible. Calls onCommit when the drag ends
// so we persist to IndexedDB once per change instead of on every pixel.
export function ProgressSlider({
  value,
  accent,
  onChange,
  onCommit,
  disabled,
  ariaLabel,
  id,
}: ProgressSliderProps) {
  const reactId = useId();
  const sliderId = id ?? reactId;
  const [dragging, setDragging] = useState(false);
  const commitRef = useRef(onCommit);

  useEffect(() => {
    commitRef.current = onCommit;
  }, [onCommit]);

  const pct = `${Math.round(value)}%`;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      onChange(next);
    },
    [onChange]
  );

  return (
    <input
      id={sliderId}
      type="range"
      min={0}
      max={100}
      step={1}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel ?? "Task progress"}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      onChange={handleChange}
      onPointerDown={() => setDragging(true)}
      onPointerUp={() => {
        if (dragging) {
          setDragging(false);
          commitRef.current?.(value);
        }
      }}
      onPointerCancel={() => {
        if (dragging) {
          setDragging(false);
          commitRef.current?.(value);
        }
      }}
      onKeyDown={(e) => {
        // Keyboard changes are atomic; commit immediately.
        if (
          [
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
            "PageUp",
            "PageDown",
          ].includes(e.key)
        ) {
          // Let the native input update first, then commit on next tick.
          setTimeout(() => commitRef.current?.(Number(e.currentTarget.value)), 0);
        }
      }}
      className="fl-slider"
      style={
        {
          "--fl-fill": accent,
          "--fl-track": "#eceef5",
          "--fl-pct": pct,
        } as React.CSSProperties
      }
    />
  );
}
