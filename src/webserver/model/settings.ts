export const MONTH_NAME_DEFAULTS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function normalizeTemperatureUnit(value: unknown): string {
  const unit = String(value == null ? "" : value).trim().toLowerCase();
  if (unit === "f" || unit === "\u00B0f" || unit === "fahrenheit") return "\u00B0F";
  if (unit === "c" || unit === "\u00B0c" || unit === "celsius" || unit === "centigrade") return "\u00B0C";
  return "Auto";
}

export function normalizeHour(value: unknown, fallback: number): number {
  const n = parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < 0) return 0;
  if (n > 23) return 23;
  return n;
}

export function normalizeScheduleWakeTimeout(value: unknown): number {
  const n = parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return 60;
  if (n < 10) return 10;
  if (n > 3600) return 3600;
  return Math.round(n);
}

export function normalizeScheduleWakeBrightness(value: unknown): number {
  const n = parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return 10;
  if (n < 10) return 10;
  if (n > 100) return 100;
  return Math.round(n);
}

export function normalizeScheduleClockBrightness(value: unknown): number {
  const n = parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return 10;
  if (n < 1) return 1;
  if (n > 100) return 100;
  return Math.round(n);
}

export function normalizeScheduleDimmedBrightness(value: unknown): number {
  const n = parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return 10;
  if (n < 1) return 1;
  if (n > 100) return 100;
  return Math.round(n);
}

export function normalizeScheduleMode(value: unknown): string {
  const mode = String(value || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (mode === "screen_dimmed" || mode === "dimmed" || mode === "always_on" || mode === "always") {
    return "screen_dimmed";
  }
  if (mode === "clock") return "clock";
  return "screen_off";
}

export function normalizeScreensaverAction(value: unknown): string {
  const action = String(value || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (action === "screen_dimmed" || action === "dimmed" || action === "dim") return "dim";
  if (action === "clock") return "clock";
  return "off";
}

export function screensaverActionOption(value: unknown): string {
  const action = normalizeScreensaverAction(value);
  if (action === "dim") return "Screen Dimmed";
  if (action === "clock") return "Clock";
  return "Display Off";
}

export function scheduleModeOption(value: unknown): string {
  const mode = normalizeScheduleMode(value);
  if (mode === "screen_dimmed") return "Screen Dimmed";
  if (mode === "clock") return "Clock";
  return "Screen off";
}

export function normalizeClockBrightness(value: unknown, fallback: number): number {
  const n = parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  if (n < 1) return 1;
  if (n > 100) return 100;
  return Math.round(n);
}

export function normalizeScreensaverDimmedBrightness(value: unknown): number {
  const n = parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return 10;
  if (n < 1) return 1;
  if (n > 100) return 100;
  return Math.round(n);
}

export function normalizeNtpServer(value: unknown, fallback: string): string {
  const server = String(value == null ? "" : value).trim();
  return server || fallback;
}

export function normalizeMonthNames(value: unknown): string[] {
  const parts = Array.isArray(value)
    ? value.slice()
    : String(value == null ? "" : value).split(",");
  const out: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const text = String(parts[i] == null ? "" : parts[i]).trim();
    out.push(text || MONTH_NAME_DEFAULTS[i] || "");
  }
  return out;
}

export function serializeMonthNames(value: unknown): string {
  return normalizeMonthNames(value).join(",");
}
