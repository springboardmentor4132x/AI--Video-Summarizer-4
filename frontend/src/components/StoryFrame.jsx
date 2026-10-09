import { useEffect, useState } from "react";
import api from "../api";
import { formatTimestamp } from "../utils/time";

// One real video frame. Frames are auth-protected, so they're fetched as
// blobs (see api.getStoryFrameUrl). The whole frame is a button: clicking
// it opens the original video at this panel's timestamp, same as the
// explicit "Watch This Moment" button. Render with key={panel.panel_id}
// so state resets when a story is regenerated.
export default function StoryFrame({ panel, onWatch }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(!panel.frame_url);
  const time = formatTimestamp(panel.timestamp);

  useEffect(() => {
    if (!panel.frame_url) return undefined;
    let objectUrl = null;
    let cancelled = false;

    api
      .getStoryFrameUrl(panel.frame_url)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [panel.frame_url]);

  return (
    <button
      type="button"
      className="sp-frame"
      onClick={() => onWatch(panel)}
      aria-label={`Watch this moment at ${time}: ${panel.title}`}
    >
      {src ? (
        <img src={src} alt={`Frame from the video at ${time}`} />
      ) : (
        <span className="sp-frame-empty">
          {failed ? (
            <>
              <strong>{time}</strong>
              <span>Frame unavailable</span>
            </>
          ) : (
            <span>Loading frame...</span>
          )}
        </span>
      )}
      <span className="sp-frame-time" aria-hidden="true">
        {time}
      </span>
    </button>
  );
}
