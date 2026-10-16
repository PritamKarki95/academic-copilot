// Date helpers. "YYYY-MM-DD" strings are parsed as local dates so a due date
// never shifts by a day because of the viewer's time zone.

export function parseDueDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}.*)?$/.exec(s);
  if (!m) return null;
  const d = new Date(0);
  d.setFullYear(+m[1], +m[2] - 1, +m[3]);
  d.setHours(0, 0, 0, 0);
  if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
  if (s.includes("T") && Number.isNaN(Date.parse(s))) return null;
  return d;
}

export function daysUntil(s: string, now = new Date()): number | null {
  const d = parseDueDate(s);
  if (!d) return null;
  const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const b = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((b - a) / 86_400_000);
}

export function formatDueDate(s: string): string {
  const d = parseDueDate(s);
  if (!d) return s;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function daysLabel(days: number | null): string {
  if (days === null) return "Date unclear";
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? "" : "s"} ago`;
  if (days === 0) return "Due today";
  if (days === 1) return "Tomorrow";
  return `${days} days left`;
}

/** ISO date (YYYY-MM-DD) `n` days from today, in local time. */
export function isoDaysFromToday(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
