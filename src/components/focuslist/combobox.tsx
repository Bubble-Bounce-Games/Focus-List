"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

type ComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  id?: string;
  invalid?: boolean;
};

// Lightweight combobox: type to filter existing options or enter a new value.
export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  id,
  invalid,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = value.trim().toLowerCase();
  const filtered = query
    ? options.filter((o) => o.toLowerCase().includes(query) && o.toLowerCase() !== query)
    : options;
  const exactMatch = options.some(
    (o) => o.toLowerCase() === value.trim().toLowerCase()
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && filtered.length > 0) {
            e.preventDefault();
            onChange(filtered[0]);
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={invalid}
        className="h-11 pr-9"
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />

      {open && filtered.length > 0 && (
        <div className="fl-scroll absolute z-50 mt-1.5 max-h-52 w-full overflow-y-auto rounded-md border border-outline-variant bg-surface-container-high p-1 shadow-e2">
          {!exactMatch && value.trim() && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(value.trim());
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-label-large text-primary transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-on-surface/[0.08] focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
            >
              <span>Use “{value.trim()}” (new)</span>
            </button>
          )}
          {filtered.map((option) => (
            <button
              type="button"
              key={option}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(option);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-label-large text-on-surface transition-[background-color] duration-[var(--duration-short)] [transition-timing-function:var(--ease-standard)] hover:bg-on-surface/[0.08] focus-visible:bg-on-surface/[0.10] active:bg-on-surface/[0.12]"
            >
              {option}
              {option.toLowerCase() === value.trim().toLowerCase() && (
                <Check className="size-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
