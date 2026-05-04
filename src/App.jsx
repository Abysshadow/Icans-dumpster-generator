import { useState, useMemo, useCallback, useRef } from "react";

/* ── GREEN/WHITE THEME ── */
const GREEN = "#2e7d32";
const BORDER = "#c8e6c9";
const BG = "#f5f5f5";
const WHITE = "#ffffff";
const TEXT = "#333333";
const TEXT_LIGHT = "#666666";
const TEXT_MUTED = "#999999";

const inputStyle = {
  padding: "10px 12px", border: `1px solid #ddd`, borderRadius: "6px", fontSize: "15px",
  background: WHITE, color: TEXT, outline: "none", width: "100%", boxSizing: "border-box",
};
const labelStyle = {
  display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600,
  color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "14px",
};

// Standard dumpster dimensions (length x width x height in feet)
const DUMPSTER_SIZES = [
  { yd: 10, dims: "12 x 8 x 3.5", label: "10 YD" },
  { yd: 15, dims: "16 x 8 x 4",   label: "15 YD" },
  { yd: 20, dims: "22 x 8 x 4",   label: "20 YD" },
  { yd: 30, dims: "22 x 8 x 6",   label: "30 YD" },
  { yd: 40, dims: "22 x 8 x 8",   label: "40 YD" },
  { yd: "custom", dims: "", label: "Custom" },
];

const PRESET_SCENES = [
  { id: "construction", label: "🏗️ Construction Site", prompt: "parked at an active residential construction site with stacks of lumber and a half-built house in the background, mid-morning sun, professional photography" },
  { id: "driveway",     label: "🏡 Suburban Driveway",  prompt: "sitting on a clean asphalt driveway in front of a tidy suburban home with a manicured lawn, bright daylight, clear blue sky" },
  { id: "sunset",       label: "🌅 Sunset Hero Shot",   prompt: "hero shot at golden hour with dramatic warm sunset lighting, cinematic angle, slight low perspective, rim lighting on the dumpster edges" },
  { id: "commercial",   label: "🏢 Commercial Lot",     prompt: "in a clean paved commercial parking lot next to a modern office building, professional corporate setting, bright overcast lighting" },
  { id: "renovation",   label: "🔨 Home Renovation",    prompt: "in a homeowner's driveway during a renovation project, with some demolition debris being loaded in, family home setting, daytime" },
  { id: "studio",       label: "📸 Studio Product",     prompt: "studio product photography on a seamless light gray background, professional three-point lighting, no shadows on the floor, catalog-style shot" },
  { id: "blank",        label: "⬜ Plain Background",   prompt: "isolated on a pure plain white background, completely empty surroundings, clean product photography style, soft even studio lighting, no shadows or reflections, no scenery, no environment, no objects in the background" },
];

const ANIMATION_PRESETS = [
  // ✨ CINEMAGRAPH STYLE — only one or two elements move, rest stays still
  { id: "cinemagraph", group: "subtle", label: "✨ Living Photo (Subtle)", prompt: "Cinemagraph effect: the dumpster stays completely still and frozen, only the surrounding environment moves subtly — clouds drifting slowly across the sky, gentle breeze rustling nearby leaves or grass. The dumpster itself does not move at all. Photorealistic, very subtle motion only, like an animated photograph." },
  { id: "lightshift",  group: "subtle", label: "🌤️ Shifting Light",        prompt: "Cinemagraph effect: the dumpster remains perfectly still, only the lighting changes — sunlight gently shifts across the dumpster as if clouds are passing overhead, soft shadows moving slowly. No camera movement, no other motion. Like a living photograph." },
  { id: "drone",       group: "subtle", label: "🛸 Cinematic Pan",         prompt: "Slow smooth cinematic camera movement around the static dumpster, gentle dolly or drone-like motion, the dumpster itself does not move, only the camera. Professional cinematography, subtle parallax effect." },

  // 🎬 ACTION STYLE — full motion, real video
  { id: "worker",     group: "action", label: "👷 Worker Throws Trash",    prompt: "A construction worker walks up to the dumpster and tosses a black trash bag into it. The bag arcs through the air and lands inside. Realistic motion, photorealistic." },
  { id: "excavator",  group: "action", label: "🚜 Excavator Dumping",       prompt: "A small excavator scoops up construction debris and dumps it into the dumpster, dust and small debris flying briefly. Realistic motion, photorealistic." },
  { id: "truck",      group: "action", label: "🚛 Truck Hooks Up",          prompt: "A roll-off truck slowly backs up toward the stationary dumpster and begins to hook onto it. Smooth, realistic motion." },
];

