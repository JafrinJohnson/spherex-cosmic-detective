/**
 * Coordinate parsing & formatting utilities for Right Ascension (RA) and Declination (Dec).
 *
 * Examples (unit-test-like reference cases):
 * - parseRA("133.7951")        -> 133.7951
 * - parseRA("08h55m10.83s")    -> 133.795125
 * - parseRA("08:55:10.83")     -> 133.795125
 * - parseRA("17h 57m 48.5s")   -> 269.452083...
 * - parseRA("400")             -> null (out of 0–360 range)
 *
 * - parseDec("-7.2451")        -> -7.2451
 * - parseDec("-07d14m42.5s")   -> -7.245138...
 * - parseDec("-07:14:42.5")    -> -7.245138...
 * - parseDec("+30d24m05.0s")   -> 30.401388...
 * - parseDec("-95")            -> null (out of -90 to +90 range)
 *
 * - formatRA(133.7951)         -> "08h 55m 10.82s"
 * - formatDec(-7.2451)         -> "-07d 14m 42.36s"
 */

/**
 * Parses a Right Ascension string in either decimal degrees (0–360)
 * or sexagesimal hours-minutes-seconds ("08h55m10.83s", "08:55:10.83").
 * Returns degrees in [0, 360] or null if invalid.
 */
export function parseRA(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Check if plain decimal number (optionally with trailing ° or deg)
  const decimalMatch = /^([+-]?\d+(?:\.\d+)?)\s*(?:°|deg)?$/i.exec(trimmed);
  if (decimalMatch) {
    const val = Number(decimalMatch[1]);
    if (!Number.isFinite(val) || val < 0 || val > 360) return null;
    return Number(val.toFixed(6));
  }

  // Sexagesimal RA: e.g. "08h55m10.83s", "08:55:10.83", "08 55 10.83"
  const sexaMatch =
    /^(\d{1,2})\s*(?:h|:|\s)\s*(\d{1,2})(?:\s*(?:m|:|\s)\s*(\d{1,2}(?:\.\d+)?)\s*s?)?$/i.exec(
      trimmed
    );
  if (sexaMatch) {
    const hours = Number(sexaMatch[1]);
    const minutes = Number(sexaMatch[2]);
    const seconds = sexaMatch[3] !== undefined ? Number(sexaMatch[3]) : 0;

    if (
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes) ||
      !Number.isFinite(seconds)
    ) {
      return null;
    }
    if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) {
      return null;
    }
    const totalDegrees = (hours + minutes / 60 + seconds / 3600) * 15;
    if (totalDegrees < 0 || totalDegrees > 360) return null;
    return Number(totalDegrees.toFixed(6));
  }

  return null;
}

/**
 * Parses a Declination string in either decimal degrees (-90 to +90)
 * or sexagesimal degrees-arcminutes-arcseconds ("-07d14m42.5s", "-07:14:42.5").
 * Returns degrees in [-90, 90] or null if invalid.
 */
export function parseDec(input: string): number | null {
  const trimmed = input.trim().replace(/\u2212/g, "-"); // Normalize Unicode minus
  if (!trimmed) return null;

  // Check if plain decimal degrees
  const decimalMatch = /^([+-]?\d+(?:\.\d+)?)\s*(?:°|deg)?$/i.exec(trimmed);
  if (decimalMatch) {
    const val = Number(decimalMatch[1]);
    if (!Number.isFinite(val) || val < -90 || val > 90) return null;
    return Number(val.toFixed(6));
  }

  // Sexagesimal Dec: e.g. "-07d14m42.5s", "-07:14:42.5", "+30°24'05.0\""
  const sexaMatch =
    /^([+-])?\s*(\d{1,2})\s*(?:d|°|:|\s)\s*(\d{1,2})(?:\s*(?:m|'|′|:|\s)\s*(\d{1,2}(?:\.\d+)?)\s*(?:s|"|″)?)?$/i.exec(
      trimmed
    );
  if (sexaMatch) {
    const sign = sexaMatch[1] === "-" ? -1 : 1;
    const deg = Number(sexaMatch[2]);
    const arcmin = Number(sexaMatch[3]);
    const arcsec = sexaMatch[4] !== undefined ? Number(sexaMatch[4]) : 0;

    if (
      !Number.isFinite(deg) ||
      !Number.isFinite(arcmin) ||
      !Number.isFinite(arcsec)
    ) {
      return null;
    }
    if (deg < 0 || deg > 90 || arcmin < 0 || arcmin >= 60 || arcsec < 0 || arcsec >= 60) {
      return null;
    }

    const total = sign * (deg + arcmin / 60 + arcsec / 3600);
    if (total < -90 || total > 90) return null;
    return Number(total.toFixed(6));
  }

  return null;
}

/**
 * Formats decimal degrees (0–360) into sexagesimal RA string ("08h55m10.82s").
 */
export function formatRA(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const totalHours = normalized / 15;
  const h = Math.floor(totalHours);
  const remMin = (totalHours - h) * 60;
  const m = Math.floor(remMin);
  const s = (remMin - m) * 60;

  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = s.toFixed(2).padStart(5, "0");
  return `${hh}h${mm}m${ss}s`;
}

/**
 * Formats decimal degrees (-90 to +90) into sexagesimal Dec string ("-07d14m42.36s").
 */
export function formatDec(deg: number): string {
  const clamped = Math.max(-90, Math.min(90, deg));
  const sign = clamped < 0 ? "-" : "+";
  const abs = Math.abs(clamped);
  const d = Math.floor(abs);
  const remMin = (abs - d) * 60;
  const m = Math.floor(remMin);
  const s = (remMin - m) * 60;

  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = s.toFixed(1).padStart(4, "0");
  return `${sign}${dd}d${mm}m${ss}s`;
}

/**
 * Converts J2000 Right Ascension and Declination (in degrees) to 3D Cartesian [x, y, z]
 * on a sphere of given radius.
 */
export function raDecToXYZ(
  raDeg: number,
  decDeg: number,
  radius = 1.9
): [number, number, number] {
  const raRad = (raDeg * Math.PI) / 180;
  const decRad = (decDeg * Math.PI) / 180;
  const x = radius * Math.cos(decRad) * Math.cos(raRad);
  const y = radius * Math.sin(decRad);
  const z = radius * Math.cos(decRad) * Math.sin(raRad);
  return [x, y, z];
}

