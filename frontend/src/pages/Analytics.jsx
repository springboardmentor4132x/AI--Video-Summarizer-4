import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:8000";

export default function Analytics() {
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [videoAnalytics, setVideoAnalytics] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loggedInUser = localStorage.getItem("loggedInUser");

  useEffect(() => {
    if (!loggedInUser) {
      navigate("/login");
      return;
    }

    loadAnalytics();
  }, [loggedInUser, navigate]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      setError("");

      const [
        overviewResponse,
        processingResponse,
        dashboardResponse,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/stats/overview`),
        fetch(`${API_BASE_URL}/analytics/stats/processing`),
        fetch(`${API_BASE_URL}/analytics/stats/dashboard`),
      ]);

      if (!overviewResponse.ok) {
        throw new Error(
          "Unable to load analytics overview."
        );
      }

      if (!processingResponse.ok) {
        throw new Error(
          "Unable to load processing statistics."
        );
      }

      if (!dashboardResponse.ok) {
        throw new Error(
          "Unable to load dashboard statistics."
        );
      }

      const overviewData =
        await overviewResponse.json();

      const processingData =
        await processingResponse.json();

      const dashboardData =
        await dashboardResponse.json();

      setOverview(overviewData);
      setProcessing(processingData);
      setDashboardStats(dashboardData);

      // ---------------------------------------------
      // CURRENT VIDEO ANALYTICS
      // ---------------------------------------------

      const currentVideoKey =
        `currentVideo_${loggedInUser}`;

      const currentVideoData =
        localStorage.getItem(currentVideoKey);

      if (currentVideoData) {
        try {
          const currentVideo =
            JSON.parse(currentVideoData);

          if (
            currentVideo &&
            currentVideo.video_id
          ) {
            const videoResponse =
              await fetch(
                `${API_BASE_URL}/analytics/${currentVideo.video_id}`
              );

            if (videoResponse.ok) {
              const videoData =
                await videoResponse.json();

              if (!videoData.message) {
                setVideoAnalytics(videoData);
              } else {
                setVideoAnalytics(null);
              }
            }
          }
        } catch (videoError) {
          console.log(
            "Current video analytics unavailable:",
            videoError
          );

          setVideoAnalytics(null);
        }
      } else {
        setVideoAnalytics(null);
      }

    } catch (err) {
      console.error(
        "Analytics error:",
        err
      );

      setError(
        err.message ||
          "Unable to connect to the backend."
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // ======================================================
  // FORMAT TIME
  // ======================================================

  const formatSeconds = (seconds) => {
    if (
      seconds === null ||
      seconds === undefined ||
      Number.isNaN(Number(seconds))
    ) {
      return "0 sec";
    }

    const value = Number(seconds);

    if (value < 60) {
      return `${value.toFixed(1)} sec`;
    }

    const minutes = Math.floor(value / 60);

    const remainingSeconds =
      Math.round(value % 60);

    return `${minutes} min ${remainingSeconds} sec`;
  };


  const formatDuration = (seconds) => {
    if (
      seconds === null ||
      seconds === undefined ||
      Number.isNaN(Number(seconds))
    ) {
      return "0 sec";
    }

    const value = Number(seconds);

    if (value < 60) {
      return `${value.toFixed(0)} sec`;
    }

    const minutes = Math.floor(value / 60);

    const remainingSeconds =
      Math.round(value % 60);

    return `${minutes} min ${remainingSeconds} sec`;
  };


  // ======================================================
  // FORMAT DATE
  // ======================================================

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Date unavailable";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString();
  };


  // ======================================================
  // STATUS STYLE
  // ======================================================

  const getStatusStyle = (status) => {
    const normalized =
      String(status || "")
        .toLowerCase()
        .replace(/\s+/g, "");

    if (
      normalized.includes("complete") ||
      normalized.includes("success")
    ) {
      return {
        background: "#dcfce7",
        color: "#166534",
      };
    }

    if (
      normalized.includes("fail") ||
      normalized.includes("error")
    ) {
      return {
        background: "#fee2e2",
        color: "#991b1b",
      };
    }

    if (
      normalized.includes("process") ||
      normalized.includes("upload")
    ) {
      return {
        background: "#fef3c7",
        color: "#92400e",
      };
    }

    return {
      background: "#e0e7ff",
      color: "#3730a3",
    };
  };


  // ======================================================
  // STAT CARD
  // ======================================================

  const StatCard = ({
    title,
    value,
    description,
    icon,
  }) => {
    return (
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "18px",
          padding: "22px",
          minHeight: "145px",
          boxShadow:
            "0 8px 24px rgba(15, 23, 42, 0.06)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div
            style={{
              minWidth: 0,
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "13px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {title}
            </p>

            <h2
              style={{
                margin: "9px 0 0",
                fontSize: "32px",
                color: "#0f172a",
                lineHeight: "1.1",
                wordBreak: "break-word",
              }}
            >
              {value}
            </h2>
          </div>

          <div
            style={{
              width: "46px",
              height: "46px",
              minWidth: "46px",
              borderRadius: "14px",
              background: "#eef2ff",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "22px",
            }}
          >
            {icon}
          </div>
        </div>

        <p
          style={{
            margin: "16px 0 0",
            color: "#94a3b8",
            fontSize: "12px",
            lineHeight: "1.5",
          }}
        >
          {description}
        </p>
      </div>
    );
  };


  // ======================================================
  // SECTION TITLE
  // ======================================================

  const SectionTitle = ({
    title,
    description,
  }) => {
    return (
      <div
        style={{
          marginBottom: "16px",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#0f172a",
            fontSize: "21px",
          }}
        >
          {title}
        </h2>

        {description && (
          <p
            style={{
              margin: "5px 0 0",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            {description}
          </p>
        )}
      </div>
    );
  };


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f7fb",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "40px 30px",
            width: "100%",
            maxWidth: "430px",
            textAlign: "center",
            boxShadow:
              "0 10px 30px rgba(15, 23, 42, 0.08)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontSize: "42px",
              marginBottom: "15px",
            }}
          >
            📊
          </div>

          <h2
            style={{
              margin: "0 0 10px",
              color: "#0f172a",
            }}
          >
            Loading Analytics
          </h2>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              lineHeight: "1.6",
            }}
          >
            Retrieving real analytics from
            the backend...
          </p>
        </div>
      </div>
    );
  }


  const topKeywords =
    dashboardStats?.top_keywords || [];

  const statusBreakdown =
    dashboardStats?.status_breakdown || [];

  const latestUpload =
    dashboardStats?.latest_upload;


  // ======================================================
  // MAIN DASHBOARD
  // ======================================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <header
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "22px",
            padding: "24px",
            marginBottom: "25px",
            boxShadow:
              "0 10px 30px rgba(15, 23, 42, 0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "18px",
            flexWrap: "wrap",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              minWidth: 0,
            }}
          >
            <p
              style={{
                margin: "0 0 5px",
                color: "#6366f1",
                fontSize: "13px",
                fontWeight: "800",
                letterSpacing: "1px",
              }}
            >
              CLIPMIND AI
            </p>

            <h1
              style={{
                margin: 0,
                color: "#0f172a",
                fontSize:
                  "clamp(25px, 4vw, 34px)",
                lineHeight: "1.2",
              }}
            >
              Analytics Dashboard
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                color: "#64748b",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
            >
              Real content, processing and
              usage statistics.
            </p>
          </div>

          <button
            onClick={loadAnalytics}
            disabled={refreshing}
            style={{
              border: "none",
              background: refreshing
                ? "#a5b4fc"
                : "#4f46e5",
              color: "#ffffff",
              padding: "12px 18px",
              borderRadius: "11px",
              cursor: refreshing
                ? "not-allowed"
                : "pointer",
              fontWeight: "700",
              fontSize: "14px",
              minWidth: "105px",
            }}
          >
            {refreshing
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>
        </header>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div
            style={{
              background: "#fff7ed",
              border: "1px solid #fdba74",
              color: "#9a3412",
              padding: "16px",
              borderRadius: "14px",
              marginBottom: "25px",
              lineHeight: "1.5",
            }}
          >
            <strong>
              Analytics connection problem
            </strong>

            <div
              style={{
                marginTop: "5px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          </div>
        )}


        {/* =================================================
            CONTENT OVERVIEW
        ================================================= */}

        <section>
          <SectionTitle
            title="Content Overview"
            description="Overall content stored in the backend."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "16px",
            }}
          >
            <StatCard
              title="Total Videos"
              value={
                overview?.total_videos ?? 0
              }
              description="Videos stored in MongoDB"
              icon="🎬"
            />

            <StatCard
              title="Total Keywords"
              value={
                overview?.total_keywords ?? 0
              }
              description="Keyword records available"
              icon="🔑"
            />

            <StatCard
              title="Key Moments"
              value={
                overview?.total_key_moments ?? 0
              }
              description="Important moments detected"
              icon="⭐"
            />

            <StatCard
              title="Summaries"
              value={
                overview?.videos_with_summary ?? 0
              }
              description="Videos with generated summaries"
              icon="📝"
            />
          </div>
        </section>


        {/* =================================================
            PROCESSING STATISTICS
        ================================================= */}

        <section
          style={{
            marginTop: "32px",
          }}
        >
          <SectionTitle
            title="Processing Statistics"
            description="Processing information recorded by the analytics service."
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            <StatCard
              title="Processed Videos"
              value={
                processing?.total_processed_videos ??
                0
              }
              description="Videos with analytics records"
              icon="⚙️"
            />

            <StatCard
              title="Average Processing"
              value={formatSeconds(
                processing?.average_processing_time ??
                  0
              )}
              description="Average processing time"
              icon="⏱️"
            />
          </div>
        </section>


        {/* =================================================
            TOP KEYWORDS + STATUS
        ================================================= */}

        <section
          style={{
            marginTop: "32px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "18px",
            }}
          >

            {/* ============================================
                TOP KEYWORDS
            ============================================ */}

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "18px",
                padding: "22px",
                boxShadow:
                  "0 8px 24px rgba(15, 23, 42, 0.06)",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      color: "#0f172a",
                      fontSize: "20px",
                    }}
                  >
                    Top Keywords
                  </h2>

                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#64748b",
                      fontSize: "13px",
                    }}
                  >
                    Most frequently stored keywords
                  </p>
                </div>

                <span
                  style={{
                    fontSize: "24px",
                  }}
                >
                  🔑
                </span>
              </div>


              {topKeywords.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {topKeywords.map(
                    (item, index) => {

                      const maxCount =
                        Math.max(
                          ...topKeywords.map(
                            (keyword) =>
                              Number(
                                keyword.count || 0
                              )
                          ),
                          1
                        );

                      const width =
                        (
                          Number(
                            item.count || 0
                          ) /
                          maxCount
                        ) * 100;

                      return (
                        <div
                          key={`${item.keyword}-${index}`}
                          style={{
                            padding: "10px 0",
                            borderBottom:
                              index ===
                              topKeywords.length - 1
                                ? "none"
                                : "1px solid #f1f5f9",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              gap: "10px",
                              marginBottom: "7px",
                            }}
                          >
                            <span
                              style={{
                                color: "#334155",
                                fontWeight: "600",
                                fontSize: "14px",
                                wordBreak:
                                  "break-word",
                              }}
                            >
                              {index + 1}.{" "}
                              {item.keyword}
                            </span>

                            <strong
                              style={{
                                color: "#4f46e5",
                                fontSize: "13px",
                              }}
                            >
                              {item.count}
                            </strong>
                          </div>

                          <div
                            style={{
                              width: "100%",
                              height: "7px",
                              background: "#eef2ff",
                              borderRadius: "20px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${width}%`,
                                height: "100%",
                                background: "#6366f1",
                                borderRadius: "20px",
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding: "30px 10px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: "14px",
                  }}
                >
                  No keyword data is
                  available yet.
                </div>
              )}
            </div>


            {/* ============================================
                STATUS BREAKDOWN
            ============================================ */}

            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "18px",
                padding: "22px",
                boxShadow:
                  "0 8px 24px rgba(15, 23, 42, 0.06)",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      color: "#0f172a",
                      fontSize: "20px",
                    }}
                  >
                    Status Breakdown
                  </h2>

                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#64748b",
                      fontSize: "13px",
                    }}
                  >
                    Current video processing statuses
                  </p>
                </div>

                <span
                  style={{
                    fontSize: "24px",
                  }}
                >
                  📌
                </span>
              </div>


              {statusBreakdown.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {statusBreakdown.map(
                    (item, index) => {

                      const total =
                        statusBreakdown.reduce(
                          (sum, current) =>
                            sum +
                            Number(
                              current.count || 0
                            ),
                          0
                        ) || 1;

                      const percentage =
                        (
                          Number(
                            item.count || 0
                          ) /
                          total
                        ) * 100;

                      const statusStyle =
                        getStatusStyle(
                          item.status
                        );

                      return (
                        <div
                          key={`${item.status}-${index}`}
                          style={{
                            padding: "14px",
                            background: "#f8fafc",
                            borderRadius: "12px",
                            border:
                              "1px solid #f1f5f9",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              alignItems: "center",
                              gap: "10px",
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              style={{
                                display:
                                  "inline-block",
                                padding:
                                  "6px 10px",
                                borderRadius:
                                  "20px",
                                background:
                                  statusStyle.background,
                                color:
                                  statusStyle.color,
                                fontWeight: "700",
                                fontSize: "12px",
                              }}
                            >
                              {item.status}
                            </span>

                            <strong
                              style={{
                                color: "#0f172a",
                                fontSize: "15px",
                              }}
                            >
                              {item.count} videos
                            </strong>
                          </div>

                          <div
                            style={{
                              marginTop: "10px",
                              height: "7px",
                              background: "#e2e8f0",
                              borderRadius: "20px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${percentage}%`,
                                height: "100%",
                                background: "#6366f1",
                                borderRadius: "20px",
                              }}
                            />
                          </div>

                          <p
                            style={{
                              margin:
                                "6px 0 0",
                              color: "#94a3b8",
                              fontSize: "11px",
                              textAlign:
                                "right",
                            }}
                          >
                            {percentage.toFixed(
                              1
                            )}
                            %
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding: "30px 10px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: "14px",
                  }}
                >
                  No video status data
                  is available yet.
                </div>
              )}
            </div>
          </div>
        </section>


        {/* =================================================
            LATEST UPLOAD
        ================================================= */}

        <section
          style={{
            marginTop: "32px",
          }}
        >
          <SectionTitle
            title="Latest Upload"
            description="Most recently uploaded video recorded by the backend."
          />

          {latestUpload ? (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "18px",
                padding: "22px",
                boxShadow:
                  "0 8px 24px rgba(15, 23, 42, 0.06)",
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "18px",
                boxSizing: "border-box",
              }}
            >

              <div>
                <p
                  style={{
                    margin: "0 0 7px",
                    color: "#94a3b8",
                    fontSize: "12px",
                    fontWeight: "700",
                    textTransform:
                      "uppercase",
                  }}
                >
                  File
                </p>

                <h3
                  style={{
                    margin: 0,
                    color: "#0f172a",
                    fontSize: "17px",
                    wordBreak:
                      "break-word",
                  }}
                >
                  {latestUpload.filename}
                </h3>
              </div>


              <div>
                <p
                  style={{
                    margin: "0 0 7px",
                    color: "#94a3b8",
                    fontSize: "12px",
                    fontWeight: "700",
                    textTransform:
                      "uppercase",
                  }}
                >
                  Status
                </p>

                <span
                  style={{
                    display: "inline-block",
                    padding: "7px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "700",
                    ...getStatusStyle(
                      latestUpload.status
                    ),
                  }}
                >
                  {latestUpload.status}
                </span>
              </div>


              <div>
                <p
                  style={{
                    margin: "0 0 7px",
                    color: "#94a3b8",
                    fontSize: "12px",
                    fontWeight: "700",
                    textTransform:
                      "uppercase",
                  }}
                >
                  Uploaded At
                </p>

                <p
                  style={{
                    margin: 0,
                    color: "#334155",
                    fontSize: "14px",
                    lineHeight: "1.5",
                  }}
                >
                  {formatDate(
                    latestUpload.uploaded_at
                  )}
                </p>
              </div>


              <div>
                <p
                  style={{
                    margin: "0 0 7px",
                    color: "#94a3b8",
                    fontSize: "12px",
                    fontWeight: "700",
                    textTransform:
                      "uppercase",
                  }}
                >
                  Video ID
                </p>

                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                    fontSize: "12px",
                    wordBreak:
                      "break-all",
                  }}
                >
                  {latestUpload.video_id}
                </p>
              </div>

            </div>
          ) : (
            <div
              style={{
                background: "#ffffff",
                border:
                  "1px solid #e5e7eb",
                borderRadius: "18px",
                padding:
                  "30px 20px",
                textAlign: "center",
                color: "#64748b",
                boxShadow:
                  "0 8px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div
                style={{
                  fontSize: "35px",
                  marginBottom: "8px",
                }}
              >
                🎥
              </div>

              <strong
                style={{
                  display: "block",
                  color: "#334155",
                  marginBottom: "5px",
                }}
              >
                No uploads available
              </strong>

              <span
                style={{
                  fontSize: "13px",
                }}
              >
                Upload a video to see the
                latest upload here.
              </span>
            </div>
          )}
        </section>


        {/* =================================================
            CURRENT VIDEO ANALYTICS
        ================================================= */}

        <section
          style={{
            marginTop: "32px",
          }}
        >
          <SectionTitle
            title="Current Video Analytics"
            description="Detailed analytics for the currently selected video."
          />

          {videoAnalytics ? (
            <div
              style={{
                background: "#ffffff",
                border:
                  "1px solid #e5e7eb",
                borderRadius: "18px",
                padding: "22px",
                boxShadow:
                  "0 8px 24px rgba(15, 23, 42, 0.06)",
                boxSizing: "border-box",
              }}
            >

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "center",
                  gap: "15px",
                  flexWrap: "wrap",
                  marginBottom: "20px",
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                  }}
                >
                  <h3
                    style={{
                      margin:
                        "0 0 6px",
                      color: "#0f172a",
                      fontSize: "18px",
                    }}
                  >
                    Video Processing
                    Details
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      color: "#94a3b8",
                      fontSize: "12px",
                      wordBreak:
                        "break-all",
                    }}
                  >
                    Video ID:{" "}
                    {videoAnalytics.video_id}
                  </p>
                </div>

                <span
                  style={{
                    padding:
                      "7px 12px",
                    borderRadius:
                      "20px",
                    background:
                      videoAnalytics.summary_generated
                        ? "#dcfce7"
                        : "#f1f5f9",
                    color:
                      videoAnalytics.summary_generated
                        ? "#166534"
                        : "#64748b",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  {videoAnalytics.summary_generated
                    ? "Summary Available"
                    : "Summary Not Available"}
                </span>
              </div>


              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: "12px",
                }}
              >

                <div
                  style={{
                    background:
                      "#f8fafc",
                    padding: "17px",
                    borderRadius:
                      "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "22px",
                    }}
                  >
                    🎥
                  </span>

                  <p
                    style={{
                      margin:
                        "8px 0 3px",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    Duration
                  </p>

                  <strong
                    style={{
                      color: "#0f172a",
                      fontSize: "18px",
                    }}
                  >
                    {formatDuration(
                      videoAnalytics.duration_seconds
                    )}
                  </strong>
                </div>


                <div
                  style={{
                    background:
                      "#f8fafc",
                    padding: "17px",
                    borderRadius:
                      "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "22px",
                    }}
                  >
                    ⚡
                  </span>

                  <p
                    style={{
                      margin:
                        "8px 0 3px",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    Processing
                  </p>

                  <strong
                    style={{
                      color: "#0f172a",
                      fontSize: "18px",
                    }}
                  >
                    {formatSeconds(
                      videoAnalytics.processing_time_seconds
                    )}
                  </strong>
                </div>


                <div
                  style={{
                    background:
                      "#f8fafc",
                    padding: "17px",
                    borderRadius:
                      "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "22px",
                    }}
                  >
                    📖
                  </span>

                  <p
                    style={{
                      margin:
                        "8px 0 3px",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    Words
                  </p>

                  <strong
                    style={{
                      color: "#0f172a",
                      fontSize: "18px",
                    }}
                  >
                    {videoAnalytics.word_count ??
                      0}
                  </strong>
                </div>


                <div
                  style={{
                    background:
                      "#f8fafc",
                    padding: "17px",
                    borderRadius:
                      "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "22px",
                    }}
                  >
                    🔑
                  </span>

                  <p
                    style={{
                      margin:
                        "8px 0 3px",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    Keywords
                  </p>

                  <strong
                    style={{
                      color: "#0f172a",
                      fontSize: "18px",
                    }}
                  >
                    {videoAnalytics.keyword_count ??
                      0}
                  </strong>
                </div>


                <div
                  style={{
                    background:
                      "#f8fafc",
                    padding: "17px",
                    borderRadius:
                      "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "22px",
                    }}
                  >
                    ⭐
                  </span>

                  <p
                    style={{
                      margin:
                        "8px 0 3px",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    Key Moments
                  </p>

                  <strong
                    style={{
                      color: "#0f172a",
                      fontSize: "18px",
                    }}
                  >
                    {videoAnalytics.key_moment_count ??
                      0}
                  </strong>
                </div>

              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#ffffff",
                border:
                  "1px solid #e5e7eb",
                borderRadius: "18px",
                padding:
                  "30px 20px",
                textAlign: "center",
                color: "#64748b",
                boxShadow:
                  "0 8px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              <div
                style={{
                  fontSize: "35px",
                  marginBottom: "8px",
                }}
              >
                📈
              </div>

              <strong
                style={{
                  display: "block",
                  color: "#334155",
                  marginBottom: "5px",
                }}
              >
                No current video
                analytics
              </strong>

              <span
                style={{
                  fontSize: "13px",
                }}
              >
                Detailed analytics will
                appear when analytics data
                exists for the current video.
              </span>
            </div>
          )}
        </section>


        {/* =================================================
            NAVIGATION
        ================================================= */}

        <div
          style={{
            marginTop: "32px",
            paddingBottom: "20px",
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <button
            onClick={() =>
              navigate("/dashboard")
            }
            style={{
              padding: "11px 18px",
              border: "none",
              borderRadius: "10px",
              background: "#111827",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: "700",
            }}
          >
            Dashboard
          </button>

          <button
            onClick={() =>
              navigate("/history")
            }
            style={{
              padding: "11px 18px",
              border:
                "1px solid #d1d5db",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Upload History
          </button>

          <button
            onClick={() =>
              navigate("/results")
            }
            style={{
              padding: "11px 18px",
              border:
                "1px solid #d1d5db",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Results
          </button>

          <button
            onClick={() =>
              navigate("/key-moments")
            }
            style={{
              padding: "11px 18px",
              border:
                "1px solid #d1d5db",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Key Moments
          </button>

          <button
            onClick={() =>
              navigate("/keywords")
            }
            style={{
              padding: "11px 18px",
              border:
                "1px solid #d1d5db",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#334155",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Keywords
          </button>
        </div>

      </div>
    </div>
  );
}