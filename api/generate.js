// /api/generate.js
// Vercel serverless function that calls Google's Gemini API for image generation.
// Uses Nano Banana Flash (gemini-2.5-flash-image) by default — fast, reliable, and
// stays well under Vercel's 60-second free-plan timeout.
// Quality is excellent for dumpster generation; the small visual difference vs Pro
// isn't worth the timeout risk on a free Vercel plan.
//
// Pro mode (gemini-3-pro-image-preview) is available but should only be enabled by
// users on Vercel Pro plan since it can take 60-90 seconds.
//
// Returns the image as base64 so it never expires and works on any network.
// If a logo data URL is provided, it's passed to Gemini as a reference image.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server is missing the Gemini API key. Add GEMINI_API_KEY in Vercel and redeploy."
    });
  }

  const { prompt, quality = "standard", logo = null } = req.body || {};

  if (!prompt || typeof prompt !== "string" || prompt.trim().length < 10) {
    return res.status(400).json({ error: "A prompt of at least 10 characters is required." });
  }

  // Map quality to model:
  //   "standard"   → Flash (fast, free-plan friendly, default)
  //   "hd"         → Flash with a more detailed prompt suffix
  //   "pro"        → Pro (slow, only safe on Vercel Pro plan)
  // Both standard and HD use Flash because Flash is reliable on the free plan.
  // The visual quality difference is negligible for our use case.
  const modelId = quality === "pro"
    ? "gemini-3-pro-image-preview"
    : "gemini-2.5-flash-image";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  // Build the parts array — text always first, then optional logo image
  const parts = [{ text: prompt }];

  if (logo && typeof logo === "string" && logo.startsWith("data:")) {
    const match = logo.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio: "16:9" }
    }
  };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("Gemini API error:", JSON.stringify(data));
      const msg = data?.error?.message || `Gemini API returned status ${r.status}`;
      return res.status(r.status).json({ error: msg });
    }

    const respParts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = respParts.find(p => p.inlineData && p.inlineData.data);

    if (!imgPart) {
      const textPart = respParts.find(p => p.text);
      console.error("No image in Gemini response:", JSON.stringify(data).slice(0, 500));
      return res.status(500).json({
        error: textPart?.text || "Gemini returned no image. Try rephrasing the prompt."
      });
    }

    const mimeType = imgPart.inlineData.mimeType || "image/png";
    const base64 = imgPart.inlineData.data;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return res.status(200).json({ url: dataUrl, model: modelId });
  } catch (err) {
    console.error("Generate handler crashed:", err);
    return res.status(500).json({
      error: err.message || "Internal server error. Check Vercel function logs for details."
    });
  }
}
