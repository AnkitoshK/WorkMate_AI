/**
 * Timezone-aware timestamp formatting utility
 * Ensures UTC cloud servers format times in the client's local timezone
 * (defaults to "Asia/Kolkata" for Indian Standard Time).
 */
export function formatTimeInTimezone(
  date: Date,
  preferredTimezone?: string | null
): string {
  const candidateTz =
    preferredTimezone && preferredTimezone.trim()
      ? preferredTimezone.trim()
      : "Asia/Kolkata";

  try {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: candidateTz,
    });
  } catch {
    try {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });
    } catch {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
  }
}
