"use server";

import {
  searchPlaces,
  getPlaceDetails,
  calculateRoute,
} from "@/lib/maps";
import type { PlaceSuggestion, RouteResult } from "@/lib/maps";

export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
}

/**
 * Server action to search for place suggestions.
 * Resolves each suggestion to its full coordinates via getPlaceDetails.
 */
export async function searchPlacesAction(
  query: string
): Promise<PlaceResult[]> {
  try {
    const suggestions: PlaceSuggestion[] = await searchPlaces(query);

    // Resolve place details in parallel to get coordinates
    const results = await Promise.all(
      suggestions.map(async (suggestion) => {
        if (!suggestion.placeId) {
          return { label: suggestion.label, lat: 0, lng: 0 };
        }
        const details = await getPlaceDetails(suggestion.placeId);
        if (!details) {
          return { label: suggestion.label, lat: 0, lng: 0 };
        }
        return {
          label: details.label,
          lat: details.lat,
          lng: details.lng,
        };
      })
    );

    return results.filter((r) => r.lat !== 0 || r.lng !== 0);
  } catch (error) {
    console.error("searchPlacesAction error:", error);
    return [];
  }
}

/**
 * Server action to calculate a driving route between two points.
 */
export async function calculateRouteAction(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult | null> {
  try {
    return await calculateRoute(originLat, originLng, destLat, destLng);
  } catch (error) {
    console.error("calculateRouteAction error:", error);
    return null;
  }
}
