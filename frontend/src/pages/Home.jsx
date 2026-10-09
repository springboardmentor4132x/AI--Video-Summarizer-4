import { Link } from "react-router-dom";
import PublicNav from "../components/PublicNav";
import api from "../api";
import "../home.css";

const features = [
  {
    id: "upload",
    title: "Upload Video",
    description: "Add a lesson, meeting, or talk to your library.",
    path: "/upload",
    icon: "↑",
    kind: "upload",
  },
  {
    id: "history",
    title: "Upload History",
    description: "Return to videos you have already uploaded.",
    path: "/history",
    icon: "▤",
    kind: "history",
  },
  {
    id: "storyboards",
    title: "Storyboards",
    description: "Generate visual summaries of key moments.",
    kind: "storyboard",
    path: "/story",
  },
  {
    id: "summaries",
    title: "Real-Time Summaries",
    description: "Get clear takeaways from every video.",
    kind: "summary",
    path: "/live-summaries",
  },
  {
    id: "search",
    title: "Cross-Video Search",
    description: "Find topics across your entire video library.",
    kind: "search",
    path: "/timemachine",
  },
  {
    id: "memory-deck",
    title: "Memory Deck",
    description: "Review key ideas with adaptive flashcards.",
    icon: "▧",
    kind: "memory",
    path: "/memory-deck",
  },
  {
    id: "revision",
    title: "5-Minute Revision",
    description: "Turn video notes into a quick study session.",
    icon: "◷",
    kind: "revision",
    path: "/revision",
  },
  {
    id: "video-dna",
    title: "Video DNA",
    description: "Explore topics, structure, and key moments.",
    icon: "⌁",
    kind: "dna",
    path: "/video-dna",
  },
  {
    id: "evidence",
    title: "Evidence Lens",
    description: "Get answers grounded in transcript evidence.",
    icon: "⌕",
    kind: "evidence",
    path: "/evidence",
  },
  {
    id: "compare",
    title: "Compare Videos",
    description: "Compare ideas and takeaways across videos.",
    icon: "⇄",
    kind: "compare",
    path: "/compare",
  },
  {
    id: "daily",
    title: "Daily Learning",
    description: "Build a focused learning plan from your videos.",
    icon: "☼",
    kind: "daily",
    path: "/daily",
  },
  {
    id: "shared",
    title: "Shared Videos",
    description: "Open videos shared with you by others.",
    icon: "↗",
    kind: "shared",
    path: "/shared",
  },
  {
    id: "analytics",
    title: "Analytics",
    description: "See activity and insights across your library.",
    icon: "▥",
    kind: "analytics",
    path: "/analytics",
  },
  {
    id: "content-insights",
    title: "Content Insights",
    description: "Understand themes and patterns in your videos.",
    icon: "◉",
    kind: "insights",
    path: "/content-insights",
  },
  {
    id: "usage-reports",
    title: "Usage Reports",
    description: "Review usage and processing reports.",
    icon: "▦",
    kind: "reports",
    path: "/usage-reports",
  },
];

