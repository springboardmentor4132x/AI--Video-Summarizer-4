import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import api from "../api";

// Fetches the video as an authenticated blob (see api.getVideoFileUrl --
// a plain <video src> can't send an Authorization header) and exposes a
// seekTo(seconds) method via ref, so chapters/key moments/Q&A timestamps
// can all jump to a point in the video the same way.
const VideoPlayer = forwardRef(function VideoPlayer({ videoId, startAt = null }, ref) {
  const videoRef = useRef(null);
  const [src, setSrc] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    api
      .getVideoFileUrl(videoId)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch((err) => setError(err.message || "Unable to load video."));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoId]);

  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      if (videoRef.current) {
        videoRef.current.currentTime = seconds;
        videoRef.current.play().catch(() => {
          // Autoplay can be blocked by the browser -- not an error worth
          // surfacing, the video is still seeked and ready to play.
        });
      }
    },
    getCurrentTime() {
      return videoRef.current ? videoRef.current.currentTime : 0;
    },
    getDuration() {
      const d = videoRef.current ? videoRef.current.duration : 0;
      return Number.isFinite(d) ? d : 0;
    },
  }));

  if (error) {
    return <div className="page-state error">{error}</div>;
  }

  if (!src) {
    return <div className="page-state">Loading video...</div>;
  }

  // Deep link support (/video/:id?t=134): once the video's metadata is
  // known, jump to startAt, start playback and bring the player into view.
  const handleLoadedMetadata = () => {
    const el = videoRef.current;
    if (!el || startAt == null || !(startAt > 0)) return;
    el.currentTime = Math.min(startAt, el.duration || startAt);
    el.play().catch(() => {
      // Autoplay can be blocked -- the video is still seeked and ready.
    });
    if (el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      onLoadedMetadata={handleLoadedMetadata}
      style={{ width: "100%", maxHeight: "480px" }}
    >
      Your browser does not support video playback.
    </video>
  );
});

export default VideoPlayer;
