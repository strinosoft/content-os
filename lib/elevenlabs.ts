export async function generateHindiAudio(script: string): Promise<Buffer> {
  const voiceId = process.env.ELEVENLABS_HINDI_VOICE_ID!;
  const apiKey = process.env.ELEVENLABS_API_KEY!;

  console.log("🎙️ ElevenLabs Hindi audio generating...");
  console.log("🎙️ Voice ID:", voiceId);

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error("ElevenLabs failed: " + err);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}