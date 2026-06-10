// Client-side reverse geocoding via Mapbox Geocoding API.
// Returns "State, COUNTRY" e.g. "California, US", or "" on failure.

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface MapboxContext {
  id: string;
  short_code?: string;
  text: string;
}

interface MapboxFeature {
  place_type?: string[];
  text?: string;
  context?: MapboxContext[];
  properties?: { short_code?: string };
}

interface MapboxGeocodeResponse {
  features?: MapboxFeature[];
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (!TOKEN) return "";

  try {
    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`,
    );
    url.searchParams.set("types", "region,country");
    url.searchParams.set("access_token", TOKEN);

    const res = await fetch(url.toString());
    if (!res.ok) return "";

    const data = (await res.json()) as MapboxGeocodeResponse;
    let region = "";
    let country = "";

    for (const feature of data.features ?? []) {
      const types = feature.place_type ?? [];
      if (types.includes("region") && !region) {
        region = feature.text ?? "";
      }
      if (types.includes("country") && !country) {
        country = (
          feature.properties?.short_code ??
          feature.text ??
          ""
        ).toUpperCase();
      }
      for (const ctx of feature.context ?? []) {
        if (ctx.id.startsWith("region.") && !region) {
          region = ctx.text;
        }
        if (ctx.id.startsWith("country.") && !country) {
          country = (ctx.short_code ?? ctx.text).toUpperCase();
        }
      }
    }

    if (region && country) return `${region}, ${country}`;
    return region || country || "";
  } catch {
    return "";
  }
}
