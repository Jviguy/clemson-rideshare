"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { CalendarDays, Clock, X } from "lucide-react";
import { clsx } from "clsx";

interface DateTimePickerProps {
  label?: string;
  value?: string; // ISO datetime string or datetime-local format
  onChange: (datetime: string) => void;
  placeholder?: string;
  required?: boolean;
  name?: string;
}

export function DateTimePicker({
  label,
  value,
  onChange,
  placeholder = "Pick date & time",
  required,
  name,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parse value into date and time parts
  const parsed = value ? new Date(value) : undefined;
  const selectedDate = parsed && !isNaN(parsed.getTime()) ? parsed : undefined;
  const [hour, setHour] = useState(() => selectedDate ? String(selectedDate.getHours()).padStart(2, "0") : "09");
  const [minute, setMinute] = useState(() => selectedDate ? String(selectedDate.getMinutes()).padStart(2, "0") : "00");
  const [ampm, setAmpm] = useState(() => {
    if (!selectedDate) return "AM";
    return selectedDate.getHours() >= 12 ? "PM" : "AM";
  });

  // Convert 24h hour to 12h display
  const displayHour = selectedDate
    ? (() => {
        const h = selectedDate.getHours();
        if (h === 0) return "12";
        if (h > 12) return String(h - 12);
        return String(h);
      })()
    : hour;

  useEffect(() => {
    if (selectedDate) {
      const h = selectedDate.getHours();
      setHour(h === 0 ? "12" : h > 12 ? String(h - 12).padStart(2, "0") : String(h).padStart(2, "0"));
      setMinute(String(selectedDate.getMinutes()).padStart(2, "0"));
      setAmpm(h >= 12 ? "PM" : "AM");
    }
  }, [value]);

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

  function buildDatetime(date: Date, h: string, m: string, ap: string): string {
    let hours = parseInt(h, 10);
    if (ap === "AM" && hours === 12) hours = 0;
    if (ap === "PM" && hours !== 12) hours += 12;
    const d = new Date(date);
    d.setHours(hours, parseInt(m, 10), 0, 0);
    // Return datetime-local format
    return format(d, "yyyy-MM-dd'T'HH:mm");
  }

  function handleDaySelect(day: Date | undefined) {
    if (!day) return;
    const dt = buildDatetime(day, hour, minute, ampm);
    onChange(dt);
  }

  function handleTimeChange(newHour: string, newMinute: string, newAmpm: string) {
    setHour(newHour);
    setMinute(newMinute);
    setAmpm(newAmpm);
    if (selectedDate) {
      const dt = buildDatetime(selectedDate, newHour, newMinute, newAmpm);
      onChange(dt);
    }
  }

  const hours12 = ["12", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"];
  const minutes15 = ["00", "15", "30", "45"];

  return (
    <div ref={ref} className="relative flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}

      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={value || ""} required={required} />}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-2 w-full rounded-lg border px-3 py-2 text-sm text-left transition-colors cursor-pointer",
          "border-gray-200 dark:border-gray-800 bg-background",
          "hover:border-gray-300 dark:hover:border-gray-700",
          open
            ? "ring-2 ring-clemson-orange/30 border-clemson-orange"
            : "focus:ring-2 focus:ring-clemson-orange/30 focus:border-clemson-orange",
        )}
      >
        <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" />
        <span className={clsx("flex-1", selectedDate ? "text-foreground" : "text-gray-400")}>
          {selectedDate
            ? format(selectedDate, "MMM d, yyyy 'at' h:mm a")
            : placeholder}
        </span>
        {selectedDate && (
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
        <div className="absolute top-full left-0 z-50 mt-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-background shadow-xl p-3 animate-in fade-in zoom-in-95 duration-150 w-[300px]">
          {/* Calendar */}
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDaySelect}
            disabled={{ before: new Date() }}
            defaultMonth={selectedDate || new Date()}
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

          {/* Time picker */}
          <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium">Time</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Hour */}
              <select
                value={hour}
                onChange={(e) => handleTimeChange(e.target.value, minute, ampm)}
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-background px-2 py-1.5 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-clemson-orange/30 focus:border-clemson-orange"
              >
                {hours12.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>

              <span className="text-gray-400 font-medium">:</span>

              {/* Minute */}
              <select
                value={minute}
                onChange={(e) => handleTimeChange(hour, e.target.value, ampm)}
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-background px-2 py-1.5 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-clemson-orange/30 focus:border-clemson-orange"
              >
                {minutes15.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {/* AM/PM */}
              <select
                value={ampm}
                onChange={(e) => handleTimeChange(hour, minute, e.target.value)}
                className="w-16 rounded-lg border border-gray-200 dark:border-gray-800 bg-background px-2 py-1.5 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-clemson-orange/30 focus:border-clemson-orange"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
