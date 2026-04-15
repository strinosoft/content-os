import { NextResponse } from "next/server";
import { generateHeyGenVideo, checkHeyGenVideoStatus } from "@/lib/heygen";

export async function POST(req: Request) {
  try {
    const { script, action, videoId } = await req.json();

    if (action === "check" && videoId) {
      const result = await checkHeyGenVideoStatus(videoId);
      return NextResponse.json({
        status: result.status,
        videoUrl: result.videoUrl,
        success: result.status === "completed",
      });
    }

    if (!script) {
      return NextResponse.json({ error: "Script is required" }, { status: 400 });
    }

    const newVideoId = await generateHeyGenVideo(script);

    return NextResponse.json({
      success: true,
      videoId: newVideoId,
      status: "processing",
    });

  } catch (error: any) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: error.message || "Video generation failed" },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;