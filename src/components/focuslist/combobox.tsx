"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

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
      <input
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
        className={`h-11 w-full rounded-xl border bg-card px-3.5 pr-9 text-sm text-foreground-strong outline-none transition-colors placeholder:text-muted-foreground focus:border-[#6252e8] ${
          invalid ? "border-destructive" : "border-border"
        }`}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

      {open && filtered.length > 0 && (
        <div className="fl-scroll absolute z-50 mt-1.5 max-h-52 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
          {!exactMatch && value.trim() && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(value.trim());
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground hover:bg-secondary"
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
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-foreground-strong hover:bg-secondary"
            >
              {option}
              {option.toLowerCase() === value.trim().toLowerCase() && (
                <Check className="h-4 w-4" style={{ color: "#6252e8" }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
