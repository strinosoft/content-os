import { TwitterApi } from "twitter-api-v2";
import { NextResponse } from "next/server";

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Split into tweets if thread
    const tweets = content
      .split("\n")
      .filter((line: string) => line.trim())
      .filter((line: string) => line.match(/^\d+[\.\)]/)) // numbered tweets
      .map((line: string) => line.replace(/^\d+[\.\)]\s*/, "").trim());

    // If no numbered tweets found, treat as single tweet
    const tweetList = tweets.length > 0 ? tweets : [content.slice(0, 280)];

    // Post thread
    let previousTweetId: string | undefined;
    const postedTweets = [];

    for (const tweet of tweetList) {
      const tweetText = tweet.slice(0, 280); // enforce limit

      const posted = await twitterClient.v2.tweet({
        text: tweetText,
        ...(previousTweetId && {
          reply: { in_reply_to_tweet_id: previousTweetId },
        }),
      });

      previousTweetId = posted.data.id;
      postedTweets.push(posted.data);
    }

    return NextResponse.json({
      success: true,
      tweets: postedTweets,
      threadUrl: `https://twitter.com/i/web/status/${postedTweets[0].id}`,
    });
  } catch (error: any) {
    console.error("Twitter post error:", error);
    return NextResponse.json(
      { error: error.message || "Twitter post failed" },
      { status: 500 }
    );
  }
}