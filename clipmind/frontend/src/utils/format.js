/** 1536 -> "1.5 KB". Used by the Educator and Administrator dashboards. */
export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

/** 0.456 -> "46%"; null/undefined -> "—" (unknown is never shown as 0%). */
export function formatPercent(ratio) {
  return ratio === null || ratio === undefined ? "—" : `${Math.round(ratio * 100)}%`;
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
