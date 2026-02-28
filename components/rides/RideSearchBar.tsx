"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { searchPlacesAction, type PlaceResult } from "@/lib/actions/maps";

export function RideSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("destination") || "");
  const [date, setDate] = useState(searchParams.get("date") || "");
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

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 300);
  };

  const handleSelectSuggestion = (place: PlaceResult) => {
    setQuery(place.label);
    setSuggestions([]);
    setIsOpen(false);
  };

  function applyFilters() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("destination", query.trim());
    if (date) params.set("date", date);
    const qs = params.toString();
    router.push(qs ? `/rides?${qs}` : "/rides");
  }

  function clearFilters() {
    setQuery("");
    setDate("");
    router.push("/rides");
  }

  const hasFilters = searchParams.get("destination") || searchParams.get("date");

  return (
    <div className="mb-8 rounded-xl border border-gray-100 dark:border-gray-800 bg-background p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row items-end gap-3">
        {/* Location search with autocomplete */}
        <div className="flex-1 w-full relative" ref={containerRef}>
          <Input
            label="Destination"
            placeholder="Search by city or location..."
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setIsOpen(false);
                applyFilters();
              }
            }}
            autoComplete="off"
            iconLeft={<MapPin className="h-4 w-4" />}
            iconRight={
              isLoading ? (
                <span className="text-xs text-gray-400 animate-pulse">...</span>
              ) : query ? (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setSuggestions([]); setIsOpen(false); }}
                  className="pointer-events-auto cursor-pointer text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : undefined
            }
          />

          {isOpen && suggestions.length > 0 && (
            <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-100 dark:border-gray-800 bg-background shadow-lg">
              {suggestions.map((place, index) => (
                <li key={`${place.label}-${index}`}>
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-clemson-orange/10 hover:text-clemson-orange transition-colors flex items-start gap-2"
                    onClick={() => handleSelectSuggestion(place)}
                  >
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-gray-400" />
                    {place.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="w-full sm:w-56">
          <DatePicker
            label="Date"
            value={date}
            onChange={setDate}
            placeholder="Pick a date"
          />
        </div>

        <Button type="button" onClick={applyFilters} className="w-full sm:w-auto">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>

      {/* Active filters */}
      {hasFilters && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <span>
            Showing results
            {searchParams.get("destination") && (
              <> for <span className="font-medium text-foreground">&quot;{searchParams.get("destination")}&quot;</span></>
            )}
            {searchParams.get("date") && (
              <> on <span className="font-medium text-foreground">{searchParams.get("date")}</span></>
            )}
          </span>
          <button
            type="button"
            onClick={clearFilters}
            className="ml-2 text-clemson-orange hover:text-clemson-orange-dark font-medium transition-colors cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
