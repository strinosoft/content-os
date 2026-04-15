import { NextResponse } from "next/server";
import { runContentPipeline } from "@/lib/agents";

export async function POST(req: Request) {
  try {
    const { niche, topic, platform, mode } = await req.json();

    if (!niche || !platform) {
      return NextResponse.json(
        { error: "Niche and platform are required" },
        { status: 400 }
      );
    }

    console.log(`🤖 Running ${platform} content pipeline for niche: ${niche}`);

    const result = await runContentPipeline(
      niche,
      topic || "",
      platform,
      mode || "auto"
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Content generation error:", error);
    return NextResponse.json(
      { error: error.message || "Content generation failed" },
      { status: 500 }
    );
  }
}

export const maxDuration = 120;