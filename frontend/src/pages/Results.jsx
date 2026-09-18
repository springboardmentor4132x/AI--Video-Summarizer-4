import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function Results() {
  const navigate = useNavigate();

  const [currentVideo, setCurrentVideo] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [summary, setSummary] = useState(null);
  const [keyMoments, setKeyMoments] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [overviewStats, setOverviewStats] = useState(null);
  const [processingStats, setProcessingStats] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Responsive state
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    setError("");

    try {
      const email = localStorage.getItem("loggedInUser");

      if (!email) {
        navigate("/login");
        return;
      }

      const storedVideo = localStorage.getItem(`currentVideo_${email}`);
      const storedHistory = localStorage.getItem(`uploadHistory_${email}`);

      if (storedHistory) {
        try {
          const parsedHistory = JSON.parse(storedHistory);
          setHistory(Array.isArray(parsedHistory) ? parsedHistory : []);
        } catch {
          setHistory([]);
        }
      } else {
        setHistory([]);
      }

      if (!storedVideo) {
        setCurrentVideo(null);
        setLoading(false);
        return;
      }

      let video;

      try {
        video = JSON.parse(storedVideo);
      } catch {
        setCurrentVideo(null);
        setLoading(false);
        setError("Unable to read the current video information.");
        return;
      }

      setCurrentVideo(video);

      const videoId = video?.video_id || video?.id;

      if (!videoId) {
        setLoading(false);
        setError("Video ID not found.");
        return;
      }

      const endpoints = {
        transcript: `${API_BASE_URL}/transcripts/${videoId}`,
        summary: `${API_BASE_URL}/summaries/${videoId}`,
        keyMoments: `${API_BASE_URL}/key-moments/${videoId}`,
        keywords: `${API_BASE_URL}/keywords/${videoId}`,
        analytics: `${API_BASE_URL}/analytics/${videoId}`,
        overview: `${API_BASE_URL}/analytics/stats/overview`,
        processing: `${API_BASE_URL}/analytics/stats/processing`,
        dashboard: `${API_BASE_URL}/analytics/stats/dashboard`,
      };

      const results = await Promise.allSettled(
        Object.values(endpoints).map((url) =>
          fetch(url, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          })
        )
      );

      const endpointNames = Object.keys(endpoints);
      const responseData = {};

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const name = endpointNames[i];

        if (result.status === "fulfilled") {
          try {
            if (result.value.ok) {
              responseData[name] = await result.value.json();
            } else {
              responseData[name] = null;
            }
          } catch {
            responseData[name] = null;
          }
        } else {
          responseData[name] = null;
        }
      }

      // Transcript
      const transcriptData = responseData.transcript;

      if (
        transcriptData &&
        typeof transcriptData.transcript === "string" &&
        transcriptData.transcript.trim()
      ) {
        setTranscript(transcriptData);
      } else {
        setTranscript(null);
      }

      // Summary
      const summaryData = responseData.summary;

      if (
        summaryData &&
        (summaryData.short_summary?.trim() ||
          summaryData.detailed_summary?.trim())
      ) {
        setSummary(summaryData);
      } else {
        setSummary(null);
      }

      // Key Moments
      const keyMomentsData = responseData.keyMoments;

      if (Array.isArray(keyMomentsData)) {
        setKeyMoments(keyMomentsData);
      } else if (Array.isArray(keyMomentsData?.key_moments)) {
        setKeyMoments(keyMomentsData.key_moments);
      } else {
        setKeyMoments([]);
      }

      // Keywords
      const keywordsData = responseData.keywords;

      if (Array.isArray(keywordsData)) {
        setKeywords(keywordsData);
      } else if (Array.isArray(keywordsData?.keywords)) {
        setKeywords(keywordsData.keywords);
      } else {
        setKeywords([]);
      }

      // Current video analytics
      setAnalytics(responseData.analytics || null);

      // Overall analytics
      setOverviewStats(responseData.overview || null);
      setProcessingStats(responseData.processing || null);
      setDashboardStats(responseData.dashboard || null);
    } catch (err) {
      console.error("Results loading error:", err);
      setError("Unable to load the results.");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined || seconds === "") {
      return "Not available";
    }

    const value = Number(seconds);

    if (Number.isNaN(value)) {
      return "Not available";
    }

    const totalSeconds = Math.max(0, Math.round(value));

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }

    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }

    return `${secs}s`;
  };

  const getAnalyticsValue = (...keys) => {
    if (!analytics) {
      return null;
    }

    for (const key of keys) {
      if (
        analytics[key] !== undefined &&
        analytics[key] !== null &&
        analytics[key] !== ""
      ) {
        return analytics[key];
      }
    }

    return null;
  };

  const getKeywordText = (keyword) => {
    if (typeof keyword === "string") {
      return keyword;
    }

    if (!keyword || typeof keyword !== "object") {
      return "";
    }

    return (
      keyword.keyword ||
      keyword.word ||
      keyword.name ||
      keyword.text ||
      keyword.value ||
      ""
    );
  };

  const getHighlightText = (moment) => {
    if (!moment || typeof moment !== "object") {
      return "";
    }

    return (
      moment.highlight ||
      moment.segment ||
      moment.description ||
      moment.title ||
      ""
    );
  };

  const videoId = currentVideo?.video_id || currentVideo?.id;

  const duration = getAnalyticsValue(
    "duration_seconds",
    "duration",
    "video_duration"
  );

  const processingTime = getAnalyticsValue(
    "processing_time_seconds",
    "processing_time"
  );

  const wordCount = getAnalyticsValue(
    "word_count",
    "words",
    "total_words"
  );

  const keywordCountFromAnalytics = getAnalyticsValue(
    "keyword_count",
    "keywords_count",
    "total_keywords"
  );

  const keyMomentCountFromAnalytics = getAnalyticsValue(
    "key_moment_count",
    "key_moments_count",
    "total_key_moments"
  );

  const transcriptWordCount = transcript?.transcript
    ? transcript.transcript.trim().split(/\s+/).filter(Boolean).length
    : null;

  const finalWordCount =
    wordCount !== null && wordCount !== undefined
      ? wordCount
      : transcriptWordCount;

  const finalKeywordCount =
    keywordCountFromAnalytics !== null &&
    keywordCountFromAnalytics !== undefined
      ? keywordCountFromAnalytics
      : keywords.length;

  const finalKeyMomentCount =
    keyMomentCountFromAnalytics !== null &&
    keyMomentCountFromAnalytics !== undefined
      ? keyMomentCountFromAnalytics
      : keyMoments.length;

  const averageProcessingTime =
    processingStats?.average_processing_time ??
    processingStats?.avg_processing_time;

  const totalVideos =
    overviewStats?.total_videos ??
    dashboardStats?.total_videos ??
    null;

  const totalTranscripts =
    overviewStats?.total_transcripts ??
    dashboardStats?.total_transcripts ??
    null;

  const totalSummaries =
    overviewStats?.total_summaries ??
    dashboardStats?.total_summaries ??
    null;

  const totalKeywords =
    overviewStats?.total_keywords ??
    dashboardStats?.total_keywords ??
    null;

  const totalKeyMoments =
    overviewStats?.total_key_moments ??
    dashboardStats?.total_key_moments ??
    null;

  const processedVideos =
    overviewStats?.processed_videos ??
    dashboardStats?.processed_videos ??
    null;

  const latestUpload =
    dashboardStats?.latest_upload ||
    dashboardStats?.latest_video ||
    overviewStats?.latest_upload ||
    null;

  const statusBreakdown =
    processingStats?.status_breakdown ||
    processingStats?.statuses ||
    dashboardStats?.status_breakdown ||
    null;

  const pageGridColumns = isMobile
    ? "1fr"
    : "repeat(2, minmax(0, 1fr))";

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>⏳</div>
          <h2 style={styles.loadingTitle}>Loading Video Results...</h2>
          <p style={styles.loadingText}>
            Retrieving transcript, summary, key moments, keywords and
            analytics from the backend.
          </p>
        </div>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyPageCard}>
          <div style={styles.emptyIcon}>🎬</div>

          <h2 style={styles.emptyTitle}>No Video Selected</h2>

          <p style={styles.emptyText}>
            Upload a video first to view its transcript, summary, key moments,
            keywords and analytics.
          </p>

          <button
            style={styles.primaryButton}
            onClick={() => navigate("/upload")}
          >
            📤 Upload Video
          </button>

          <button
            style={styles.secondaryButton}
            onClick={() => navigate("/dashboard")}
          >
            🏠 Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <div style={styles.brand}>CLIPMIND AI</div>

          <h1 style={styles.title}>📊 Video Results</h1>

          <p style={styles.subtitle}>
            Transcript, summary, key moments, highlights, keywords and
            analytics for your uploaded video.
          </p>
        </div>

        <button
          style={styles.headerButton}
          onClick={() => navigate("/dashboard")}
        >
          🏠 Dashboard
        </button>
      </header>

      {/* ERROR */}
      {error && (
        <div style={styles.errorBox}>
          <strong>⚠️ {error}</strong>
          <div style={styles.errorSmall}>
            The page can still display any backend data that is available.
          </div>
        </div>
      )}

      {/* VIDEO INFORMATION */}
      <section style={styles.videoInfoCard}>
        <div style={styles.videoInfoItem}>
          <span style={styles.infoLabel}>🎬 Video Name</span>

          <span style={styles.infoValue}>
            {currentVideo.filename || "Unknown video"}
          </span>
        </div>

        <div style={styles.videoInfoItem}>
          <span style={styles.infoLabel}>🆔 Video ID</span>

          <span style={styles.infoValue}>
            {videoId || "Not available"}
          </span>
        </div>

        <div style={styles.videoInfoItem}>
          <span style={styles.infoLabel}>📌 Status</span>

          <span
            style={{
              ...styles.statusBadge,
              backgroundColor:
                currentVideo.status === "Completed"
                  ? "#dcfce7"
                  : "#fef3c7",
              color:
                currentVideo.status === "Completed"
                  ? "#166534"
                  : "#92400e",
            }}
          >
            {currentVideo.status || "Uploaded"}
          </span>
        </div>
      </section>

      {/* MAIN RESULTS GRID */}
      <main
        style={{
          ...styles.resultsGrid,
          gridTemplateColumns: pageGridColumns,
        }}
      >
        {/* TRANSCRIPT */}
        <section style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleRow}>
              <span style={styles.sectionIcon}>📝</span>
              <h2 style={styles.sectionTitle}>Transcript</h2>
            </div>

            <span
              style={{
                ...styles.countBadge,
                backgroundColor: transcript ? "#dcfce7" : "#f1f5f9",
                color: transcript ? "#166534" : "#64748b",
              }}
            >
              {transcript ? "Available" : "Waiting"}
            </span>
          </div>

          {transcript?.transcript ? (
            <div style={styles.contentBox}>
              <p style={styles.transcriptText}>
                {transcript.transcript}
              </p>
            </div>
          ) : (
            <div style={styles.emptySection}>
              <div style={styles.emptySectionIcon}>📝</div>

              <h3 style={styles.emptySectionTitle}>
                No Transcript Available
              </h3>

              <p style={styles.emptySectionText}>
                The backend has not generated a transcript for this video yet.
              </p>
            </div>
          )}
        </section>

        {/* SUMMARY */}
        <section style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleRow}>
              <span style={styles.sectionIcon}>📄</span>
              <h2 style={styles.sectionTitle}>Summary</h2>
            </div>

            <span
              style={{
                ...styles.countBadge,
                backgroundColor: summary ? "#dcfce7" : "#f1f5f9",
                color: summary ? "#166534" : "#64748b",
              }}
            >
              {summary ? "Available" : "Waiting"}
            </span>
          </div>

          {summary ? (
            <div style={styles.summaryContainer}>
              {summary.short_summary && (
                <div style={styles.summaryBlock}>
                  <h3 style={styles.subHeading}>Short Summary</h3>

                  <p style={styles.bodyText}>
                    {summary.short_summary}
                  </p>
                </div>
              )}

              {summary.detailed_summary && (
                <div style={styles.summaryBlock}>
                  <h3 style={styles.subHeading}>Detailed Summary</h3>

                  <p style={styles.bodyText}>
                    {summary.detailed_summary}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.emptySection}>
              <div style={styles.emptySectionIcon}>📄</div>

              <h3 style={styles.emptySectionTitle}>
                No Summary Available
              </h3>

              <p style={styles.emptySectionText}>
                The backend has not generated a summary for this video yet.
              </p>
            </div>
          )}
        </section>

        {/* KEY MOMENTS */}
        <section style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleRow}>
              <span style={styles.sectionIcon}>⭐</span>
              <h2 style={styles.sectionTitle}>Key Moments</h2>
            </div>

            <span style={styles.countBadge}>
              {finalKeyMomentCount ?? 0}
            </span>
          </div>

          {keyMoments.length > 0 ? (
            <div style={styles.listContainer}>
              {keyMoments.map((moment, index) => (
                <div
                  key={moment.id || `${moment.timestamp}-${index}`}
                  style={styles.momentCard}
                >
                  <div style={styles.momentTop}>
                    <span style={styles.timestampBadge}>
                      ⏱️ {moment.timestamp || "Timestamp unavailable"}
                    </span>

                    {moment.importance && (
                      <span style={styles.importanceBadge}>
                        {moment.importance}
                      </span>
                    )}
                  </div>

                  {moment.segment && (
                    <p style={styles.momentSegment}>
                      {moment.segment}
                    </p>
                  )}

                  {moment.highlight && (
                    <p style={styles.momentHighlight}>
                      ✨ {moment.highlight}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptySection}>
              <div style={styles.emptySectionIcon}>⭐</div>

              <h3 style={styles.emptySectionTitle}>
                No Key Moments Available
              </h3>

              <p style={styles.emptySectionText}>
                Important moments will appear here after backend processing.
              </p>
            </div>
          )}
        </section>

        {/* HIGHLIGHTS */}
        <section style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleRow}>
              <span style={styles.sectionIcon}>✨</span>
              <h2 style={styles.sectionTitle}>Highlights</h2>
            </div>

            <span style={styles.countBadge}>
              {keyMoments.length}
            </span>
          </div>

          {keyMoments.length > 0 ? (
            <div style={styles.listContainer}>
              {keyMoments.map((moment, index) => {
                const highlight = getHighlightText(moment);

                return (
                  <div
                    key={`highlight-${moment.id || index}`}
                    style={styles.highlightCard}
                  >
                    <div style={styles.highlightNumber}>
                      {index + 1}
                    </div>

                    <div style={styles.highlightContent}>
                      <div style={styles.highlightTimestamp}>
                        ⏱️{" "}
                        {moment.timestamp ||
                          "Timestamp unavailable"}
                      </div>

                      <p style={styles.highlightText}>
                        {highlight || "Highlight information unavailable."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.emptySection}>
              <div style={styles.emptySectionIcon}>✨</div>

              <h3 style={styles.emptySectionTitle}>
                No Highlights Available
              </h3>

              <p style={styles.emptySectionText}>
                Highlights will be shown when key moments are generated.
              </p>
            </div>
          )}
        </section>

        {/* KEYWORDS */}
        <section style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleRow}>
              <span style={styles.sectionIcon}>🔑</span>
              <h2 style={styles.sectionTitle}>Keywords</h2>
            </div>

            <span style={styles.countBadge}>
              {finalKeywordCount ?? 0}
            </span>
          </div>

          {keywords.length > 0 ? (
            <div style={styles.keywordContainer}>
              {keywords.map((keyword, index) => {
                const text = getKeywordText(keyword);

                if (!text) {
                  return null;
                }

                return (
                  <span
                    key={`${text}-${index}`}
                    style={styles.keywordBadge}
                  >
                    🔑 {text}
                  </span>
                );
              })}
            </div>
          ) : (
            <div style={styles.emptySection}>
              <div style={styles.emptySectionIcon}>🔑</div>

              <h3 style={styles.emptySectionTitle}>
                No Keywords Available
              </h3>

              <p style={styles.emptySectionText}>
                No keywords have been generated for this video yet.
              </p>
            </div>
          )}
        </section>

        {/* ANALYTICS */}
        <section style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleRow}>
              <span style={styles.sectionIcon}>📊</span>
              <h2 style={styles.sectionTitle}>Analytics</h2>
            </div>

            <span
              style={{
                ...styles.countBadge,
                backgroundColor: analytics
                  ? "#dcfce7"
                  : "#f1f5f9",
                color: analytics ? "#166534" : "#64748b",
              }}
            >
              {analytics ? "Available" : "Waiting"}
            </span>
          </div>

          {analytics ? (
            <div
              style={{
                ...styles.analyticsGrid,
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
              }}
            >
              <div style={styles.analyticsCard}>
                <span style={styles.analyticsIcon}>⏱️</span>

                <span style={styles.analyticsLabel}>
                  Duration
                </span>

                <strong style={styles.analyticsValue}>
                  {formatDuration(duration)}
                </strong>
              </div>

              <div style={styles.analyticsCard}>
                <span style={styles.analyticsIcon}>⚙️</span>

                <span style={styles.analyticsLabel}>
                  Processing Time
                </span>

                <strong style={styles.analyticsValue}>
                  {formatDuration(processingTime)}
                </strong>
              </div>

              <div style={styles.analyticsCard}>
                <span style={styles.analyticsIcon}>📝</span>

                <span style={styles.analyticsLabel}>
                  Words
                </span>

                <strong style={styles.analyticsValue}>
                  {finalWordCount ?? "Not available"}
                </strong>
              </div>

              <div style={styles.analyticsCard}>
                <span style={styles.analyticsIcon}>🔑</span>

                <span style={styles.analyticsLabel}>
                  Keywords
                </span>

                <strong style={styles.analyticsValue}>
                  {finalKeywordCount ?? 0}
                </strong>
              </div>

              <div style={styles.analyticsCard}>
                <span style={styles.analyticsIcon}>⭐</span>

                <span style={styles.analyticsLabel}>
                  Key Moments
                </span>

                <strong style={styles.analyticsValue}>
                  {finalKeyMomentCount ?? 0}
                </strong>
              </div>
            </div>
          ) : (
            <div style={styles.emptySection}>
              <div style={styles.emptySectionIcon}>📊</div>

              <h3 style={styles.emptySectionTitle}>
                Analytics Not Available
              </h3>

              <p style={styles.emptySectionText}>
                Detailed analytics will appear after the backend processes
                this video.
              </p>
            </div>
          )}
        </section>

        {/* CONTENT INSIGHTS */}
        <section style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleRow}>
              <span style={styles.sectionIcon}>💡</span>
              <h2 style={styles.sectionTitle}>Content Insights</h2>
            </div>

            <span style={styles.countBadge}>
              {transcript || summary || keywords.length > 0
                ? "Available"
                : "Waiting"}
            </span>
          </div>

          {transcript || summary || keywords.length > 0 ? (
            <div style={styles.insightsContainer}>
              <div style={styles.insightItem}>
                <span style={styles.insightIcon}>📝</span>

                <div>
                  <strong style={styles.insightTitle}>
                    Transcript
                  </strong>

                  <p style={styles.insightText}>
                    {transcript
                      ? "Transcript data is available for this video."
                      : "Transcript is not available yet."}
                  </p>
                </div>
              </div>

              <div style={styles.insightItem}>
                <span style={styles.insightIcon}>📄</span>

                <div>
                  <strong style={styles.insightTitle}>
                    Summary
                  </strong>

                  <p style={styles.insightText}>
                    {summary
                      ? "AI-generated summary data is available."
                      : "Summary is not available yet."}
                  </p>
                </div>
              </div>

              <div style={styles.insightItem}>
                <span style={styles.insightIcon}>🔑</span>

                <div>
                  <strong style={styles.insightTitle}>
                    Keywords
                  </strong>

                  <p style={styles.insightText}>
                    {keywords.length > 0
                      ? `${keywords.length} keyword(s) are available.`
                      : "Keywords are not available yet."}
                  </p>
                </div>
              </div>

              <div style={styles.insightItem}>
                <span style={styles.insightIcon}>⭐</span>

                <div>
                  <strong style={styles.insightTitle}>
                    Key Moments
                  </strong>

                  <p style={styles.insightText}>
                    {keyMoments.length > 0
                      ? `${keyMoments.length} important moment(s) detected.`
                      : "Key moments are not available yet."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.emptySection}>
              <div style={styles.emptySectionIcon}>💡</div>

              <h3 style={styles.emptySectionTitle}>
                Content Insights Waiting
              </h3>

              <p style={styles.emptySectionText}>
                Content insights will become meaningful after transcript,
                summary and AI analysis data are generated.
              </p>
            </div>
          )}
        </section>

        {/* USAGE REPORTS */}
        <section style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleRow}>
              <span style={styles.sectionIcon}>📈</span>
              <h2 style={styles.sectionTitle}>Usage Reports</h2>
            </div>

            <span style={styles.countBadge}>
              Backend
            </span>
          </div>

          {overviewStats || processingStats || dashboardStats ? (
            <div
              style={{
                ...styles.analyticsGrid,
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
              }}
            >
              <div style={styles.reportCard}>
                <span style={styles.reportLabel}>
                  Total Videos
                </span>

                <strong style={styles.reportValue}>
                  {totalVideos ?? "Not available"}
                </strong>
              </div>

              <div style={styles.reportCard}>
                <span style={styles.reportLabel}>
                  Transcripts
                </span>

                <strong style={styles.reportValue}>
                  {totalTranscripts ?? "Not available"}
                </strong>
              </div>

              <div style={styles.reportCard}>
                <span style={styles.reportLabel}>
                  Summaries
                </span>

                <strong style={styles.reportValue}>
                  {totalSummaries ?? "Not available"}
                </strong>
              </div>

              <div style={styles.reportCard}>
                <span style={styles.reportLabel}>
                  Keywords
                </span>

                <strong style={styles.reportValue}>
                  {totalKeywords ?? "Not available"}
                </strong>
              </div>

              <div style={styles.reportCard}>
                <span style={styles.reportLabel}>
                  Key Moments
                </span>

                <strong style={styles.reportValue}>
                  {totalKeyMoments ?? "Not available"}
                </strong>
              </div>

              <div style={styles.reportCard}>
                <span style={styles.reportLabel}>
                  Processed Videos
                </span>

                <strong style={styles.reportValue}>
                  {processedVideos ?? "Not available"}
                </strong>
              </div>

              <div style={styles.reportCard}>
                <span style={styles.reportLabel}>
                  Average Processing
                </span>

                <strong style={styles.reportValue}>
                  {averageProcessingTime !== null &&
                  averageProcessingTime !== undefined
                    ? `${averageProcessingTime} sec`
                    : "Not available"}
                </strong>
              </div>

              <div style={styles.reportCard}>
                <span style={styles.reportLabel}>
                  Latest Activity
                </span>

                <strong
                  style={{
                    ...styles.reportValue,
                    fontSize: "14px",
                  }}
                >
                  {latestUpload?.filename ||
                    latestUpload?.video_name ||
                    "Backend data available"}
                </strong>
              </div>
            </div>
          ) : (
            <div style={styles.emptySection}>
              <div style={styles.emptySectionIcon}>📈</div>

              <h3 style={styles.emptySectionTitle}>
                Usage Data Not Available
              </h3>

              <p style={styles.emptySectionText}>
                Usage information will appear when analytics data is
                available from the backend.
              </p>
            </div>
          )}

          {statusBreakdown && (
            <div style={styles.statusBreakdown}>
              <h3 style={styles.subHeading}>
                Processing Status
              </h3>

              {typeof statusBreakdown === "object" ? (
                Object.entries(statusBreakdown).map(
                  ([status, value]) => (
                    <div
                      key={status}
                      style={styles.statusRow}
                    >
                      <span style={styles.statusName}>
                        {status}
                      </span>

                      <strong style={styles.statusValue}>
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : value}
                      </strong>
                    </div>
                  )
                )
              ) : (
                <div style={styles.statusRow}>
                  <span style={styles.statusName}>
                    Status
                  </span>

                  <strong style={styles.statusValue}>
                    {statusBreakdown}
                  </strong>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* UPLOAD HISTORY */}
      <section style={styles.historyCard}>
        <div style={styles.sectionHeader}>
          <div style={styles.sectionTitleRow}>
            <span style={styles.sectionIcon}>📚</span>
            <h2 style={styles.sectionTitle}>
              Upload History
            </h2>
          </div>

          <span style={styles.countBadge}>
            {history.length}
          </span>
        </div>

        {history.length > 0 ? (
          <div style={styles.historyList}>
            {history.map((item, index) => (
              <div
                key={item.video_id || item.id || index}
                style={styles.historyItem}
              >
                <div style={styles.historyMain}>
                  <strong style={styles.historyFilename}>
                    🎬 {item.filename || "Unknown video"}
                  </strong>

                  <span style={styles.historyId}>
                    ID: {item.video_id || item.id || "Not available"}
                  </span>
                </div>

                <div style={styles.historyMeta}>
                  <span
                    style={{
                      ...styles.historyStatus,
                      backgroundColor:
                        item.status === "Completed"
                          ? "#dcfce7"
                          : "#fef3c7",
                      color:
                        item.status === "Completed"
                          ? "#166534"
                          : "#92400e",
                    }}
                  >
                    {item.status || "Uploaded"}
                  </span>

                  <span style={styles.historyDate}>
                    {item.uploaded_at
                      ? new Date(item.uploaded_at).toLocaleString()
                      : "Date unavailable"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyHistory}>
            <div style={styles.emptySectionIcon}>📚</div>

            <h3 style={styles.emptySectionTitle}>
              No Upload History
            </h3>

            <p style={styles.emptySectionText}>
              Your uploaded videos will appear here.
            </p>
          </div>
        )}
      </section>

      {/* ACTION BUTTONS */}
      <section style={styles.actionsCard}>
        <button
          style={styles.primaryButton}
          onClick={() => navigate("/upload")}
        >
          📤 Upload Another Video
        </button>

        <button
          style={styles.secondaryButton}
          onClick={() => navigate("/history")}
        >
          📚 Full History
        </button>

        <button
          style={styles.secondaryButton}
          onClick={() => navigate("/analytics")}
        >
          📊 Analytics Dashboard
        </button>

        <button
          style={styles.secondaryButton}
          onClick={() => navigate("/dashboard")}
        >
          🏠 Dashboard
        </button>
      </section>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #eef2ff 0%, #f8fafc 50%, #ecfeff 100%)",
    padding: "24px",
    boxSizing: "border-box",
    fontFamily:
      "Inter, Arial, Helvetica, sans-serif",
    color: "#0f172a",
  },

  header: {
    maxWidth: "1200px",
    margin: "0 auto 20px",
    padding: "24px",
    background: "#ffffff",
    borderRadius: "18px",
    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    boxSizing: "border-box",
  },

  brand: {
    fontSize: "13px",
    fontWeight: "800",
    letterSpacing: "2px",
    color: "#4f46e5",
    marginBottom: "8px",
  },

  title: {
    margin: "0",
    fontSize: "30px",
    fontWeight: "800",
    color: "#111827",
  },

  subtitle: {
    margin: "8px 0 0",
    fontSize: "14px",
    color: "#64748b",
    lineHeight: "1.6",
  },

  headerButton: {
    border: "none",
    borderRadius: "10px",
    padding: "12px 18px",
    background: "#111827",
    color: "#ffffff",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  errorBox: {
    maxWidth: "1200px",
    margin: "0 auto 18px",
    padding: "14px 18px",
    borderRadius: "12px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    boxSizing: "border-box",
  },

  errorSmall: {
    marginTop: "5px",
    fontSize: "13px",
    color: "#b91c1c",
  },

  videoInfoCard: {
    maxWidth: "1200px",
    margin: "0 auto 20px",
    padding: "20px",
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.07)",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    boxSizing: "border-box",
  },

  videoInfoItem: {
    minWidth: 0,
    padding: "14px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },

  infoLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },

  infoValue: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#1e293b",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },

  statusBadge: {
    width: "fit-content",
    padding: "5px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "800",
  },

  resultsGrid: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "grid",
    gap: "20px",
    alignItems: "stretch",
  },

  sectionCard: {
    minWidth: 0,
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.07)",
    border: "1px solid rgba(226, 232, 240, 0.8)",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  historyCard: {
    maxWidth: "1200px",
    margin: "20px auto 0",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.07)",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },

  sectionTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    minWidth: 0,
  },

  sectionIcon: {
    fontSize: "22px",
    flexShrink: 0,
  },

  sectionTitle: {
    margin: "0",
    fontSize: "19px",
    fontWeight: "800",
    color: "#111827",
    overflowWrap: "anywhere",
  },

  countBadge: {
    flexShrink: 0,
    padding: "5px 9px",
    borderRadius: "999px",
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: "11px",
    fontWeight: "800",
    whiteSpace: "nowrap",
  },

  contentBox: {
    maxHeight: "330px",
    overflowY: "auto",
    padding: "15px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    boxSizing: "border-box",
  },

  transcriptText: {
    margin: "0",
    fontSize: "14px",
    lineHeight: "1.8",
    color: "#334155",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },

  summaryContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },

  summaryBlock: {
    padding: "14px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  subHeading: {
    margin: "0 0 8px",
    fontSize: "14px",
    fontWeight: "800",
    color: "#334155",
  },

  bodyText: {
    margin: "0",
    fontSize: "14px",
    lineHeight: "1.7",
    color: "#475569",
    overflowWrap: "anywhere",
  },

  emptySection: {
    minHeight: "220px",
    padding: "20px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    boxSizing: "border-box",
  },

  emptySectionIcon: {
    fontSize: "38px",
    marginBottom: "10px",
  },

  emptySectionTitle: {
    margin: "0",
    fontSize: "16px",
    fontWeight: "800",
    color: "#334155",
  },

  emptySectionText: {
    maxWidth: "380px",
    margin: "8px auto 0",
    fontSize: "13px",
    lineHeight: "1.6",
    color: "#64748b",
    overflowWrap: "anywhere",
  },

  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxHeight: "350px",
    overflowY: "auto",
    paddingRight: "2px",
  },

  momentCard: {
    padding: "13px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    minWidth: 0,
  },

  momentTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  timestampBadge: {
    display: "inline-block",
    padding: "5px 8px",
    borderRadius: "7px",
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: "11px",
    fontWeight: "800",
  },

  importanceBadge: {
    display: "inline-block",
    padding: "5px 8px",
    borderRadius: "7px",
    background: "#fef3c7",
    color: "#92400e",
    fontSize: "11px",
    fontWeight: "800",
  },

  momentSegment: {
    margin: "10px 0 0",
    fontSize: "13px",
    lineHeight: "1.6",
    color: "#334155",
    overflowWrap: "anywhere",
  },

  momentHighlight: {
    margin: "7px 0 0",
    fontSize: "13px",
    lineHeight: "1.6",
    color: "#475569",
    overflowWrap: "anywhere",
  },

  highlightCard: {
    display: "flex",
    gap: "12px",
    padding: "13px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    minWidth: 0,
  },

  highlightNumber: {
    width: "30px",
    height: "30px",
    minWidth: "30px",
    borderRadius: "50%",
    background: "#ede9fe",
    color: "#6d28d9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "13px",
  },

  highlightContent: {
    minWidth: 0,
    flex: 1,
  },

  highlightTimestamp: {
    fontSize: "11px",
    fontWeight: "800",
    color: "#64748b",
    marginBottom: "5px",
  },

  highlightText: {
    margin: "0",
    fontSize: "13px",
    lineHeight: "1.6",
    color: "#334155",
    overflowWrap: "anywhere",
  },

  keywordContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "9px",
    alignItems: "flex-start",
  },

  keywordBadge: {
    display: "inline-flex",
    alignItems: "center",
    maxWidth: "100%",
    padding: "8px 11px",
    borderRadius: "999px",
    background: "#eef2ff",
    color: "#4338ca",
    border: "1px solid #c7d2fe",
    fontSize: "12px",
    fontWeight: "700",
    overflowWrap: "anywhere",
  },

  analyticsGrid: {
    display: "grid",
    gap: "10px",
    width: "100%",
  },

  analyticsCard: {
    minWidth: 0,
    padding: "14px 10px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    boxSizing: "border-box",
    overflow: "hidden",
  },

  analyticsIcon: {
    fontSize: "20px",
    marginBottom: "6px",
  },

  analyticsLabel: {
    fontSize: "10px",
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    overflowWrap: "anywhere",
  },

  analyticsValue: {
    marginTop: "5px",
    fontSize: "14px",
    fontWeight: "800",
    color: "#1e293b",
    maxWidth: "100%",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  insightsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  insightItem: {
    display: "flex",
    gap: "11px",
    alignItems: "flex-start",
    padding: "12px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    minWidth: 0,
  },

  insightIcon: {
    fontSize: "20px",
    flexShrink: 0,
  },

  insightTitle: {
    display: "block",
    fontSize: "13px",
    color: "#334155",
  },

  insightText: {
    margin: "4px 0 0",
    fontSize: "12px",
    lineHeight: "1.5",
    color: "#64748b",
    overflowWrap: "anywhere",
  },

  reportCard: {
    minWidth: 0,
    padding: "13px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    boxSizing: "border-box",
  },

  reportLabel: {
    fontSize: "10px",
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },

  reportValue: {
    fontSize: "18px",
    fontWeight: "800",
    color: "#1e293b",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  statusBreakdown: {
    marginTop: "16px",
    padding: "14px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "9px 0",
    borderBottom: "1px solid #e2e8f0",
  },

  statusName: {
    fontSize: "13px",
    color: "#475569",
    overflowWrap: "anywhere",
  },

  statusValue: {
    fontSize: "13px",
    color: "#1e293b",
    textAlign: "right",
    overflowWrap: "anywhere",
  },

  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    padding: "13px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    boxSizing: "border-box",
  },

  historyMain: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  historyFilename: {
    fontSize: "13px",
    color: "#1e293b",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
  },

  historyId: {
    fontSize: "11px",
    color: "#64748b",
    overflowWrap: "anywhere",
  },

  historyMeta: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "5px",
    flexShrink: 0,
  },

  historyStatus: {
    padding: "5px 8px",
    borderRadius: "999px",
    fontSize: "10px",
    fontWeight: "800",
  },

  historyDate: {
    fontSize: "10px",
    color: "#64748b",
    whiteSpace: "nowrap",
  },

  emptyHistory: {
    padding: "30px 15px",
    textAlign: "center",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
  },

  actionsCard: {
    maxWidth: "1200px",
    margin: "20px auto 0",
    padding: "20px",
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.07)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    boxSizing: "border-box",
  },

  primaryButton: {
    border: "none",
    borderRadius: "10px",
    padding: "12px 17px",
    background: "#4f46e5",
    color: "#ffffff",
    fontWeight: "800",
    cursor: "pointer",
    fontSize: "13px",
  },

  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "12px 17px",
    background: "#ffffff",
    color: "#334155",
    fontWeight: "700",
    cursor: "pointer",
    fontSize: "13px",
  },

  loadingCard: {
    maxWidth: "500px",
    margin: "100px auto",
    padding: "35px 25px",
    background: "#ffffff",
    borderRadius: "18px",
    textAlign: "center",
    boxShadow: "0 10px 35px rgba(15, 23, 42, 0.08)",
  },

  loadingIcon: {
    fontSize: "45px",
    marginBottom: "10px",
  },

  loadingTitle: {
    margin: "0",
    fontSize: "22px",
    color: "#1e293b",
  },

  loadingText: {
    margin: "10px 0 0",
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#64748b",
  },

  emptyPageCard: {
    maxWidth: "550px",
    margin: "100px auto",
    padding: "40px 25px",
    background: "#ffffff",
    borderRadius: "18px",
    textAlign: "center",
    boxShadow: "0 10px 35px rgba(15, 23, 42, 0.08)",
  },

  emptyIcon: {
    fontSize: "55px",
    marginBottom: "12px",
  },

  emptyTitle: {
    margin: "0",
    fontSize: "24px",
    fontWeight: "800",
    color: "#1e293b",
  },

  emptyText: {
    margin: "10px auto 20px",
    maxWidth: "430px",
    fontSize: "14px",
    lineHeight: "1.7",
    color: "#64748b",
  },
};