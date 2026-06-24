/** Format a duration in ms as a short human countdown ("1u 23m", "4m 12s", "9s"). */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "nu";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}u ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Local HH:mm for an ISO timestamp. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
