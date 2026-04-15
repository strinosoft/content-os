import { NextResponse } from "next/server";
import { generateHeyGenVideo } from "@/lib/heygen";
import { uploadToS3 } from "@/lib/s3";

export async function POST(req: Request) {
  try {
    const { script, avatarId, voiceId } = await req.json();

    if (!script) {
      return NextResponse.json(
        { error: "Script is required" },
        { status: 400 }
      );
    }

    console.log("🎬 Starting HeyGen video generation...");

    // Step 1: Generate video via HeyGen
    const heygenVideoUrl = await generateHeyGenVideo(
      script,
      avatarId,
      voiceId
    );

    console.log("✅ HeyGen video ready:", heygenVideoUrl);

    // Step 2: Download video from HeyGen
    const videoRes = await fetch(heygenVideoUrl);
    if (!videoRes.ok) {
      throw new Error("Failed to download video from HeyGen");
    }

    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    console.log("⬆️ Uploading to S3...");

    // Step 3: Upload to S3
    const s3Url = await uploadToS3(
      videoBuffer,
      `reel-${Date.now()}.mp4`,
      "video/mp4"
    );

    console.log("✅ Video uploaded to S3:", s3Url);

    return NextResponse.json({
      success: true,
      videoUrl: s3Url,
      heygenUrl: heygenVideoUrl,
    });
  } catch (error: any) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: error.message || "Video generation failed" },
      { status: 500 }
    );
  }
}

// Long timeout — HeyGen takes 2-5 mins
export const maxDuration = 300;