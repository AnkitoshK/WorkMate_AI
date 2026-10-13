/**
 * Server-side IP Geolocation fallback utility.
 * Resolves client IP to precise latitude, longitude, and readable city/region address
 * when browser GPS is blocked, unprompted, or ungranted.
 */

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  location: string;
}

export async function resolveIpLocation(ip?: string | null): Promise<ResolvedLocation | null> {
  const cleanIp = (ip || "").replace(/^::ffff:/, "").trim();
  const isPrivateOrLocal =
    !cleanIp ||
    cleanIp === "127.0.0.1" ||
    cleanIp === "::1" ||
    cleanIp.startsWith("192.168.") ||
    cleanIp.startsWith("10.") ||
    cleanIp.startsWith("172.16.");

  const targetUrl = isPrivateOrLocal ? "https://ipwho.is/" : `https://ipwho.is/${cleanIp}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const d = await res.json();
      if (d && typeof d.latitude === "number" && typeof d.longitude === "number") {
        const parts: string[] = [];
        if (d.city) parts.push(d.city);
        if (d.region && d.region !== d.city) parts.push(d.region);
        if (d.country) parts.push(d.country);
        const loc = parts.length > 0 ? parts.join(", ") : `${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}`;
        return {
          latitude: d.latitude,
          longitude: d.longitude,
          location: loc,
        };
      }
    }
  } catch {
    // Try freeipapi fallback
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1800);
      const fallbackUrl = isPrivateOrLocal ? "https://freeipapi.com/api/json" : `https://freeipapi.com/api/json/${cleanIp}`;
      const res = await fetch(fallbackUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const d = await res.json();
        if (d && typeof d.latitude === "number" && typeof d.longitude === "number") {
          const parts: string[] = [];
          if (d.cityName) parts.push(d.cityName);
          if (d.regionName && d.regionName !== d.cityName) parts.push(d.regionName);
          if (d.countryName) parts.push(d.countryName);
          const loc = parts.length > 0 ? parts.join(", ") : `${d.latitude.toFixed(4)}, ${d.longitude.toFixed(4)}`;
          return {
            latitude: d.latitude,
            longitude: d.longitude,
            location: loc,
          };
        }
      }
    } catch { }
  }

  return null;
}
