// /api/animate-status.js
// Polls a Veo operation for completion. Called repeatedly by the client until done.
//
// Veo's response shape has changed across API versions, so we look for the video URI
// in several known paths to be defensive.
//
// Returns one of:
//   { done: false }                            → still working, poll again
//   { done: true, url: "data:video/mp4..." }   → finished, here's the video
//   { done: true, error: "..." }               → failed, here's why

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing the Gemini API key." });
  }

  const { operationName } = req.body || {};
  if (!operationName || typeof operationName !== "string") {
    return res.status(400).json({ error: "operationName is required." });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;

  try {
    const r = await fetch(url);
    const data = await r.json();

    if (!r.ok) {
      console.error("Veo status error:", JSON.stringify(data));
      const msg = data?.error?.message || `Status check returned ${r.status}`;
      return res.status(r.status).json({ error: msg });
    }

    // Not done yet
    if (!data.done) {
      return res.status(200).json({ done: false });
    }

    // Failed
    if (data.error) {
      return res.status(200).json({
        done: true,
        error: data.error.message || "Video generation failed.",
      });
    }

    // Done — find the video. Veo's response shape varies, so we look in several places.
    // Known paths from various docs / API versions:
    //   data.response.generateVideoResponse.generatedSamples[0].video.uri
    //   data.response.generatedVideos[0].video.uri
    //   data.response.videos[0].uri
    //   data.response.predictions[0].videoUri
    const resp = data.response || {};

    let videoUri = null;
    const candidates = [
      resp?.generateVideoResponse?.generatedSamples,
      resp?.generatedVideos,
      resp?.videos,
      resp?.predictions,
    ];

    for (const arr of candidates) {
      if (Array.isArray(arr) && arr.length > 0) {
        const item = arr[0];
        videoUri = item?.video?.uri || item?.videoUri || item?.uri || item?.video?.gcsUri;
        if (videoUri) break;
      }
    }

    if (!videoUri) {
      // Log the full response so we can see what Veo actually returned
      console.error("No video URI found. Veo response:", JSON.stringify(data).slice(0, 1500));
      return res.status(200).json({
        done: true,
        error: "Veo finished but didn't return a video URI in any known field. The Veo API response format may have changed. Check Vercel logs.",
      });
    }

    // Fetch the actual video bytes from the Files API URL
    const fetchUrl = videoUri.includes("?")
      ? `${videoUri}&key=${apiKey}`
      : `${videoUri}?key=${apiKey}`;

    const videoRes = await fetch(fetchUrl);
    if (!videoRes.ok) {
      console.error("Failed to fetch video from Veo:", videoRes.status);
      return res.status(200).json({
        done: true,
        error: `Could not download the finished video (status ${videoRes.status}).`,
      });
    }

    const videoBuffer = await videoRes.arrayBuffer();
    const base64 = Buffer.from(videoBuffer).toString("base64");
    const dataUrl = `data:video/mp4;base64,${base64}`;

    return res.status(200).json({ done: true, url: dataUrl });
  } catch (err) {
    console.error("Status handler crashed:", err);
    return res.status(500).json({
      error: err.message || "Internal server error during status check."
    });
  }
}
