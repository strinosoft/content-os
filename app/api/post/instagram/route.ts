import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { caption, videoUrl, imageUrl } = await req.json();

    const userId = process.env.INSTAGRAM_USER_ID!;
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN!;

    let containerId = "";

    if (videoUrl) {
      // Reel post
      const reelRes = await fetch(
        `https://graph.instagram.com/v21.0/${userId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: "REELS",
            video_url: videoUrl,
            caption: caption,
            access_token: accessToken,
          }),
        }
      );
      const reelData = await reelRes.json();
      if (!reelData.id) {
        throw new Error("Reel container failed: " + JSON.stringify(reelData));
      }
      containerId = reelData.id;

      // Wait for video processing
      let status = "";
      let attempts = 0;
      while (status !== "FINISHED" && attempts < 20) {
        await new Promise((r) => setTimeout(r, 10000));
        const statusRes = await fetch(
          `https://graph.instagram.com/v21.0/${containerId}?fields=status_code&access_token=${accessToken}`
        );
        const statusData = await statusRes.json();
        status = statusData.status_code;
        attempts++;
        if (status === "ERROR") {
          throw new Error("Video processing failed");
        }
      }
    } else if (imageUrl) {
      // Image post
      const imgRes = await fetch(
        `https://graph.instagram.com/v21.0/${userId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: imageUrl,
            caption: caption,
            access_token: accessToken,
          }),
        }
      );
      const imgData = await imgRes.json();
      if (!imgData.id) {
        throw new Error("Image container failed: " + JSON.stringify(imgData));
      }
      containerId = imgData.id;
    } else {
      throw new Error("videoUrl or imageUrl required");
    }

    // Publish
    const publishRes = await fetch(
      `https://graph.instagram.com/v21.0/${userId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );

    const publishData = await publishRes.json();

    if (!publishData.id) {
      throw new Error("Publish failed: " + JSON.stringify(publishData));
    }

    return NextResponse.json({
      success: true,
      postId: publishData.id,
      url: `https://instagram.com/p/${publishData.id}`,
    });
  } catch (error: any) {
    console.error("Instagram post error:", error);
    return NextResponse.json(
      { error: error.message || "Instagram post failed" },
      { status: 500 }
    );
  }
}

export const maxDuration = 300;