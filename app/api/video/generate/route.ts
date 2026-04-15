import { NextResponse } from "next/server";
import { generateHeyGenVideo } from "@/lib/heygen";

export async function POST(req: Request) {
  try {
    const { script, avatarId, voiceId, action, videoId } = await req.json();

    // Step 2: Check status
    if (action === "check" && videoId) {
      const statusRes = await fetch(
        `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
        { headers: { "X-Api-Key": process.env.HEYGEN_API_KEY! } }
      );
      const statusData = await statusRes.json();
      const status = statusData.data?.status;
      const videoUrl = statusData.data?.video_url;

      return NextResponse.json({
        status,
        videoUrl: videoUrl || null,
        success: status === "completed",
      });
    }

    // Step 1: Create video only
    const createRes = await fetch("https://api.heygen.com/v2/video/generate", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: "avatar",
            avatar_id: avatarId || "a27f0288f68848cb99c70d6f48156e6a",
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: script,
            voice_id: voiceId || "2d5b0e6cf36f460aa7fc47e3eee4ba54",
            speed: 1.0,
          },
          background: { type: "color", value: "#0a0a0a" },
        }],
        dimension: { width: 1080, height: 1920 },
        aspect_ratio: "9:16",
      }),
    });

    const createData = await createRes.json();

    if (!createData.data?.video_id) {
      throw new Error("HeyGen video creation failed: " + JSON.stringify(createData));
    }

    return NextResponse.json({
      success: true,
      videoId: createData.data.video_id,
      status: "processing",
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Video generation failed" },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;