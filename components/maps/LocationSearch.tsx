"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { searchPlacesAction } from "@/lib/actions/maps";
import type { PlaceResult } from "@/lib/actions/maps";

interface LocationSearchProps {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  onSelect: (place: { name: string; lat: number; lng: number }) => void;
}

export function LocationSearch({
  label,
  placeholder = "Search for a location...",
  defaultValue = "",
  onSelect,
}: LocationSearchProps) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = useCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchPlacesAction(value);
      setSuggestions(results);
      setIsOpen(results.length > 0);
    } catch {
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleSelect = (place: PlaceResult) => {
    setQuery(place.label);
    setSuggestions([]);
    setIsOpen(false);
    onSelect({ name: place.label, lat: place.lat, lng: place.lng });
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        label={label}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        autoComplete="off"
      />

      {isLoading && (
        <div className="absolute right-3 top-[38px] text-sm text-gray-400">
          ...
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {suggestions.map((place, index) => (
            <li key={`${place.label}-${index}`}>
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-clemson-orange/10 hover:text-clemson-orange transition-colors"
                onClick={() => handleSelect(place)}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