function MiniPreview({ feature }) {
  const { kind } = feature;
  if (kind === "upload") {
    return (
      <div className="home-illustration home-illustration-upload" aria-hidden="true">
        <div className="home-illustration-window"><i /><i /><i /><span className="home-illustration-play">▶</span></div>
        <span className="home-illustration-cloud">☁</span>
        <span className="home-illustration-upload-arrow">⬆</span>
      </div>
    );
  }
  if (kind === "history") {
    return (
      <div className="home-illustration home-illustration-history" aria-hidden="true">
        <div className="home-illustration-history-window"><i /><span /><span /><span /><span /></div>
        <span className="home-illustration-clock">◷</span>
      </div>
    );
  }
  if (kind === "storyboard") {
    return (
      <div className="home-mini-board" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => <span key={index} />)}
      </div>
    );
  }
  if (kind === "summary") {
    return (
      <div className="home-mini-summary" aria-hidden="true">
        <div className="home-mini-toolbar"><i /><i /><i /></div>
        <div className="home-mini-line long" />
        <div className="home-mini-line" />
        <div className="home-mini-line short" />
        <span className="home-mini-live">LIVE</span>
      </div>
    );
  }
  if (kind === "search") {
    return (
      <div className="home-mini-search" aria-hidden="true">
        <div className="home-mini-search-title"><span>⌕</span> Search videos</div>
        <div className="home-mini-result"><b>▶</b> Product strategy <time>00:05</time></div>
        <div className="home-mini-result"><b>▶</b> Research methods <time>39:05</time></div>
      </div>
    );
  }
  if (kind === "memory") {
    return (
      <div className="home-illustration home-illustration-memory" aria-hidden="true">
        <div className="home-illustration-card card-back" />
        <div className="home-illustration-card card-middle" />
        <div className="home-illustration-card card-front"><span>✿</span><i /><i /></div>
        <span className="home-illustration-cloud">☁</span>
      </div>
    );
  }
  if (kind === "revision") {
    return (
      <div className="home-illustration home-illustration-revision" aria-hidden="true">
        <span className="home-illustration-timer">◷</span>
        <div className="home-illustration-note"><i /><i /><i /><b>✓</b></div>
        <span className="home-illustration-pencil">✎</span>
      </div>
    );
  }
  if (kind === "dna") {
    return (
      <div className="home-illustration home-illustration-dna" aria-hidden="true">
        <span className="home-illustration-helix">〰</span>
        <div className="home-illustration-frame"><i /><i /><i /><i /></div>
        <div className="home-illustration-frame secondary"><i /><i /><i /><i /></div>
      </div>
    );
  }
  if (kind === "evidence") {
    return (
      <div className="home-illustration home-illustration-evidence" aria-hidden="true">
        <div className="home-illustration-wave-window"><i /><i /><i /><i /><i /><i /><i /></div>
        <span className="home-illustration-lens">⌕</span>
      </div>
    );
  }
  if (kind === "compare") {
    return (
      <div className="home-illustration home-illustration-compare" aria-hidden="true">
        <div className="home-illustration-screen"><span>▶</span><i /></div>
        <span className="home-illustration-compare-link">↔</span>
        <div className="home-illustration-screen second"><span>▶</span><i /></div>
      </div>
    );
  }
  if (kind === "daily") {
    return (
      <div className="home-illustration home-illustration-daily" aria-hidden="true">
        <div className="home-illustration-calendar"><span /><i /><i /><i /><i /><i /><i /></div>
        <span className="home-illustration-target">◎</span>
        <div className="home-illustration-phone"><i /><i /><i /></div>
      </div>
    );
  }
  if (kind === "shared") {
    return (
      <div className="home-illustration home-illustration-shared" aria-hidden="true">
        <div className="home-illustration-screen"><span>↗</span><i /></div>
        <span className="home-illustration-share">●</span>
        <div className="home-illustration-screen second"><span>▶</span><i /></div>
      </div>
    );
  }
  if (kind === "analytics") {
    return (
      <div className="home-illustration home-illustration-analytics" aria-hidden="true">
        <div className="home-illustration-chart"><i /><i /><i /><i /><i /><span>↗</span></div>
      </div>
    );
  }
  if (kind === "insights") {
    return (
      <div className="home-illustration home-illustration-insights" aria-hidden="true">
        <span className="home-illustration-bulb">✦</span>
        <div className="home-illustration-mini-panel"><i /><i /><i /></div>
        <div className="home-illustration-mini-frame"><i /></div>
      </div>
    );
  }
  if (kind === "reports") {
    return (
      <div className="home-illustration home-illustration-reports" aria-hidden="true">
        <div className="home-illustration-clipboard"><i /><i /><i /><span>▥</span></div>
        <span className="home-illustration-pie">◕</span>
      </div>
    );
  }

  return (
    <div className={`home-feature-icon home-feature-icon-${feature.kind}`} aria-hidden="true">
      <span>{feature.icon}</span>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="home-product" aria-label="ClipMind video analysis preview">
      <div className="home-product-window">
        <div className="home-window-bar">
          <span className="home-window-dots"><i /><i /><i /></span>
          <span>ClipMind <b>AI</b></span>
          <span className="home-window-tools">▰ ▣ ⌕ ×</span>
        </div>
        <div className="home-editor">
          <div className="home-waveform" aria-hidden="true">
            {Array.from({ length: 39 }, (_, index) => (
              <i key={index} style={{ "--bar": `${18 + ((index * 37) % 72)}%` }} />
            ))}
          </div>
          <div className="home-video-scene" aria-label="Video preview">
            <div className="home-sun" />
            <div className="home-horizon" />
            <div className="home-audience">
              {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
            </div>
          </div>
          <div className="home-player-controls">
            <span className="home-play-icon" aria-hidden="true" />
            <div className="home-player-track"><i /></div>
            <span>04:18</span>
          </div>
          <div className="home-analysis-popover">
            <b>KEY MOMENTS</b>
            <span><i /> Opening idea</span>
            <span><i /> Main argument</span>
            <span><i /> Key takeaway</span>
          </div>
        </div>
        <div className="home-editor-bottom">
          <span>TRANSCRIPT</span><span>SUMMARY</span><span>CHAPTERS</span>
        </div>
      </div>
      <div className="home-float-panel">
        <b>VIDEO SUMMARY</b>
        <span /><span /><span />
        <i>3 key ideas found</i>
      </div>
      <div className="home-storyboard-strip" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <span className="home-storyboard-thumb" key={index}>
            <i />
            <b>Scene 0{index + 1}</b>
          </span>
        ))}
      </div>
      <div className="home-equalizer home-equalizer-orange" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => <i key={index} style={{ "--bar": `${26 + ((index * 31) % 68)}%` }} />)}
      </div>
      <div className="home-equalizer home-equalizer-cyan" aria-hidden="true">
        {Array.from({ length: 13 }, (_, index) => <i key={index} style={{ "--bar": `${20 + ((index * 29) % 72)}%` }} />)}
      </div>
    </div>
  );
}

