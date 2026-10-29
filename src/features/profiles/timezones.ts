/** IANA time zones supported by the runtime (always includes UTC). */
export function getTimeZones(): string[] {
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return zones.includes("UTC") ? zones : ["UTC", ...zones];
}
