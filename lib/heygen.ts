const HEYGEN_API_URL = "https://api.heygen.com";
const AVATAR_ID = "a27f0288f68848cb99c70d6f48156e6a"; // Praveen's avatar
const VOICE_ID = "e0762e0148224d30b5455a07fac7081a";  // Praveen's cloned voice

export async function generateHeyGenVideo(script: string): Promise<string> {
  console.log("🎬 Creating HeyGen video...");
  console.log("🎭 Avatar ID:", AVATAR_ID);
  console.log("🎙️ Voice ID:", VOICE_ID);

  const createRes = await fetch(`${HEYGEN_API_URL}/v2/video/generate`, {
    method: "POST",
    headers: {
      "X-Api-Key": process.env.HEYGEN_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: AVATAR_ID,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: script,
            voice_id: VOICE_ID,
            speed: 1.0,
          },
          background: {
          type: "blur",
         },
        },
      ],
      dimension: {
        width: 1080,
        height: 1920,
      },
      aspect_ratio: "9:16",
    }),
  });

  const createData = await createRes.json();
  console.log("📦 HeyGen create response:", JSON.stringify(createData));

  if (!createData.data?.video_id) {
    throw new Error("HeyGen video creation failed: " + JSON.stringify(createData));
  }

  return createData.data.video_id;
}

export async function checkHeyGenVideoStatus(videoId: string): Promise<{
  status: string;
  videoUrl: string | null;
}> {
  const statusRes = await fetch(
    `${HEYGEN_API_URL}/v1/video_status.get?video_id=${videoId}`,
    {
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY!,
      },
    }
  );

  const statusData = await statusRes.json();
  console.log("📊 HeyGen status:", statusData.data?.status);

  return {
    status: statusData.data?.status || "unknown",
    videoUrl: statusData.data?.video_url || null,
  };
}