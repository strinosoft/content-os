import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { content, access_token } = await req.json();

    // Get user URN
    const profileRes = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );
    const profile = await profileRes.json();
    const urn = profile.sub;

    if (!urn) {
      return NextResponse.json(
        { error: "Could not get LinkedIn user URN" },
        { status: 400 }
      );
    }

    // Post to LinkedIn
    const postRes = await fetch(
      "https://api.linkedin.com/v2/ugcPosts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202505",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: `urn:li:person:${urn}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: content,
              },
              shareMediaCategory: "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        }),
      }
    );

    if (!postRes.ok) {
      const err = await postRes.text();
      return NextResponse.json(
        { error: err },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}