import { formatTimestamp } from "../utils/time";

// Small "play at this time" button used wherever a result points at the video.
export default function WatchChip({ start, end, label = "Watch", onWatch }) {
  const range = end != null && Math.floor(end) !== Math.floor(start)
    ? `${formatTimestamp(start)}-${formatTimestamp(end)}`
    : formatTimestamp(start);
  return (
    <button type="button" className="watch-chip" onClick={() => onWatch(start)}>
      <span aria-hidden="true">▶</span> {label} <span className="watch-chip-time">{range}</span>
    </button>
  );
}
