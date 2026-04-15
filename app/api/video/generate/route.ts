import { NextResponse } from "next/server";
import {
  generateHeyGenVideo,
  generateHeyGenVideoWithAudio,
  checkHeyGenVideoStatus,
} from "@/lib/heygen";
import { generateHindiAudio } from "@/lib/elevenlabs";
import { uploadToS3 } from "@/lib/s3";

export async function POST(req: Request) {
  try {
    const { script, action, videoId, language } = await req.json();

    // Check status
    if (action === "check" && videoId) {
      const result = await checkHeyGenVideoStatus(videoId);
      return NextResponse.json({
        status: result.status,
        videoUrl: result.videoUrl,
        success: result.status === "completed",
      });
    }

    if (!script) {
      return NextResponse.json(
        { error: "Script is required" },
        { status: 400 }
      );
    }

    let newVideoId = "";

    if (language === "hindi") {
      // Hindi: ElevenLabs audio + HeyGen avatar
      console.log("🇮🇳 Hindi mode: ElevenLabs + HeyGen");

      // Step 1: Generate Hindi audio
      const audioBuffer = await generateHindiAudio(script);

      // Step 2: Upload audio to S3
      const audioUrl = await uploadToS3(
        audioBuffer,
        `hindi-audio-${Date.now()}.mp3`,
        "audio/mpeg"
      );
      console.log("✅ Audio uploaded:", audioUrl);

      // Step 3: HeyGen video with audio
      newVideoId = await generateHeyGenVideoWithAudio(audioUrl);
    } else {
      // English: HeyGen direct
      console.log("🇬🇧 English mode: HeyGen direct");
      newVideoId = await generateHeyGenVideo(script);
    }

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