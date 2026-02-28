import {
  LocationClient,
  SearchPlaceIndexForSuggestionsCommand,
  GetPlaceCommand,
  CalculateRouteCommand,
} from "@aws-sdk/client-location";

const client = new LocationClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const PLACE_INDEX = process.env.LOCATION_PLACE_INDEX || "";
const ROUTE_CALCULATOR = process.env.LOCATION_ROUTE_CALCULATOR || "";

export interface PlaceSuggestion {
  label: string;
  placeId?: string;
  lat: number;
  lng: number;
}

export interface RouteResult {
  distance: number; // km
  duration: number; // minutes
  geometry: [number, number][]; // [lng, lat] coordinate pairs
}

/**
 * Search for place suggestions using Amazon Location Service.
 * Biased toward the Clemson, SC area for relevance.
 */
export async function searchPlaces(
  query: string
): Promise<PlaceSuggestion[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const command = new SearchPlaceIndexForSuggestionsCommand({
    IndexName: PLACE_INDEX,
    Text: query,
    MaxResults: 5,
    BiasPosition: [-82.8374, 34.6834], // Clemson, SC
  });

  const response = await client.send(command);

  if (!response.Results) {
    return [];
  }

  return response.Results.filter((r) => r.PlaceId).map((result) => ({
    label: result.Text || "",
    placeId: result.PlaceId,
    lat: 0,
    lng: 0,
  }));
}

/**
 * Get full details for a place by its ID.
 */
export async function getPlaceDetails(placeId: string) {
  const command = new GetPlaceCommand({
    IndexName: PLACE_INDEX,
    PlaceId: placeId,
  });

  const response = await client.send(command);
  const place = response.Place;

  if (!place) {
    return null;
  }

  return {
    label: place.Label || "",
    lat: place.Geometry?.Point?.[1] ?? 0,
    lng: place.Geometry?.Point?.[0] ?? 0,
    address: {
      street: place.Street || "",
      municipality: place.Municipality || "",
      region: place.Region || "",
      postalCode: place.PostalCode || "",
      country: place.Country || "",
    },
  };
}

/**
 * Calculate a driving route between two points using Amazon Location Service.
 * Returns distance in km, duration in minutes, and the route geometry.
 */
export async function calculateRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  const command = new CalculateRouteCommand({
    CalculatorName: ROUTE_CALCULATOR,
    DeparturePosition: [originLng, originLat],
    DestinationPosition: [destLng, destLat],
    TravelMode: "Car",
    DistanceUnit: "Kilometers",
    IncludeLegGeometry: true,
  });

  const response = await client.send(command);
  const summary = response.Summary;
  const legs = response.Legs || [];

  // Collect all geometry points from every leg
  const geometry: [number, number][] = [];
  for (const leg of legs) {
    const points = leg.Geometry?.LineString || [];
    for (const point of points) {
      geometry.push([point[0], point[1]]);
    }
  }

  return {
    distance: summary?.Distance ?? 0,
    duration: summary?.DurationSeconds ? summary.DurationSeconds / 60 : 0,
    geometry,
  };
}
