import { Link } from "react-router-dom";
import PublicNav from "../components/PublicNav";
import api from "../api";
import "../home.css";

const features = [
  {
    id: "storyboards",
    title: "Auto Storyboards",
    description: "Generate visual summaries of key moments.",
    kind: "storyboard",
  },
  {
    id: "summaries",
    title: "Real-Time Summaries",
    description: "Get clear takeaways from every video.",
    kind: "summary",
  },
  {
    id: "search",
    title: "Cross-Video Search",
    description: "Find topics across your entire video library.",
    kind: "search",
  },
];

const workspaceActions = [
  {
    id: "upload",
    title: "Upload Video",
    description: "Upload a video and send it for processing.",
    action: "Start Upload",
    path: "/upload",
    icon: "▣",
  },
  {
    id: "status",
    title: "Processing Status",
    description: "Check progress and see when results are ready.",
    action: "View Status",
    path: "/processing",
    icon: "⚙",
  },
  {
    id: "summaries",
    title: "Real-Time Summaries",
    description: "Get instant summaries as videos play.",
    action: "View Summaries",
    path: "/live-summaries",
    icon: "◉",
  },
  {
    id: "storyboards",
    title: "Storyboards",
    description: "Generate visual summaries of key moments.",
    action: "View Storyboards",
    path: "/story",
    icon: "▤",
  },
];

function MiniPreview({ kind }) {
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
  return (
    <div className="home-mini-search" aria-hidden="true">
      <div className="home-mini-search-title"><span>⌕</span> Search videos</div>
      <div className="home-mini-result"><b>▶</b> Product strategy <time>00:05</time></div>
      <div className="home-mini-result"><b>▶</b> Research methods <time>39:05</time></div>
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
    <main className={`home-page${authenticated ? " is-authenticated" : ""}`}>
      <PublicNav />

      <div className="home-content" id="home">
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="home-kicker"><span /> VIDEO KNOWLEDGE, UNLOCKED</p>
            <h1>Transform Videos<br />into Insights, <em>Instantly.</em></h1>
            <p className="home-subtitle">Summarize, search, and compare videos<br className="desktop-break" /> with AI-powered precision.</p>
            <div className="home-hero-actions">
              <Link
                to={authenticated ? "/dashboard" : "/register"}
                className="home-button home-button-primary"
              >Get Started</Link>
              <a href="#how-it-works" className="home-button home-button-secondary">
                <span className="home-button-play" aria-hidden="true" /> Watch Demo
              </a>
            </div>
          </div>
          <ProductPreview />
        </section>

        <section
          className={`home-features${authenticated ? " is-authenticated" : ""}`}
          id="features"
          aria-label={authenticated ? "Workspace actions" : "ClipMind features"}
        >
          {authenticated ? workspaceActions.map((action, index) => (
            <article className={`home-feature home-workspace-card home-workspace-${action.id}`} key={action.id}>
              <div className="home-workspace-art" aria-hidden="true">
                <span>{action.icon}</span>
                <i />
              </div>
              <div className="home-feature-copy">
                <span className="home-feature-number">0{index + 1}</span>
                <h2>{action.title}</h2>
                <p>{action.description}</p>
                <Link className="home-workspace-button" to={action.path}>
                  {action.action}<span aria-hidden="true">⌃</span>
                </Link>
              </div>
            </article>
          )) : features.map((feature, index) => (
            <article className={`home-feature home-feature-${feature.kind}`} key={feature.id}>
              <MiniPreview kind={feature.kind} />
              <div className="home-feature-copy">
                <span className="home-feature-number">0{index + 1}</span>
                <h2>{feature.title}</h2>
                <p>{feature.description}</p>
              </div>
            </article>
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