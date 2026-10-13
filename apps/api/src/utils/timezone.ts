/**
 * Timezone-aware timestamp formatting & calculation utility.
 * Ensures UTC cloud servers (e.g. Render Linux containers) accurately
 * evaluate shift arrival, departure, and daily cycles in the user's local timezone
 * (defaults to "Asia/Kolkata" for Indian Standard Time).
 */

export interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  totalMins: number; // e.g. 12:37 PM = 12 * 60 + 37 = 757 mins
  dateString: string; // YYYY-MM-DD
  timeString: string; // e.g. "12:37 PM"
  timeStringWithSeconds: string; // e.g. "12:37:50 PM"
}

export function getZonedDateParts(
  date: Date = new Date(),
  preferredTimezone?: string | null
): ZonedDateParts {
  const timeZone =
    preferredTimezone && preferredTimezone.trim()
      ? preferredTimezone.trim()
      : "Asia/Kolkata";

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const parts = formatter.formatToParts(date);
    const getVal = (type: string) => parts.find((p) => p.type === type)?.value || "0";

    const year = parseInt(getVal("year"), 10);
    const month = parseInt(getVal("month"), 10);
    const day = parseInt(getVal("day"), 10);
    let hour = parseInt(getVal("hour"), 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(getVal("minute"), 10);
    const second = parseInt(getVal("second"), 10);
    const totalMins = hour * 60 + minute;
    const dateString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const timeString = formatTimeInTimezone(date, timeZone, false);
    const timeStringWithSeconds = formatTimeInTimezone(date, timeZone, true);

    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      totalMins,
      dateString,
      timeString,
      timeStringWithSeconds,
    };
  } catch {
    // Fallback if Intl fails or invalid timezone
    const h = date.getHours();
    const m = date.getMinutes();
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return {
      year: y,
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: h,
      minute: m,
      second: date.getSeconds(),
      totalMins: h * 60 + m,
      dateString: `${y}-${mo}-${d}`,
      timeString: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timeStringWithSeconds: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
  }
}

export function formatTimeInTimezone(
  date: Date,
  preferredTimezone?: string | null,
  includeSeconds = false
): string {
  const candidateTz =
    preferredTimezone && preferredTimezone.trim()
      ? preferredTimezone.trim()
      : "Asia/Kolkata";

  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: candidateTz,
  };
  if (includeSeconds) {
    options.second = "2-digit";
  }

  try {
    return date.toLocaleTimeString("en-US", options);
  } catch {
    try {
      options.timeZone = "Asia/Kolkata";
      return date.toLocaleTimeString("en-US", options);
    } catch {
      delete options.timeZone;
      return date.toLocaleTimeString("en-US", options);
    }
  }
}

export function formatDateTimeInTimezone(
  date: Date,
  preferredTimezone?: string | null
): string {
  const candidateTz =
    preferredTimezone && preferredTimezone.trim()
      ? preferredTimezone.trim()
      : "Asia/Kolkata";

  try {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: candidateTz,
    });
  } catch {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  }
}