export default function App() {
  const [companyName, setCompanyName] = useState("ABC Dumpsters");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2e7d32");
  const [accentColor, setAccentColor] = useState("#ffffff");
  const [selectedSize, setSelectedSize] = useState(DUMPSTER_SIZES[2]); // default 20 YD
  const [customSize, setCustomSize] = useState(""); // e.g. "25 YD"
  const [customDims, setCustomDims] = useState("");
  const [useCustomDims, setUseCustomDims] = useState(false);
  const [quality, setQuality] = useState("standard"); // 'standard' | 'pro'
  const [customPrompt, setCustomPrompt] = useState("");
  const [activePreset, setActivePreset] = useState(null);
  const [logoFile, setLogoFile] = useState(null); // File object
  const [logoPreview, setLogoPreview] = useState(null); // base64 data URL for preview/upload

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]); // { url, prompt, timestamp, meta }
  const [currentImg, setCurrentImg] = useState(null);
  const previewRef = useRef(null);

  // Animation state
  const [showAnimateModal, setShowAnimateModal] = useState(false);
  const [animationPrompt, setAnimationPrompt] = useState("");
  const [activeAnimPreset, setActiveAnimPreset] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [animationStatus, setAnimationStatus] = useState(""); // user-facing status text
  const [animationVideo, setAnimationVideo] = useState(null); // { url, gifUrl, prompt, sourceImg }
  const [animationError, setAnimationError] = useState("");
  const [convertingGif, setConvertingGif] = useState(false);
  const [gifProgress, setGifProgress] = useState(0); // 0-100

  // Resolved size + dims, handling the "Custom" case
  const resolvedSize = useMemo(() => {
    const isCustom = selectedSize.yd === "custom";
    const label = isCustom && customSize.trim() ? customSize.trim() : selectedSize.label;
    const dims = useCustomDims && customDims.trim()
      ? customDims.trim()
      : (isCustom ? "" : selectedSize.dims);
    return { label, dims };
  }, [selectedSize, customSize, customDims, useCustomDims]);

  const sizeLabel = useMemo(() => {
    return resolvedSize.dims
      ? `${resolvedSize.label} - ${resolvedSize.dims}`
      : resolvedSize.label;
  }, [resolvedSize]);

  const buildFinalPrompt = useCallback((scenePrompt) => {
    const company = companyName.trim() || "ABC Dumpsters";
    const phone = phoneNumber.trim();

    const textBlocks = [
      `the company name "${company}" in large bold letters on the side panel`,
      phone ? `the phone number "${phone}" below the company name` : null,
      `the size label "${resolvedSize.label}" prominently displayed on the side panel`,
    ].filter(Boolean).join(", ");

    // Measuring overlay — dimensions shown on lines outside the dumpster, not on it
    const measuringLine = resolvedSize.dims
      ? ` Outside the dumpster, overlay clean technical measuring lines with arrowheads at each end (like architectural drawings or product spec diagrams), labeled with the dimensions "${resolvedSize.dims}" feet (length x width x height). The measuring lines should be thin black or dark gray, drawn outside the dumpster body — NOT painted on the dumpster itself. Do NOT show these dimension numbers anywhere on the dumpster's painted surface.`
      : "";

    const logoNote = logoPreview
      ? " A company logo (provided as a reference image) is placed on the side panel of the dumpster, alongside the company name. The logo should be clearly visible, well-positioned, and integrated naturally with the painted surface."
      : "";

    return `Professional photo of a ${resolvedSize.label} roll-off dumpster${resolvedSize.dims ? `, ${resolvedSize.dims} feet (length x width x height)` : ""}. The dumpster body is painted ${primaryColor} with ${accentColor} text and accents. On the side panel, clearly displayed text reads: ${textBlocks}. The text must be perfectly legible, sharp, and well-spaced.${logoNote}${measuringLine} Scene: ${scenePrompt}. Photorealistic, sharp focus, 16:9 aspect ratio, high detail.`;
  }, [companyName, phoneNumber, primaryColor, accentColor, resolvedSize, logoPreview]);

  const generate = async (scenePrompt, presetId = null) => {
    if (!companyName.trim()) {
      setError("Please enter a company name first.");
      return;
    }
    if (!scenePrompt || !scenePrompt.trim()) {
      setError("Pick a preset scene or write your own description.");
      return;
    }

    setLoading(true);
    setError("");
    setActivePreset(presetId);

    const finalPrompt = buildFinalPrompt(scenePrompt);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          quality,
          logo: logoPreview || null,  // base64 data URL or null
        }),
      });

      // Try to parse JSON, but handle the case where the server returned HTML or plain text
      let data;
      const responseText = await res.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        // Likely a Vercel timeout (status 504 with HTML body)
        if (res.status === 504 || responseText.includes("FUNCTION_INVOCATION_TIMEOUT")) {
          if (quality === "pro") {
            throw new Error(
              "Pro quality timed out. Pro takes 60-90 seconds and Vercel's free plan only allows 60 seconds. " +
              "Try Standard quality instead — it's nearly as good and much more reliable."
            );
          }
          throw new Error(
            "The generation timed out. This is unusual for Standard quality. Please try again in a moment."
          );
        }
        throw new Error(
          `Server returned an unexpected response (status ${res.status}). ` +
          `Try again, or check Vercel logs if it keeps happening.`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || `Generation failed (status ${res.status})`);
      }

      if (!data.url) {
        throw new Error("Server response did not include an image URL.");
      }

      const newItem = {
        url: data.url,
        prompt: scenePrompt,
        timestamp: Date.now(),
        meta: { size: sizeLabel, company: companyName, quality },
      };
      setCurrentImg(newItem);
      setHistory(h => [newItem, ...h].slice(0, 8));

      // On mobile, auto-scroll to the preview so the user can see their new image
      setTimeout(() => {
        if (previewRef.current && window.innerWidth <= 900) {
          previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } catch (err) {
      // Network failures (offline, timeout) come through as TypeError
      const msg = err.name === "TypeError"
        ? `Network error: ${err.message}. Check your internet connection or try again.`
        : err.message;
      setError(msg);
      console.error("Generation failed:", err);
    } finally {
      setLoading(false);
      setActivePreset(null);
    }
  };

  const downloadImg = () => {
    if (!currentImg) return;
    const a = document.createElement("a");
    a.href = currentImg.url;
    const safeSize = resolvedSize.label.replace(/\s+/g, "");
    a.download = `${(companyName || "dumpster").replace(/\s+/g, "-").toLowerCase()}-${safeSize}.png`;
    a.click();
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (PNG, JPG, etc).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Logo file is too large. Please upload a file under 4MB.");
      return;
    }
    setError("");
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  /* ─── ANIMATION ─── */

  // Convert an MP4 data URL to a GIF blob URL using gif.js + canvas frame extraction.
  // gif.js is loaded as a global from a script tag in index.html, exposed as window.GIF.
  const convertVideoToGif = (videoUrl) => {
    return new Promise((resolve, reject) => {
      // Make sure gif.js has loaded from the CDN. It usually has by the time the user
      // generates their first animation (~1+ minutes after page load), but we check anyway.
      if (typeof window.GIF === "undefined") {
        reject(new Error("GIF library hasn't loaded yet. Check your internet connection and try again."));
        return;
      }

      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.src = videoUrl;

      video.onloadedmetadata = () => {
        const duration = Math.min(video.duration || 8, 10); // cap at 10s safety

        // Detect mobile to use lower-memory settings.
        // Mobile RAM is more constrained, and Safari is finicky about repeated video.seek() calls.
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const fps = isMobile ? 8 : 10;
        const targetWidth = isMobile ? 480 : 640;

        const scale = targetWidth / video.videoWidth;
        const targetHeight = Math.round(video.videoHeight * scale);

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        const gif = new window.GIF({
          workers: 2,
          quality: 10,            // 1 = best, 30 = worst. 10 is a nice balance
          width: targetWidth,
          height: targetHeight,
          workerScript: "/gif.worker.js",
        });

        gif.on("progress", (p) => {
          // p is 0-1 during the encoding phase (after frames captured)
          setGifProgress(50 + Math.round(p * 50));
        });

        gif.on("finished", (blob) => {
          const gifUrl = URL.createObjectURL(blob);
          resolve(gifUrl);
        });

        gif.on("abort", () => reject(new Error("GIF conversion was cancelled.")));

        // Walk through the video frame by frame
        const frameInterval = 1 / fps;       // seconds between frames
        const totalFrames = Math.floor(duration * fps);
        let currentFrame = 0;

        const captureNextFrame = () => {
          if (currentFrame >= totalFrames) {
            // All frames captured — start the encode
            setGifProgress(50);
            gif.render();
            return;
          }

          const targetTime = currentFrame * frameInterval;
          video.currentTime = targetTime;
        };

        video.onseeked = () => {
          // Once video has seeked to the requested time, draw it onto the canvas
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          // Add this frame to the gif (delay in ms between frames)
          gif.addFrame(ctx, { copy: true, delay: Math.round(1000 / fps) });
          currentFrame++;
          // Update capture-phase progress (0-50%)
          setGifProgress(Math.round((currentFrame / totalFrames) * 50));
          captureNextFrame();
        };

        video.onerror = () => reject(new Error("Could not load video for GIF conversion."));

        // Kick off the first frame capture
        captureNextFrame();
      };

      video.onerror = () => reject(new Error("Could not load video for GIF conversion."));
    });
  };

  const openAnimateModal = () => {
    setShowAnimateModal(true);
    setAnimationError("");
    setAnimationVideo(null);
    setAnimationPrompt("");
    setActiveAnimPreset(null);
  };

  const closeAnimateModal = () => {
    if (animating) return; // don't allow closing mid-generation
    setShowAnimateModal(false);
  };

  const startAnimation = async (animPrompt, presetId = null) => {
    if (!currentImg) {
      setAnimationError("No image to animate.");
      return;
    }
    if (!animPrompt || !animPrompt.trim()) {
      setAnimationError("Please pick a preset or write a description.");
      return;
    }

    setAnimating(true);
    setAnimationError("");
    setAnimationVideo(null);
    setActiveAnimPreset(presetId);
    setAnimationStatus("Starting animation job…");

    try {
      // Step 1: Kick off the job
      const startRes = await fetch("/api/animate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: animPrompt.trim(),
          image: currentImg.url,
        }),
      });

      const startData = await startRes.json().catch(() => ({}));
      if (!startRes.ok) {
        throw new Error(startData.error || `Failed to start animation (status ${startRes.status})`);
      }

      const { operationName } = startData;
      if (!operationName) throw new Error("Server did not return an operation handle.");

      // Step 2: Poll for completion. Veo takes 30-90 seconds typically.
      setAnimationStatus("Animating your dumpster… this usually takes 1-2 minutes.");

      const startTime = Date.now();
      const maxWaitMs = 5 * 60 * 1000; // 5 minute hard cap

      while (true) {
        const elapsed = Date.now() - startTime;
        if (elapsed > maxWaitMs) {
          throw new Error("Animation took too long (over 5 minutes). Please try again.");
        }

        // Update progress display every iteration
        const seconds = Math.floor(elapsed / 1000);
        setAnimationStatus(`Animating your dumpster… ${seconds}s elapsed (typically 60-120s)`);

        // Wait 5 seconds between polls
        await new Promise(r => setTimeout(r, 5000));

        const statusRes = await fetch("/api/animate-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName }),
        });

        const statusData = await statusRes.json().catch(() => ({}));
        if (!statusRes.ok) {
          throw new Error(statusData.error || `Status check failed (${statusRes.status})`);
        }

        if (statusData.done) {
          if (statusData.error) {
            throw new Error(statusData.error);
          }
          if (!statusData.url) {
            throw new Error("Animation finished but no video was returned.");
          }
          // Veo job complete — now convert the MP4 to a GIF in the browser
          setAnimationStatus("Converting to GIF…");
          setConvertingGif(true);
          setGifProgress(0);

          let gifUrl = null;
          try {
            gifUrl = await convertVideoToGif(statusData.url);
          } catch (gifErr) {
            // GIF conversion failed but we still have the MP4 — surface a soft warning
            console.error("GIF conversion failed:", gifErr);
            setAnimationError(
              `Video generated successfully, but GIF conversion failed: ${gifErr.message}. You can still view the video.`
            );
          } finally {
            setConvertingGif(false);
          }

          setAnimationVideo({
            url: statusData.url,
            gifUrl: gifUrl,
            prompt: animPrompt.trim(),
            sourceImg: currentImg.url,
            timestamp: Date.now(),
          });
          setAnimationStatus("");
          break;
        }
      }
    } catch (err) {
      console.error("Animation failed:", err);
      setAnimationError(err.message || "Animation failed.");
      setAnimationStatus("");
    } finally {
      setAnimating(false);
      setActiveAnimPreset(null);
    }
  };

  const downloadAnimation = () => {
    if (!animationVideo) return;
    const a = document.createElement("a");
    const safeSize = resolvedSize.label.replace(/\s+/g, "");
    const safeName = (companyName || "dumpster").replace(/\s+/g, "-").toLowerCase();
    if (animationVideo.gifUrl) {
      a.href = animationVideo.gifUrl;
      a.download = `${safeName}-${safeSize}-animation.gif`;
    } else {
      // Fallback to MP4 if GIF conversion failed
      a.href = animationVideo.url;
      a.download = `${safeName}-${safeSize}-animation.mp4`;
    }
    a.click();
  };

  const sectionTitle = {
    fontSize: "11px", fontWeight: 700, color: GREEN, textTransform: "uppercase",
    letterSpacing: "0.08em", marginBottom: "10px", marginTop: "20px",
  };
  const btnPrimary = {
    width: "100%", padding: "14px", border: "none", borderRadius: "6px",
    background: GREEN, color: "white", fontSize: "15px", fontWeight: 700,
    cursor: "pointer", transition: "all 0.2s",
  };
  const btnSecondary = {
    padding: "10px 14px", border: `1px solid ${BORDER}`, borderRadius: "6px",
    background: WHITE, color: TEXT, fontSize: "13px", fontWeight: 600,
    cursor: "pointer", transition: "all 0.15s", textAlign: "left",
  };

  const formInvalid = !companyName.trim();

  return (
    <div style={{ fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif", background: BG, color: TEXT, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: WHITE, borderBottom: `3px solid ${GREEN}`, padding: "14px 24px" }}>
        <div style={{ fontSize: "18px", fontWeight: 800, color: GREEN, letterSpacing: "0.02em" }}>
          🚛 iCans Dumpster Image Generator
        </div>
      </div>

      <div className="layout-grid" style={{ display: "grid", gridTemplateColumns: "440px 1fr", gap: 0, minHeight: "calc(100vh - 53px)" }}>
        {/* LEFT — Controls */}
        <div className="controls-pane" style={{ padding: "24px", background: WHITE, borderRight: `1px solid #e0e0e0`, overflowY: "auto", maxHeight: "calc(100vh - 53px)" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: TEXT, marginBottom: "4px" }}>Design Your Dumpster</h2>
          <p style={{ fontSize: "13px", color: TEXT_LIGHT, marginBottom: "20px" }}>
            Brand your dumpster, pick a scene, and generate a marketing-ready image.
          </p>

          {/* BRANDING */}
          <div style={sectionTitle}>1. Branding</div>

          <label style={labelStyle}>Company Name *
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. ABC Dumpsters" style={inputStyle} />
          </label>

          <label style={labelStyle}>Phone Number (optional)
            <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="(555) 123-4567" style={inputStyle} />
          </label>

          {/* Logo upload */}
          <label style={labelStyle}>Logo (optional)
            {logoPreview ? (
              <div style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "10px",
                border: `1px solid ${BORDER}`, borderRadius: "6px", background: "#f8fafc",
              }}>
                <img src={logoPreview} alt="Logo preview" style={{
                  width: "48px", height: "48px", objectFit: "contain",
                  background: WHITE, borderRadius: "4px", border: "1px solid #e0e0e0",
                }} />
                <div style={{ flex: 1, fontSize: "12px", color: TEXT_LIGHT, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {logoFile?.name || "Logo uploaded"}
                </div>
                <button
                  type="button"
                  onClick={removeLogo}
                  style={{
                    padding: "6px 10px", border: `1px solid #f5c6cb`, borderRadius: "6px",
                    background: "#fff5f5", color: "#dc3545", fontSize: "12px", fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoUpload}
                style={{ ...inputStyle, padding: "8px", cursor: "pointer" }}
              />
            )}
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
            <label style={labelStyle}>Dumpster Color
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                style={{ ...inputStyle, height: "44px", padding: "4px", cursor: "pointer" }} />
            </label>
            <label style={labelStyle}>Text/Accent Color
              <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                style={{ ...inputStyle, height: "44px", padding: "4px", cursor: "pointer" }} />
            </label>
          </div>

          {/* SIZE */}
          <div style={sectionTitle}>2. Dumpster Size</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "12px" }}>
            {DUMPSTER_SIZES.map(s => (
              <button key={s.yd} onClick={() => setSelectedSize(s)} style={{
                padding: "10px 6px", border: `2px solid ${selectedSize.yd === s.yd ? GREEN : "#e0e0e0"}`,
                borderRadius: "6px", background: selectedSize.yd === s.yd ? "#e8f5e9" : WHITE,
                color: selectedSize.yd === s.yd ? GREEN : TEXT, cursor: "pointer",
                fontWeight: 700, fontSize: "14px", transition: "all 0.15s",
              }}>
                <div>{s.label}</div>
                <div style={{ fontSize: "10px", fontWeight: 500, color: TEXT_MUTED, marginTop: "2px" }}>
                  {s.dims || "your size"}
                </div>
              </button>
            ))}
          </div>

          {selectedSize.yd === "custom" && (
            <label style={labelStyle}>Custom Size Label
              <input
                value={customSize}
                onChange={e => setCustomSize(e.target.value)}
                placeholder="e.g. 25 YD"
                style={inputStyle}
              />
            </label>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: TEXT_LIGHT, marginBottom: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={useCustomDims} onChange={e => setUseCustomDims(e.target.checked)} />
            Use custom dimensions
          </label>
          {useCustomDims && (
            <input
              value={customDims}
              onChange={e => setCustomDims(e.target.value)}
              placeholder="e.g. 22 x 8 x 5"
              style={inputStyle}
            />
          )}

          {/* QUALITY */}
          <div style={sectionTitle}>3. Quality</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "6px" }}>
            <button onClick={() => setQuality("standard")} style={{
              padding: "12px 10px", border: `2px solid ${quality === "standard" ? GREEN : "#e0e0e0"}`,
              borderRadius: "6px", background: quality === "standard" ? "#e8f5e9" : WHITE,
              color: quality === "standard" ? GREEN : TEXT, cursor: "pointer",
              fontWeight: 700, fontSize: "13px", textAlign: "left",
            }}>
              <div>Standard</div>
              <div style={{ fontSize: "11px", fontWeight: 500, color: TEXT_MUTED, marginTop: "2px" }}>Fast & reliable</div>
            </button>
            <button onClick={() => setQuality("pro")} style={{
              padding: "12px 10px", border: `2px solid ${quality === "pro" ? GREEN : "#e0e0e0"}`,
              borderRadius: "6px", background: quality === "pro" ? "#e8f5e9" : WHITE,
              color: quality === "pro" ? GREEN : TEXT, cursor: "pointer",
              fontWeight: 700, fontSize: "13px", textAlign: "left",
            }}>
              <div>Pro</div>
              <div style={{ fontSize: "11px", fontWeight: 500, color: TEXT_MUTED, marginTop: "2px" }}>Sharper, slower</div>
            </button>
          </div>
          {quality === "pro" && (
            <div style={{
              fontSize: "11px", color: "#92400e", background: "#fef3c7",
              padding: "8px 10px", borderRadius: "6px", marginBottom: "10px",
              border: "1px solid #fde68a",
            }}>
              ⚠️ Pro can take 60-90 seconds and may time out on Vercel's free plan. Stick with Standard unless you really need it.
            </div>
          )}

          {/* SCENE PRESETS */}
          <div style={sectionTitle}>4. Pick a Scene (one click)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
            {PRESET_SCENES.map(p => (
              <button
                key={p.id}
                disabled={loading || formInvalid}
                onClick={() => generate(p.prompt, p.id)}
                style={{
                  ...btnSecondary,
                  opacity: loading || formInvalid ? 0.5 : 1,
                  cursor: loading || formInvalid ? "not-allowed" : "pointer",
                  background: activePreset === p.id ? "#e8f5e9" : WHITE,
                  borderColor: activePreset === p.id ? GREEN : BORDER,
                }}
              >
                {activePreset === p.id ? "Generating…" : p.label}
              </button>
            ))}
          </div>

          {/* CUSTOM PROMPT */}
          <div style={sectionTitle}>5. Or Describe Your Own Scene</div>
          <textarea
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="e.g. parked next to a lake at dawn with a small fishing boat in the background, misty atmosphere"
            style={{ ...inputStyle, minHeight: "90px", resize: "vertical", marginBottom: "10px", fontFamily: "inherit" }}
            disabled={loading}
          />

          <button
            onClick={() => generate(customPrompt, "custom")}
            disabled={loading || formInvalid || !customPrompt.trim()}
            style={{
              ...btnPrimary,
              opacity: loading || formInvalid || !customPrompt.trim() ? 0.5 : 1,
              cursor: loading || formInvalid || !customPrompt.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading && activePreset === "custom" ? "Generating…" : "Generate Custom Image"}
          </button>

          {error && (
            <div style={{ marginTop: "12px", padding: "10px 12px", background: "#fff5f5", border: "1px solid #f5c6cb",
              borderRadius: "6px", color: "#dc3545", fontSize: "13px" }}>
              {error}
            </div>
          )}

          <p style={{ fontSize: "11px", color: TEXT_MUTED, marginTop: "16px", lineHeight: 1.5 }}>
            Tip: Standard quality is fast and reliable. Use Pro only when you need extra-sharp text — it's much slower and may time out.
          </p>
        </div>

        {/* RIGHT — Preview + History */}
        <div ref={previewRef} className="preview-pane" style={{ padding: "24px", background: "#fafafa", overflowY: "auto", maxHeight: "calc(100vh - 53px)" }}>
          <div style={{ background: WHITE, borderRadius: "8px", padding: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "20px" }}>
            {loading ? (
              <div style={{ aspectRatio: "16 / 9", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0", borderRadius: "6px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: "40px", height: "40px", margin: "0 auto 12px",
                    border: `4px solid ${BORDER}`, borderTopColor: GREEN,
                    borderRadius: "50%", animation: "spin 1s linear infinite",
                  }} />
                  <div style={{ fontSize: "16px", fontWeight: 600, color: TEXT }}>
                    Generating your branded dumpster…
                  </div>
                  <div style={{ fontSize: "13px", color: TEXT_LIGHT, marginTop: "4px" }}>
                    {quality === "pro" ? "Pro quality (~60-90 seconds)" : "Standard quality (~10-20 seconds)"}
                  </div>
                </div>
              </div>
            ) : currentImg ? (
              <>
                <img
                  src={currentImg.url}
                  alt="Generated dumpster"
                  style={{ width: "100%", height: "auto", borderRadius: "6px", display: "block" }}
                  onError={() => setError("The image was generated but couldn't be displayed. Try generating again, or check the browser console for details.")}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ fontSize: "13px", color: TEXT_LIGHT, flex: 1, minWidth: "150px" }}>
                    <strong style={{ color: TEXT }}>{currentImg.meta.company}</strong>
                    &nbsp;·&nbsp;{currentImg.meta.size}
                    &nbsp;·&nbsp;{currentImg.meta.quality === "pro" ? "Pro" : "Standard"}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={openAnimateModal} style={{
                      padding: "8px 16px", background: WHITE, color: GREEN, border: `2px solid ${GREEN}`,
                      borderRadius: "6px", fontWeight: 600, fontSize: "13px", cursor: "pointer",
                    }}>
                      🎬 Animate
                    </button>
                    <button onClick={downloadImg} style={{
                      padding: "8px 16px", background: GREEN, color: WHITE, border: "none",
                      borderRadius: "6px", fontWeight: 600, fontSize: "13px", cursor: "pointer",
                    }}>
                      ↓ Download
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ aspectRatio: "16 / 9", display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg, #f5f5f5 0%, #e8f5e9 100%)", borderRadius: "6px",
                border: `2px dashed ${BORDER}` }}>
                <div style={{ textAlign: "center", padding: "24px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "8px" }}>🚛</div>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: TEXT, marginBottom: "4px" }}>
                    Your dumpster will appear here
                  </div>
                  <div style={{ fontSize: "13px", color: TEXT_LIGHT }}>
                    Fill in your brand details and pick a scene to start
                  </div>
                </div>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: TEXT, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Recent Generations
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                {history.map((h, i) => (
                  <button key={i} onClick={() => setCurrentImg(h)} style={{
                    border: currentImg?.timestamp === h.timestamp ? `3px solid ${GREEN}` : `1px solid #e0e0e0`,
                    borderRadius: "6px", padding: 0, overflow: "hidden", cursor: "pointer", background: WHITE,
                    aspectRatio: "16 / 9",
                  }}>
                    <img src={h.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── ANIMATE MODAL ─── */}
      {showAnimateModal && (
        <div
          onClick={closeAnimateModal}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: WHITE, borderRadius: "12px", padding: "24px",
              maxWidth: "560px", width: "100%", maxHeight: "90vh", overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: TEXT, margin: 0 }}>
                🎬 Animate Your Dumpster
              </h3>
              {!animating && (
                <button onClick={closeAnimateModal} style={{
                  width: "32px", height: "32px", border: "none", background: "#f0f0f0",
                  borderRadius: "50%", fontSize: "18px", cursor: "pointer", color: TEXT_LIGHT,
                }}>×</button>
              )}
            </div>

            {!animationVideo && (
              <div style={{
                fontSize: "12px", color: "#92400e", background: "#fef3c7",
                padding: "10px 12px", borderRadius: "6px", marginBottom: "16px",
                border: "1px solid #fde68a",
              }}>
                ⚠️ Heads up: Each animation takes about 1-2 minutes and costs roughly <strong>$0.40</strong>. You'll get an 8-second animated GIF you can download.
              </div>
            )}

            {animating ? (
              <div style={{ textAlign: "center", padding: "30px 20px" }}>
                <div style={{
                  width: "48px", height: "48px", margin: "0 auto 16px",
                  border: `4px solid ${BORDER}`, borderTopColor: GREEN,
                  borderRadius: "50%", animation: "spin 1s linear infinite",
                }} />
                <div style={{ fontSize: "15px", fontWeight: 600, color: TEXT, marginBottom: "8px" }}>
                  {animationStatus || "Working…"}
                </div>
                <div style={{ fontSize: "12px", color: TEXT_LIGHT }}>
                  {convertingGif
                    ? "Almost done — converting your animation to GIF in your browser."
                    : "Please don't close this window. Veo is rendering 8 seconds of video."}
                </div>
                {convertingGif && (
                  <div style={{
                    marginTop: "16px", height: "6px", background: BORDER, borderRadius: "3px",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", background: GREEN, width: `${gifProgress}%`,
                      transition: "width 0.3s",
                    }} />
                  </div>
                )}
              </div>
            ) : animationVideo ? (
              <div>
                {/* Use GIF for preview if available, fall back to video */}
                {animationVideo.gifUrl ? (
                  <img
                    src={animationVideo.gifUrl}
                    alt="Animated GIF"
                    style={{ width: "100%", borderRadius: "8px", marginBottom: "12px", display: "block" }}
                  />
                ) : (
                  <video
                    src={animationVideo.url}
                    controls
                    autoPlay
                    loop
                    style={{ width: "100%", borderRadius: "8px", marginBottom: "12px", display: "block" }}
                  />
                )}
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginBottom: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => { setAnimationVideo(null); setAnimationPrompt(""); }}
                    style={{
                      padding: "10px 16px", background: WHITE, color: TEXT,
                      border: `1px solid ${BORDER}`, borderRadius: "6px",
                      fontWeight: 600, fontSize: "13px", cursor: "pointer",
                    }}
                  >
                    🔄 Try Another
                  </button>
                  <button
                    onClick={downloadAnimation}
                    style={{
                      padding: "10px 16px", background: GREEN, color: WHITE, border: "none",
                      borderRadius: "6px", fontWeight: 600, fontSize: "13px", cursor: "pointer",
                    }}
                  >
                    ↓ Download {animationVideo.gifUrl ? "GIF" : "Video"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Source image preview */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: TEXT_LIGHT, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                    Animating this image:
                  </div>
                  <img
                    src={currentImg?.url}
                    alt="Source"
                    style={{ width: "100%", borderRadius: "6px", border: `1px solid ${BORDER}`, display: "block" }}
                  />
                </div>

                {/* Animation presets — grouped into Subtle vs Action */}
                <div style={{ fontSize: "11px", fontWeight: 700, color: GREEN, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                  Subtle Motion <span style={{ color: TEXT_MUTED, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>· cinemagraph style, only some elements move</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                  {ANIMATION_PRESETS.filter(p => p.group === "subtle").map(p => (
                    <button
                      key={p.id}
                      onClick={() => startAnimation(p.prompt, p.id)}
                      disabled={animating}
                      style={{
                        padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: "6px",
                        background: activeAnimPreset === p.id ? "#e8f5e9" : WHITE,
                        color: TEXT, fontSize: "13px", fontWeight: 600, cursor: "pointer",
                        textAlign: "left", transition: "all 0.15s",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: "11px", fontWeight: 700, color: GREEN, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                  Full Action <span style={{ color: TEXT_MUTED, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>· realistic video with people / vehicles in motion</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                  {ANIMATION_PRESETS.filter(p => p.group === "action").map(p => (
                    <button
                      key={p.id}
                      onClick={() => startAnimation(p.prompt, p.id)}
                      disabled={animating}
                      style={{
                        padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: "6px",
                        background: activeAnimPreset === p.id ? "#e8f5e9" : WHITE,
                        color: TEXT, fontSize: "13px", fontWeight: 600, cursor: "pointer",
                        textAlign: "left", transition: "all 0.15s",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Or custom */}
                <div style={{ fontSize: "11px", fontWeight: 700, color: GREEN, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                  Or describe your own
                </div>
                <textarea
                  value={animationPrompt}
                  onChange={e => setAnimationPrompt(e.target.value)}
                  placeholder='e.g. "have sasquatch in a red bikini throw a trashbag into the dumpster"'
                  style={{
                    ...inputStyle, minHeight: "80px", resize: "vertical",
                    marginBottom: "10px", fontFamily: "inherit",
                  }}
                  disabled={animating}
                />
                <button
                  onClick={() => startAnimation(animationPrompt, "custom")}
                  disabled={animating || !animationPrompt.trim()}
                  style={{
                    width: "100%", padding: "12px", border: "none", borderRadius: "6px",
                    background: GREEN, color: WHITE, fontSize: "14px", fontWeight: 700,
                    cursor: animating || !animationPrompt.trim() ? "not-allowed" : "pointer",
                    opacity: animating || !animationPrompt.trim() ? 0.5 : 1,
                  }}
                >
                  Animate with custom prompt
                </button>
              </>
            )}

            {animationError && (
              <div style={{
                marginTop: "12px", padding: "10px 12px", background: "#fff5f5",
                border: "1px solid #f5c6cb", borderRadius: "6px", color: "#dc3545", fontSize: "13px",
              }}>
                {animationError}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Tablet and below — stack the two panels vertically */
        @media (max-width: 900px) {
          .layout-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto auto;
          }
          .controls-pane {
            border-right: none !important;
            border-bottom: 1px solid #e0e0e0;
            max-height: none !important;
            overflow-y: visible !important;
          }
          .preview-pane {
            max-height: none !important;
            overflow-y: visible !important;
          }
        }

        /* Phone — tighter padding */
        @media (max-width: 480px) {
          .controls-pane, .preview-pane {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
