"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { clsx } from "clsx";

interface DatePickerProps {
  label?: string;
  value?: string; // ISO date string (YYYY-MM-DD)
  onChange: (date: string) => void;
  placeholder?: string;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = "Pick a date",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value ? new Date(value + "T00:00:00") : undefined;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-2 w-full rounded-lg border px-3 py-2 text-sm text-left transition-colors cursor-pointer",
          "border-gray-200 dark:border-clemson-orange/20 bg-background",
          "hover:border-gray-300 dark:hover:border-gray-700",
          open
            ? "ring-2 ring-clemson-orange/30 border-clemson-orange"
            : "focus:ring-2 focus:ring-clemson-orange/30 focus:border-clemson-orange",
        )}
      >
        <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" />
        <span className={clsx("flex-1", selected ? "text-foreground" : "text-gray-400")}>
          {selected ? format(selected, "MMM d, yyyy") : placeholder}
        </span>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { onChange(""); setOpen(false); }
            }}
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-gray-200 dark:border-clemson-orange/20 bg-background shadow-xl p-3 animate-in fade-in zoom-in-95 duration-150">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(day) => {
              if (day) {
                onChange(format(day, "yyyy-MM-dd"));
              }
              setOpen(false);
            }}
            disabled={{ before: new Date() }}
            defaultMonth={selected || new Date()}
            classNames={{
              root: "text-sm",
              months: "flex flex-col",
              month_caption: "flex justify-center items-center h-8 font-semibold text-foreground",
              nav: "flex items-center justify-between absolute inset-x-0 top-0 h-8 px-1",
              button_previous: "inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 cursor-pointer transition-colors",
              button_next: "inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 cursor-pointer transition-colors",
              weekdays: "flex",
              weekday: "w-9 text-center text-xs font-medium text-gray-400 py-1",
              week: "flex",
              day: "w-9 h-9 flex items-center justify-center text-sm rounded-md transition-colors",
              day_button: "w-full h-full flex items-center justify-center rounded-md cursor-pointer hover:bg-clemson-orange/10 hover:text-clemson-orange transition-colors",
              selected: "!bg-clemson-orange !text-white rounded-md hover:!bg-clemson-orange-dark",
              today: "font-bold text-clemson-orange",
              disabled: "text-gray-300 dark:text-gray-600 pointer-events-none",
              outside: "text-gray-300 dark:text-gray-600",
              month_grid: "relative",
            }}
          />
        </div>
      )}
    </div>
  );
}