export default function Home() {
  const authenticated = api.isAuthed();

  return (
    <main className="home-page">
      <PublicNav />

      <div className="home-content" id="home">
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="home-kicker"><span /> VIDEO KNOWLEDGE, UNLOCKED</p>
            <h1>Transform Videos<br />into Insights, <em>Instantly.</em></h1>
            <p className="home-subtitle">Summarize, search, and compare videos<br className="desktop-break" /> with AI-powered precision.</p>
            <div className="home-hero-actions">
              <Link
                to={authenticated ? "/upload" : "/register"}
                className="home-button home-button-primary"
              >Get Started</Link>
              <a href="#how-it-works" className="home-button home-button-secondary">
                <span className="home-button-play" aria-hidden="true" /> Watch Demo
              </a>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section className="home-features" id="features" aria-label="ClipMind features">
          {features.map((feature, index) => (
            <Link
              className={`home-feature home-feature-${feature.kind}`}
              key={feature.id}
              to={feature.path}
              aria-label={`${feature.title}. ${feature.description}`}
            >
              <div className="home-feature-visual">
                <MiniPreview feature={feature} />
              </div>
              <div className="home-feature-copy">
                <span className="home-feature-number">{String(index + 1).padStart(2, "0")}</span>
                <h2>{feature.title}</h2>
              </div>
            </Link>
          ))}
        </section>

        <section className="home-how" id="how-it-works">
          <span>ONE VIDEO, A CLEARER WAY FORWARD</span>
          <p>Upload a lesson, meeting, or talk. ClipMind finds the moments, words, and ideas worth keeping.</p>
        </section>
      </div>
    </main>
  );
}