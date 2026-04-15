"use client";

import { useState, useEffect } from "react";

const NICHES = [
  { id: "aws", label: "☁️ AWS / Cloud", color: "#f97316" },
  { id: "finance", label: "💰 Finance", color: "#10b981" },
  { id: "motivation", label: "🧠 Motivation", color: "#8b5cf6" },
  { id: "ai", label: "🤖 AI Tools", color: "#06b6d4" },
  { id: "startup", label: "📈 Startup", color: "#f59e0b" },
];

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn", icon: "in" },
  { id: "twitter", label: "Twitter/X", icon: "𝕏" },
  { id: "instagram", label: "Instagram", icon: "▶" },
];

const MODES = [
  { id: "auto", label: "🔥 Auto Trend", desc: "System finds trending topic" },
  { id: "topic", label: "💡 My Topic", desc: "You give the topic idea" },
];

const AGENTS = [
  { id: "research", label: "Research", icon: "🔍" },
  { id: "strategy", label: "Strategy", icon: "🧠" },
  { id: "writer", label: "Writer", icon: "✍️" },
  { id: "editor", label: "Editor", icon: "✅" },
];

function Spinner() {
  return (
    <svg style={{ animation: "spin 1s linear infinite", width: 14, height: 14 }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#f97316" strokeWidth="4" strokeOpacity="0.25" />
      <path fill="#f97316" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export default function ContentOS() {
  const [selectedNiche, setSelectedNiche] = useState("aws");
  const [selectedPlatform, setSelectedPlatform] = useState("linkedin");
  const [selectedMode, setSelectedMode] = useState("auto");
  const [topic, setTopic] = useState("");
  const [running, setRunning] = useState(false);
  const [agentStatus, setAgentStatus] = useState<Record<string, "idle" | "running" | "done">>({
    research: "idle", strategy: "idle", writer: "idle", editor: "idle",
  });
  const [agentOutputs, setAgentOutputs] = useState<Record<string, string>>({});
  const [finalContent, setFinalContent] = useState("");
  const [videoScript, setVideoScript] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoLanguage, setVideoLanguage] = useState<"hindi" | "english">("hindi");
  const [posting, setPosting] = useState(false);
  const [postStatus, setPostStatus] = useState<"idle" | "success" | "error">("idle");
  const [liToken, setLiToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const LINKEDIN_CLIENT_ID = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  useEffect(() => {
    const token = sessionStorage.getItem("li_access_token");
    if (token) setLiToken(token);
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "LINKEDIN_AUTH_CODE") exchangeLinkedInCode(e.data.code);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const exchangeLinkedInCode = async (code: string) => {
    const res = await fetch("/api/linkedin/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: `${APP_URL}/api/linkedin/callback` }),
    });
    const data = await res.json();
    if (data.access_token) {
      sessionStorage.setItem("li_access_token", data.access_token);
      setLiToken(data.access_token);
    }
  };

  const connectLinkedIn = () => {
    const redirectUri = `${APP_URL}/api/linkedin/callback`;
    const scope = "openid profile w_member_social";
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=random123`;
    const w = 600, h = 700;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    window.open(url, "linkedin_oauth", `width=${w},height=${h},left=${left},top=${top}`);
  };

  const handleGenerate = async () => {
    setRunning(true);
    setError("");
    setFinalContent("");
    setVideoScript("");
    setVideoUrl("");
    setPostStatus("idle");
    setAgentOutputs({});
    setAgentStatus({ research: "idle", strategy: "idle", writer: "idle", editor: "idle" });
    const agentOrder = ["research", "strategy", "writer", "editor"];
    try {
      setAgentStatus(s => ({ ...s, research: "running" }));
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        niche: selectedNiche,
        topic,
        platform: selectedPlatform,
        mode: selectedMode,
        language: selectedPlatform === "instagram" ? videoLanguage : "english",
      }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Generation failed");
      for (let i = 0; i < agentOrder.length; i++) {
        const agent = agentOrder[i];
        setAgentStatus(s => ({ ...s, [agent]: "done" }));
        setAgentOutputs(o => ({ ...o, [agent]: data[agent] || "" }));
        if (i < agentOrder.length - 1) {
          await new Promise(r => setTimeout(r, 400));
          setAgentStatus(s => ({ ...s, [agentOrder[i + 1]]: "running" }));
        }
      }
      setFinalContent(data.final);
      setVideoScript(data.videoScript);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setAgentStatus({ research: "idle", strategy: "idle", writer: "idle", editor: "idle" });
    }
    setRunning(false);
  };

  const handleGenerateVideo = async () => {
    if (!videoScript) return;
    setGeneratingVideo(true);
    setError("");
    let finalVideoUrl = "";

    try {
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: videoScript, language: videoLanguage }),
      });
      const data = await res.json();
      if (!data.videoId) throw new Error(data.error || "Failed to start video");

      const videoId = data.videoId;
      let attempts = 0;

      while (attempts < 40) {
        await new Promise(r => setTimeout(r, 15000));
        const statusRes = await fetch("/api/video/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check", videoId }),
        });
        const statusData = await statusRes.json();
        console.log("Poll attempt", attempts, statusData.status);

        if (statusData.status === "completed" && statusData.videoUrl) {
          finalVideoUrl = statusData.videoUrl;
          setVideoUrl(statusData.videoUrl);
          break;
        } else if (statusData.status === "failed") {
          throw new Error("HeyGen video failed");
        }
        attempts++;
      }

      if (!finalVideoUrl) throw new Error("Video took too long - check HeyGen dashboard");

    } catch (e: any) {
      setError("Video generation failed: " + e.message);
    }

    setGeneratingVideo(false);
  };

  const handlePost = async () => {
    if (!finalContent) return;
    setPosting(true);
    setPostStatus("idle");
    setError("");
    try {
      if (selectedPlatform === "twitter") {
        const res = await fetch("/api/post/twitter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: finalContent }),
        });
        const data = await res.json();
        if (data.success) setPostStatus("success");
        else throw new Error(data.error);
      } else if (selectedPlatform === "linkedin") {
        if (!liToken) { connectLinkedIn(); setPosting(false); return; }
        const res = await fetch("/api/linkedin/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: finalContent, access_token: liToken }),
        });
        const data = await res.json();
        if (data.success) setPostStatus("success");
        else throw new Error(data.error);
      } else if (selectedPlatform === "instagram") {
        if (!videoUrl) { setError("Pehle video generate karo!"); setPosting(false); return; }
        const res = await fetch("/api/post/instagram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption: finalContent, videoUrl }),
        });
        const data = await res.json();
        if (data.success) setPostStatus("success");
        else throw new Error(data.error);
      }
    } catch (e: any) {
      setError(e.message);
      setPostStatus("error");
    }
    setPosting(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(finalContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", background: "#080810", minHeight: "100vh", color: "#e2e8f0", padding: "32px 16px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2d2d3d; border-radius: 2px; }
        textarea:focus, input:focus { outline: none; border-color: #f97316 !important; }
        textarea::placeholder, input::placeholder { color: #334155; }
        button { font-family: inherit; cursor: pointer; transition: all 0.2s; }
        button:hover { opacity: 0.85; }
        button:disabled { cursor: not-allowed; opacity: 0.5; }
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span>⚡</span>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>Content OS</h1>
            <span style={{ background: "#1c1917", border: "1px solid #292524", borderRadius: 5, padding: "2px 8px", fontSize: 10, color: "#a8a29e" }}>by Strinosoft</span>
          </div>
          <p style={{ color: "#475569", fontSize: 12 }}>Niche select karo → Content generate karo → Auto-post karo</p>
        </div>

        {/* LinkedIn Connect */}
        {selectedPlatform === "linkedin" && (
          <div style={{
            background: liToken ? "#0a1a0a" : "#0f0f1a",
            border: `1px solid ${liToken ? "#16a34a" : "#1d4ed8"}`,
            borderRadius: 10, padding: "12px 16px", marginBottom: 16,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: "#0a66c2", borderRadius: 4, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff" }}>in</div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: liToken ? "#4ade80" : "#93c5fd" }}>
                  {liToken ? "✓ LinkedIn Connected" : "Connect LinkedIn"}
                </p>
                <p style={{ fontSize: 11, color: "#334155" }}>{liToken ? "Direct post enabled" : "Required for auto-post"}</p>
              </div>
            </div>
            {liToken ? (
              <button onClick={() => { sessionStorage.removeItem("li_access_token"); setLiToken(null); }}
                style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, background: "#0a0a0a", border: "1px solid #3f3f46", color: "#71717a" }}>
                Disconnect
              </button>
            ) : (
              <button onClick={connectLinkedIn}
                style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11, background: "#0a66c2", border: "none", color: "#fff", fontWeight: 700 }}>
                Connect
              </button>
            )}
          </div>
        )}

        {/* Controls */}
        <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 10, color: "#475569", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Niche</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {NICHES.map(n => (
                <button key={n.id} onClick={() => setSelectedNiche(n.id)} disabled={running}
                  style={{
                    padding: "7px 14px", borderRadius: 8, fontSize: 12,
                    border: selectedNiche === n.id ? `1px solid ${n.color}` : "1px solid #1a1a2e",
                    background: selectedNiche === n.id ? `${n.color}15` : "#080810",
                    color: selectedNiche === n.id ? n.color : "#475569",
                    fontWeight: selectedNiche === n.id ? 700 : 400,
                  }}>{n.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 10, color: "#475569", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Platform</label>
            <div style={{ display: "flex", gap: 8 }}>
              {PLATFORMS.map(p => (
                <button key={p.id} onClick={() => setSelectedPlatform(p.id)} disabled={running}
                  style={{
                    padding: "7px 16px", borderRadius: 8, fontSize: 12,
                    border: selectedPlatform === p.id ? "1px solid #f97316" : "1px solid #1a1a2e",
                    background: selectedPlatform === p.id ? "#1c0900" : "#080810",
                    color: selectedPlatform === p.id ? "#f97316" : "#475569",
                    fontWeight: selectedPlatform === p.id ? 700 : 400,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                  <span style={{ fontWeight: 900 }}>{p.icon}</span> {p.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: 10, color: "#475569", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Mode</label>
            <div style={{ display: "flex", gap: 8 }}>
              {MODES.map(m => (
                <button key={m.id} onClick={() => setSelectedMode(m.id)} disabled={running}
                  style={{
                    padding: "7px 14px", borderRadius: 8, fontSize: 12,
                    border: selectedMode === m.id ? "1px solid #06b6d4" : "1px solid #1a1a2e",
                    background: selectedMode === m.id ? "#0a1a1a" : "#080810",
                    color: selectedMode === m.id ? "#06b6d4" : "#475569",
                    fontWeight: selectedMode === m.id ? 700 : 400,
                  }}>
                  {m.label}
                  <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 6 }}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedMode === "topic" && (
            <div style={{ marginBottom: 4 }}>
              <label style={{ fontSize: 10, color: "#475569", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Topic Idea</label>
              <input value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. EC2 idle instances waste kaise rokein..."
                disabled={running}
                style={{ width: "100%", background: "#080810", border: "1px solid #1a1a2e", borderRadius: 8, padding: "10px 14px", color: "#e2e8f0", fontSize: 12, transition: "border-color 0.2s" }}
              />
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button onClick={handleGenerate} disabled={running}
          style={{
            width: "100%", padding: "14px", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: running ? "#1c1917" : "linear-gradient(135deg, #ea580c, #f97316)",
            border: running ? "1px solid #292524" : "none",
            color: running ? "#78716c" : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            marginBottom: 20,
            boxShadow: running ? "none" : "0 4px 24px rgba(249,115,22,0.3)",
          }}>
          {running ? <><Spinner /> Agents running...</> : "🚀 Generate Content"}
        </button>

        {/* Agent Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {AGENTS.map(agent => {
            const status = agentStatus[agent.id];
            return (
              <div key={agent.id} style={{
                borderRadius: 10, padding: 14, transition: "all 0.4s",
                border: status === "running" ? "1px solid #f97316" : status === "done" ? "1px solid #16a34a" : "1px solid #1a1a2e",
                background: status === "running" ? "#1c0900" : status === "done" ? "#0a1a0a" : "#0d0d1a",
                boxShadow: status === "running" ? "0 0 20px rgba(249,115,22,0.1)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: agentOutputs[agent.id] ? 8 : 0 }}>
                  <span style={{ fontSize: 18 }}>{agent.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{agent.label}</span>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: status === "running" ? "#f97316" : status === "done" ? "#16a34a" : "#334155",
                        animation: status === "running" ? "pulse 1s infinite" : "none",
                      }} />
                    </div>
                  </div>
                </div>
                {agentOutputs[agent.id] && (
                  <div style={{ fontSize: 10, color: "#64748b", background: "#080810", borderRadius: 6, padding: "6px 8px", maxHeight: 80, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {agentOutputs[agent.id].slice(0, 200)}...
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#1c0000", border: "1px solid #7f1d1d", borderRadius: 9, padding: 12, marginBottom: 16, color: "#fca5a5", fontSize: 12 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Final Output */}
        {finalContent && (
          <div style={{ background: "#0d0d1a", border: "1px solid #16a34a", borderRadius: 12, padding: 20, marginBottom: 16, animation: "fadeUp 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ color: "#16a34a" }}>✅</span>
                <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>
                  {PLATFORMS.find(p => p.id === selectedPlatform)?.label} Content Ready
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleCopy}
                  style={{
                    padding: "6px 14px", borderRadius: 7, fontSize: 11,
                    background: copied ? "#14532d" : "#18181b",
                    border: copied ? "1px solid #16a34a" : "1px solid #3f3f46",
                    color: copied ? "#4ade80" : "#a1a1aa",
                  }}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
                <button onClick={handlePost} disabled={posting}
                  style={{
                    padding: "6px 16px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                    background: postStatus === "success" ? "#14532d" : "#f97316",
                    border: "none", color: "#fff",
                    display: "flex", alignItems: "center", gap: 5,
                  }}>
                  {posting ? <><Spinner /> Posting...</> :
                    postStatus === "success" ? "✓ Posted!" :
                    `Post to ${PLATFORMS.find(p => p.id === selectedPlatform)?.label}`}
                </button>
              </div>
            </div>

            <textarea value={finalContent} onChange={e => setFinalContent(e.target.value)} rows={10}
              style={{ width: "100%", background: "#080810", border: "1px solid #1a1a2e", borderRadius: 8, padding: 14, color: "#d4d4d8", fontSize: 12, lineHeight: 1.8, resize: "vertical", transition: "border-color 0.2s" }}
            />

            {postStatus === "success" && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#0a1a0a", borderRadius: 7, border: "1px solid #14532d" }}>
                <p style={{ fontSize: 12, color: "#4ade80" }}>🎉 Successfully posted!</p>
              </div>
            )}
          </div>
        )}

        {/* Video Section — Instagram only */}
        {finalContent && selectedPlatform === "instagram" && (
          <div style={{ background: "#0d0d1a", border: "1px solid #8b5cf6", borderRadius: 12, padding: 20, animation: "fadeUp 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>🎬 Reel Video</p>
                <p style={{ fontSize: 11, color: "#475569" }}>Avatar video generate karo</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* Language Toggle */}
                <button onClick={() => setVideoLanguage("hindi")} disabled={generatingVideo}
                  style={{
                    padding: "6px 12px", borderRadius: 6, fontSize: 11, fontFamily: "inherit",
                    background: videoLanguage === "hindi" ? "#f97316" : "#18181b",
                    border: videoLanguage === "hindi" ? "1px solid #f97316" : "1px solid #3f3f46",
                    color: videoLanguage === "hindi" ? "#fff" : "#71717a",
                    fontWeight: videoLanguage === "hindi" ? 700 : 400,
                  }}>
                  🇮🇳 Hindi
                </button>
                <button onClick={() => setVideoLanguage("english")} disabled={generatingVideo}
                  style={{
                    padding: "6px 12px", borderRadius: 6, fontSize: 11, fontFamily: "inherit",
                    background: videoLanguage === "english" ? "#06b6d4" : "#18181b",
                    border: videoLanguage === "english" ? "1px solid #06b6d4" : "1px solid #3f3f46",
                    color: videoLanguage === "english" ? "#fff" : "#71717a",
                    fontWeight: videoLanguage === "english" ? 700 : 400,
                  }}>
                  🇬🇧 English
                </button>
                {/* Generate Button */}
                <button onClick={handleGenerateVideo} disabled={generatingVideo}
                  style={{
                    padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: generatingVideo ? "#1a1a2e" : "#8b5cf6",
                    border: "none", color: "#fff",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                  {generatingVideo ? <><Spinner /> Generating... (2-5 min)</> : "🎬 Generate Video"}
                </button>
              </div>
            </div>

            {/* Language info */}
            <div style={{ marginBottom: 12, padding: "8px 12px", background: "#080810", borderRadius: 7, border: "1px solid #1a1a2e" }}>
              <p style={{ fontSize: 11, color: "#64748b" }}>
                {videoLanguage === "hindi"
                  ? "🇮🇳 Hindi mode — ElevenLabs se tumhari Hindi voice + HeyGen avatar"
                  : "🇬🇧 English mode — HeyGen se tumhari English voice + avatar"}
              </p>
            </div>

            {videoScript && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, color: "#475569", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Video Script</p>
                <textarea value={videoScript} onChange={e => setVideoScript(e.target.value)} rows={6}
                  style={{ width: "100%", background: "#080810", border: "1px solid #1a1a2e", borderRadius: 8, padding: 12, color: "#d4d4d8", fontSize: 11, lineHeight: 1.8, resize: "vertical" }}
                />
              </div>
            )}

            {videoUrl && (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 10, color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Preview</p>
                <video controls style={{ width: "100%", borderRadius: 8, maxHeight: 400 }}>
                  <source src={videoUrl} type="video/mp4" />
                </video>
                <a href={videoUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-block", marginTop: 10, fontSize: 11, color: "#8b5cf6" }}>
                  S3 URL copy karo →
                </a>
              </div>
            )}
          </div>
        )}

        <p style={{ textAlign: "center", color: "#1e293b", fontSize: 10, marginTop: 28 }}>
          Content OS · Strinosoft · Powered by Claude + HeyGen + ElevenLabs
        </p>
      </div>
    </div>
  );
}