const HEYGEN_API_URL = "https://api.heygen.com";

export async function generateHeyGenVideo(
  script: string,
  avatarId: string = "a27f0288f68848cb99c70d6f48156e6a",
  voiceId: string = "2d5b0e6cf36f460aa7fc47e3eee4ba54" // Hindi female voice
): Promise<string> {
  // Step 1: Create video
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
            avatar_id: avatarId,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: script,
            voice_id: voiceId,
            speed: 1.0,
          },
          background: {
            type: "color",
            value: "#0a0a0a",
          },
        },
      ],
      dimension: {
        width: 1080,
        height: 1920, // vertical for reels
      },
      aspect_ratio: "9:16",
    }),
  });

  const createData = await createRes.json();

  if (!createData.data?.video_id) {
    throw new Error("HeyGen video creation failed: " + JSON.stringify(createData));
  }

  const videoId = createData.data.video_id;

  // Step 2: Poll for completion
  let videoUrl = "";
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes max

  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 10000)); // wait 10 seconds

    const statusRes = await fetch(`${HEYGEN_API_URL}/v1/video_status.get?video_id=${videoId}`, {
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY!,
      },
    });

    const statusData = await statusRes.json();
    const status = statusData.data?.status;

    if (status === "completed") {
      videoUrl = statusData.data?.video_url;
      break;
    } else if (status === "failed") {
      throw new Error("HeyGen video failed: " + JSON.stringify(statusData));
    }

    attempts++;
  }

  if (!videoUrl) {
    throw new Error("HeyGen video timeout - took too long");
  }

  return videoUrl;
}

export async function getHeyGenAvatars(): Promise<any[]> {
  const res = await fetch(`${HEYGEN_API_URL}/v2/avatars`, {
    headers: {
      "X-Api-Key": process.env.HEYGEN_API_KEY!,
    },
  });
  const data = await res.json();
  return data.data?.avatars || [];
}

export async function getHeyGenVoices(): Promise<any[]> {
  const res = await fetch(`${HEYGEN_API_URL}/v2/voices`, {
    headers: {
      "X-Api-Key": process.env.HEYGEN_API_KEY!,
    },
  });
  const data = await res.json();
  return data.data?.voices || [];
}