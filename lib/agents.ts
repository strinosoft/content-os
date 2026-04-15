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
  if (data.error) console.error("❌ API error:", JSON.stringify(data.error));
  return data.content?.[0]?.text || "";
}

export async function runContentPipeline(
  niche: keyof typeof NICHES,
  topic: string,
  platform: "linkedin" | "twitter" | "instagram",
  mode: "auto" | "topic" | "manual",
  language: "hindi" | "english" = "english"
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

  // Agent 3: Writer — language-aware Instagram instructions
  const instagramInstruction = language === "hindi"
    ? "60-90 second spoken script in Hindi (Hinglish style). Use Hindi words naturally: 'dekho bhai', 'samjho', 'paise bachao', 'kyunki', 'toh', 'matlab', 'suno'. Keep technical terms in English (AWS, EC2, cloud, cost). Short punchy sentences. Add [PAUSE] after key points. Start with a strong Hindi hook like 'Dekho bhai...' or 'Suno ek baat...'."
    : "60-90 second spoken script in English. Conversational founder tone, punchy sentences. Technical terms explained simply. Add [PAUSE] after key points. Strong hook. Sound like a founder talking directly to peers.";

  const platformInstructions: Record<string, string> = {
    linkedin: "150-250 words, paragraph format, 2-3 emojis max, strong hook first line, plain text only no markdown, end with question or CTA",
    twitter: "5-7 tweets, numbered, each under 280 chars, hook tweet first, CTA last tweet, plain text no markdown",
    instagram: instagramInstruction,
  };

  const draft = await callClaude(
    "You are a Content Writer who writes like " + nicheConfig.tone + ". You write for " + nicheConfig.audience + " on " + platform + ". No fluff. No corporate speak. Sound like a real person.",
    "Strategy: " + strategy + "\n\nWrite a complete " + platform + " post.\nFormat rules: " + platformInstructions[platform] + "\nBrand: " + nicheConfig.brand + "\n\nFor Instagram: write as spoken video script for AI avatar in " + (language === "hindi" ? "Hindi/Hinglish" : "English") + "."
  );

  // Agent 4: Editor
  const editorInstruction = language === "hindi"
    ? "Keep as natural Hindi/Hinglish spoken script. Strong hook. Better CTA. Remove AI-sounding phrases."
    : "Keep as natural English spoken script. Strong hook. Better CTA. Remove AI-sounding phrases.";

  const final = await callClaude(
    "You are an Editor Agent. Make content viral-ready. Sharpen hooks. Remove weak phrases. Sound authentic, not AI-generated. Return final content only.",
    "Draft: " + draft + "\n\nPlatform: " + platform + "\n\nPolish this. Stronger hook. Better CTA. Return ONLY raw content. No markdown headers. No bold or italic. Plain text only." + (platform === "instagram" ? " " + editorInstruction : "")
  );

  // Agent 5: Video Script Optimizer
  const videoScriptPrompt = language === "hindi"
    ? "Clean this Hindi/Hinglish video script for AI avatar: " + final + "\n\nRules:\n- Remove hashtags and emojis\n- Keep [PAUSE] markers\n- Keep Hindi/Hinglish mix natural\n- Short punchy sentences\n- End with CTA mentioning getinfradesk.com\n- Max 200 words\n\nReturn clean script only."
    : "Clean this English video script for AI avatar: " + final + "\n\nRules:\n- Remove hashtags and emojis\n- Keep [PAUSE] markers\n- Natural conversational English\n- Short punchy sentences\n- End with CTA mentioning getinfradesk.com\n- Max 200 words\n\nReturn clean script only.";

  const videoScript = await callClaude(
    "You are a Video Script Optimizer. Clean scripts for AI avatar. Natural conversational speech. Max 200 words.",
    videoScriptPrompt
  );

  return { research, strategy, draft, final, videoScript };
}

export { NICHES };