const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const NICHES = {
  aws: {
    name: "AWS / Cloud Cost",
    audience: "CTOs, technical founders, DevOps engineers",
    tone: "technical but practical, founder voice",
    brand: "InfraDesk - AI-powered AWS cost optimization SaaS (getinfradesk.com)",
  },
  finance: {
    name: "Finance / Money Tips",
    audience: "Indian millennials, working professionals",
    tone: "simple, relatable, Hindi-friendly",
    brand: "Personal finance educator",
  },
  motivation: {
    name: "Motivation / Mindset",
    audience: "Students, young professionals, entrepreneurs",
    tone: "energetic, inspiring, punchy",
    brand: "Motivational content creator",
  },
  ai: {
    name: "AI Tools / Tech",
    audience: "Founders, developers, tech enthusiasts",
    tone: "curious, forward-thinking, practical",
    brand: "AI tools educator",
  },
  startup: {
    name: "Startup / Business",
    audience: "Indian founders, entrepreneurs",
    tone: "raw, honest, builder mindset",
    brand: "Startup founder sharing journey",
  },
};

async function callClaude(system: string, user: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log("🔑 API KEY exists:", !!apiKey);
  console.log("🔑 API KEY length:", apiKey?.length);
  console.log("🔑 API KEY prefix:", apiKey?.substring(0, 15));

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  const data = await res.json();
  console.log("📦 API response status:", res.status);
  console.log("📦 API response type:", data.type);
  if (data.error) {
    console.error("❌ API error:", JSON.stringify(data.error));
  }
  return data.content?.[0]?.text || "";
}

export async function runContentPipeline(
  niche: keyof typeof NICHES,
  topic: string,
  platform: "linkedin" | "twitter" | "instagram",
  mode: "auto" | "topic" | "manual"
): Promise<{
  research: string;
  strategy: string;
  draft: string;
  final: string;
  videoScript: string;
}> {
  const nicheConfig = NICHES[niche];

  // Agent 1: Research
  const research = await callClaude(
    "You are a Research Agent specializing in " + nicheConfig.name + ". Find trending topics, pain points, and viral angles for " + nicheConfig.audience + ". Output bullet points only. Be specific with numbers and stats.",
    mode === "auto"
      ? "Find top 3 trending topics in " + nicheConfig.name + " right now for Indian audience. Include specific stats."
      : "Research this topic deeply: " + topic + ". Find angles, stats, pain points for " + nicheConfig.audience + "."
  );

  // Agent 2: Strategy
  const strategy = await callClaude(
    "You are a Content Strategy Agent for " + platform + " content. You create viral content strategies for " + nicheConfig.audience + ". Output: hook idea, main angle, 3 talking points, CTA. Keep it punchy.",
    "Research: " + research + "\n\nPlatform: " + platform + "\nNiche: " + nicheConfig.name + "\nBrand: " + nicheConfig.brand + "\nTone: " + nicheConfig.tone + "\n\nCreate a content strategy. Focus on what makes " + platform + " content go viral."
  );

  // Agent 3: Writer
  const platformInstructions: Record<string, string> = {
    linkedin: "150-250 words, paragraph format, 2-3 emojis max, strong hook first line, end with question or CTA",
    twitter: "5-7 tweets, numbered, each under 280 chars, hook tweet first, CTA last tweet",
    instagram: "60-90 second spoken script, conversational Hindi-English mix, punchy sentences, pause indicators [PAUSE]",
  };

  const draft = await callClaude(
    "You are a Content Writer who writes like " + nicheConfig.tone + ". You write for " + nicheConfig.audience + " on " + platform + ". No fluff. No corporate speak. Sound like a real person.",
    "Strategy: " + strategy + "\n\nWrite a complete " + platform + " post.\nFormat rules: " + platformInstructions[platform] + "\nBrand: " + nicheConfig.brand + "\n\nFor Instagram: write as a spoken video script (this will be read by AI avatar)."
  );

  // Agent 4: Editor
  const final = await callClaude(
    "You are an Editor Agent. Make content viral-ready. Sharpen hooks. Remove weak phrases. Sound authentic, not AI-generated. Return final content only.",
    "Draft: " + draft + "\n\nPlatform: " + platform + "\n\nPolish this. Stronger hook. Better CTA. Remove any AI-sounding phrases. IMPORTANT: Return ONLY the post content itself. No markdown headers like ## LinkedIn Post. No markdown formatting like **bold** or *italic*. Plain text only. No labels. No commentary. Just the raw post text ready to publish." + (platform === "instagram" ? " Keep it as spoken script - natural speech flow." : "")
  );

  // Agent 5: Video Script (for Instagram/HeyGen)
  const videoScript = await callClaude(
    "You are a Video Script Optimizer. Convert content into a clean spoken script for AI avatar video. Max 90 seconds when spoken (roughly 200-220 words). Natural speech, no special characters except [PAUSE].",
    "Convert this to a clean video script: " + final + "\n\nRules:\n- Remove hashtags\n- Remove emojis\n- Add [PAUSE] for natural breaks\n- Keep sentences short\n- Conversational Hindi-English mix\n- End with clear CTA\n\nReturn script only."
  );

  return { research, strategy, draft, final, videoScript };
}

export { NICHES };