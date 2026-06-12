import { useState, useEffect, useMemo, useRef } from "react";

/* ──────────────────────────────────────────────
   THEME
   ────────────────────────────────────────────── */

const C = {
  green:      "#1f6f3d",
  greenDark:  "#143d22",
  greenLight: "#e8f3ec",
  ink:        "#0f172a",
  charcoal:   "#334155",
  muted:      "#64748b",
  mist:       "#e2e8f0",
  cream:      "#f8fafc",
  white:      "#ffffff",
  danger:     "#dc2626",
  warning:    "#f59e0b",
};

const F = {
  body: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

/* ──────────────────────────────────────────────
   PRESETS
   ────────────────────────────────────────────── */

const SIZES = [
  { yd: 10, label: "10",     dims: "12 × 8 × 3.5" },
  { yd: 15, label: "15",     dims: "16 × 8 × 4" },
  { yd: 20, label: "20",     dims: "22 × 8 × 4" },
  { yd: 30, label: "30",     dims: "22 × 8 × 6" },
  { yd: 40, label: "40",     dims: "22 × 8 × 8" },
];

const SCENES = [
  { id: "studio",       label: "Studio",        emoji: "🎬" },
  { id: "driveway",     label: "Driveway",      emoji: "🏡" },
  { id: "construction", label: "Construction",  emoji: "🏗️" },
  { id: "sunset",       label: "Sunset",        emoji: "🌅" },
  { id: "commercial",   label: "Commercial lot",emoji: "🏢" },
  { id: "renovation",   label: "Renovation",    emoji: "🔨" },
  { id: "plain",        label: "Plain",         emoji: "⬜" },
];

const SCENE_PROMPTS = {
  studio:       "Professional studio shot with seamless light gray background, soft even lighting from above, no shadows on the floor, product photography style.",
  driveway:     "Parked on a clean residential suburban driveway during the day, manicured lawn visible, single-family home blurred softly in the background, natural sunlight.",
  construction: "On a busy active construction site, bare framing of a house visible in background, tools and materials nearby, dust in the air, golden hour light.",
  sunset:       "Hero shot at golden-hour sunset, warm orange and pink sky, dramatic cinematic lighting, subtle lens flare, shot from a low angle to make the dumpster look heroic.",
  commercial:   "In an empty commercial parking lot next to a small strip mall or office building, midday lighting, clean asphalt, professional setting.",
  renovation:   "Outside a home that's clearly mid-renovation, with some old siding or roofing materials neatly stacked next to the dumpster, suburban setting, daytime.",
  plain:        "Plain solid white background, soft even studio lighting, no environment, isolated product shot.",
};

const ANIM_PRESETS = {
  subtle: [
    { id: "living-photo",   label: "Living Photo",   emoji: "✨",  prompt: "Cinemagraph style: the dumpster stays perfectly still, only subtle ambient motion in the background like gently swaying leaves, drifting clouds, or a soft breeze through grass. The dumpster itself does not move." },
    { id: "shifting-light", label: "Shifting Light", emoji: "🌤️", prompt: "Cinemagraph style: dumpster stays completely still while light gradually shifts as if clouds are passing overhead, soft shadows moving slowly across the dumpster's surface. No other motion." },
    { id: "cinematic-pan",  label: "Cinematic Pan",  emoji: "🎥",  prompt: "Slow cinematic camera pan to the right around the stationary dumpster, very subtle and smooth movement, the dumpster itself does not move." },
  ],
  action: [
    { id: "worker-throws",  label: "Worker Throws Trash",emoji: "👷", prompt: "A construction worker in safety gear throws a bag of debris into the dumpster from the side. The dumpster itself stays stationary." },
    { id: "excavator",      label: "Excavator Dumping",  emoji: "🚜", prompt: "A small excavator scoops up materials and dumps them into the dumpster from above, dust and debris flying. The dumpster stays in place." },
    { id: "truck-hooks",    label: "Truck Hooks Up",     emoji: "🚛", prompt: "A roll-off truck slowly backs up to the dumpster to hook it up for hauling, the truck moves into position." },
  ],
};

const DEFAULTS = {
  companyName: "OnlyCans",
  phone:       "(555) 123-4567",
  bodyColor:   "#FFFFFF",  // white dumpster
  accentColor: "#89CFF0",  // baby blue text
  sizeYd:      20,
};

/* ──────────────────────────────────────────────
   APP
   ────────────────────────────────────────────── */

export default function App() {
  // brand
  const [companyName, setCompanyName] = useState(DEFAULTS.companyName);
  const [phone, setPhone]             = useState(DEFAULTS.phone);
  const [bodyColor, setBodyColor]     = useState(DEFAULTS.bodyColor);
  const [accentColor, setAccentColor] = useState(DEFAULTS.accentColor);
  const [logo, setLogo]               = useState(null); // data URL

  // size
  const [sizeYd, setSizeYd]           = useState(DEFAULTS.sizeYd);
  const [useCustom, setUseCustom]     = useState(false);
  const [customL, setCustomL]         = useState(22);
  const [customW, setCustomW]         = useState(8);
  const [customH, setCustomH]         = useState(4);

  // scene
  const [sceneId, setSceneId]         = useState("studio");
  const [customScene, setCustomScene] = useState("");

  // quality
  const [quality, setQuality]         = useState("standard"); // "standard" | "pro"

  // generation state
  const [generating, setGenerating]   = useState(false);
  const [resultImg, setResultImg]     = useState(null); // { url, prompt, meta }
  const [errorMsg, setErrorMsg]       = useState("");

  // animation state
  const [animOpen, setAnimOpen]       = useState(false);
  const [animPrompt, setAnimPrompt]   = useState("");
  const [animating, setAnimating]     = useState(false);
  const [animStatus, setAnimStatus]   = useState("");
  const [animResult, setAnimResult]   = useState(null); // { gifUrl, mp4Url }
  const [animError, setAnimError]     = useState("");
  const [gifProgress, setGifProgress] = useState(0);
  const [convertingGif, setConvertingGif] = useState(false);

  /* ─── resolved size for prompts and preview ─── */
  const resolvedSize = useMemo(() => {
    if (useCustom) {
      return {
        label: `${customL}×${customW}×${customH} ft`,
        yd: null,
        dims: `${customL} × ${customW} × ${customH}`,
      };
    }
    const s = SIZES.find(x => x.yd === sizeYd) || SIZES[2];
    return { label: `${s.yd} yd`, yd: s.yd, dims: s.dims };
  }, [useCustom, customL, customW, customH, sizeYd]);

  /* ─── handle logo upload ─── */
  const onLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Logo must be under 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  };

  /* ─── build the prompt sent to Gemini ─── */
  const buildPrompt = () => {
    const sceneText = customScene.trim() || SCENE_PROMPTS[sceneId];
    const sizeDesc = useCustom
      ? `${customL} feet long by ${customW} feet wide by ${customH} feet tall`
      : `${resolvedSize.dims} feet (a ${resolvedSize.yd} yard roll-off dumpster)`;

    const hasLogo = !!logo;

    return [
      `A photorealistic image of a single ${sizeDesc} roll-off dumpster.`,
      `The dumpster body is painted ${bodyColor}.`,
      hasLogo
        ? `The provided logo image is placed on the front-facing side panel of the dumpster, well-centered, with the company name "${companyName}" rendered in clean bold sans-serif lettering directly below the logo in the color ${accentColor}.`
        : `The text "${companyName}" is painted on the front-facing side panel in clean bold sans-serif lettering, color ${accentColor}, well-centered.`,
      `Below that, the phone number "${phone}" is shown in smaller but still readable sans-serif lettering, same color ${accentColor}.`,
      `Below that, a clean rectangular badge with the text "${resolvedSize.label.toUpperCase()}" displayed in dark text on a light background.`,
      ``,
      `Scene: ${sceneText}`,
      ``,
      `Show architectural-style measuring lines OUTSIDE the dumpster — thin arrows along the bottom showing length, and a vertical arrow on the right showing height — with the measurements written as plain text labels (for example "${useCustom ? customL : resolvedSize.dims.split(" × ")[0]} FT" and "${useCustom ? customH : resolvedSize.dims.split(" × ")[2]} FT"). The measurements must be OUTSIDE the dumpster, never painted on it.`,
      ``,
      `The dumpster should look real and heavy, sitting flat on the ground. Wide aspect ratio, 16:9, professional commercial photography.`,
    ].join("\n");
  };

  /* ─── generate ─── */
  const generate = async () => {
    setErrorMsg("");
    setGenerating(true);

    try {
      const prompt = buildPrompt();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, quality, logo }),
      });

      let data;
      const responseText = await res.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        if (res.status === 504 || responseText.includes("FUNCTION_INVOCATION_TIMEOUT")) {
          if (quality === "pro") {
            throw new Error("Pro quality timed out. Try Standard — it's nearly as good and much more reliable on the free plan.");
          }
          throw new Error("The generation timed out. Please try again in a moment.");
        }
        throw new Error(`Server returned an unexpected response (status ${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(data.error || `Generation failed (status ${res.status}).`);
      }

      setResultImg({
        url: data.url,
        prompt,
        meta: {
          companyName, phone, sizeLabel: resolvedSize.label, sceneId,
          quality, timestamp: Date.now(),
        },
      });
      // Clear any previous animation when new image is generated
      setAnimResult(null);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  /* ─── download current image ─── */
  const downloadImage = () => {
    if (!resultImg) return;
    const a = document.createElement("a");
    a.href = resultImg.url;
    const safeName = (companyName || "dumpster").replace(/\s+/g, "-").toLowerCase();
    a.download = `${safeName}-${resolvedSize.label.replace(/\s+/g, "")}-${sceneId}.png`;
    a.click();
  };

  /* ─── reset to live preview ─── */
  const clearResult = () => {
    setResultImg(null);
    setAnimResult(null);
    setAnimError("");
  };

  /* ─── animation logic ─── */

  const convertVideoToGif = (videoUrl) => {
    return new Promise((resolve, reject) => {
      if (typeof window.GIF === "undefined") {
        reject(new Error("GIF library hasn't loaded yet. Check your internet connection."));
        return;
      }
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.src = videoUrl;

      video.onloadedmetadata = () => {
        const duration = Math.min(video.duration || 8, 10);
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
          workers: 2, quality: 10,
          width: targetWidth, height: targetHeight,
          workerScript: "/gif.worker.js",
        });

        gif.on("progress", (p) => setGifProgress(50 + Math.round(p * 50)));
        gif.on("finished", (blob) => resolve(URL.createObjectURL(blob)));
        gif.on("abort", () => reject(new Error("GIF conversion was cancelled.")));

        const frameInterval = 1 / fps;
        const totalFrames = Math.floor(duration * fps);
        let currentFrame = 0;

        const captureNextFrame = () => {
          if (currentFrame >= totalFrames) {
            setGifProgress(50);
            gif.render();
            return;
          }
          video.currentTime = currentFrame * frameInterval;
        };

        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          gif.addFrame(ctx, { copy: true, delay: Math.round(1000 / fps) });
          currentFrame++;
          setGifProgress(Math.round((currentFrame / totalFrames) * 50));
          captureNextFrame();
        };
        video.onerror = () => reject(new Error("Could not load video for GIF conversion."));
        captureNextFrame();
      };

      video.onerror = () => reject(new Error("Could not load video for GIF conversion."));
    });
  };

  const startAnimation = async (presetPrompt) => {
    const finalPrompt = (presetPrompt || animPrompt).trim();
    if (!finalPrompt || finalPrompt.length < 5) {
      setAnimError("Please pick a preset or describe the animation.");
      return;
    }
    if (!resultImg) {
      setAnimError("Generate an image first.");
      return;
    }

    setAnimError("");
    setAnimating(true);
    setAnimResult(null);
    setAnimStatus("Starting animation…");

    try {
      const startRes = await fetch("/api/animate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt, image: resultImg.url }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || "Failed to start animation.");

      const { operationName } = startData;
      setAnimStatus("Animating your dumpster… 1-2 minutes.");

      const startTime = Date.now();
      while (true) {
        await new Promise(r => setTimeout(r, 5000));
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setAnimStatus(`Animating your dumpster… ${elapsed}s elapsed`);

        const statusRes = await fetch("/api/animate-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName }),
        });
        const statusData = await statusRes.json();

        if (!statusRes.ok) throw new Error(statusData.error || "Status check failed.");

        if (statusData.done) {
          if (statusData.error) throw new Error(statusData.error);
          if (!statusData.url) throw new Error("Animation finished but no video was returned.");

          setAnimStatus("Converting to GIF…");
          setConvertingGif(true);
          setGifProgress(0);

          let gifUrl = null;
          try {
            gifUrl = await convertVideoToGif(statusData.url);
          } catch (gifErr) {
            console.error("GIF conversion failed:", gifErr);
          } finally {
            setConvertingGif(false);
          }

          setAnimResult({ gifUrl, mp4Url: statusData.url });
          setAnimStatus("");
          break;
        }

        if (elapsed > 300) throw new Error("Animation took too long. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setAnimError(err.message || "Animation failed. Please try again.");
      setAnimStatus("");
    } finally {
      setAnimating(false);
    }
  };

  const downloadAnimation = () => {
    if (!animResult) return;
    const a = document.createElement("a");
    const safeName = (companyName || "dumpster").replace(/\s+/g, "-").toLowerCase();
    if (animResult.gifUrl) {
      a.href = animResult.gifUrl;
      a.download = `${safeName}-${resolvedSize.label.replace(/\s+/g, "")}-animation.gif`;
    } else {
      a.href = animResult.mp4Url;
      a.download = `${safeName}-${resolvedSize.label.replace(/\s+/g, "")}-animation.mp4`;
    }
    a.click();
  };

  /* ──────────────────────────────────────────────
     RENDER
     ────────────────────────────────────────────── */

  return (
    <div style={{
      height: "100vh", width: "100vw", overflow: "hidden",
      display: "flex", flexDirection: "column",
      fontFamily: F.body, color: C.ink, background: C.cream,
    }}>
      {/* ── HEADER ── */}
      <header style={{
        flex: "0 0 auto",
        height: "56px",
        padding: "0 24px",
        background: C.white,
        borderBottom: `1px solid ${C.mist}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "6px",
            background: C.green, display: "flex", alignItems: "center", justifyContent: "center",
            color: C.white, fontWeight: 700, fontSize: "14px",
          }}>iC</div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: C.green }}>
            iCans Generator
          </div>
        </div>

        {/* Quality toggle pill */}
        <div style={{
          display: "flex",
          background: C.cream,
          border: `1px solid ${C.mist}`,
          borderRadius: "999px",
          padding: "3px",
        }}>
          {["standard", "pro"].map(q => (
            <button key={q}
              onClick={() => setQuality(q)}
              style={{
                padding: "6px 16px",
                borderRadius: "999px",
                border: "none",
                background: quality === q ? C.white : "transparent",
                color: quality === q ? C.ink : C.muted,
                fontSize: "13px", fontWeight: 600,
                cursor: "pointer",
                boxShadow: quality === q ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s",
              }}
            >
              {q === "standard" ? "Standard" : "Pro"}
            </button>
          ))}
        </div>
      </header>

      {/* ── BODY (preview + controls, no scroll) ── */}
      <div style={{
        flex: "1 1 auto",
        display: "flex",
        minHeight: 0,    // critical: lets children shrink correctly
      }}>
        {/* LEFT: Preview */}
        <div style={{
          flex: "1 1 auto",
          minWidth: 0,
          padding: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}>
          <PreviewCanvas
            companyName={companyName}
            phone={phone}
            bodyColor={bodyColor}
            accentColor={accentColor}
            sizeLabel={resolvedSize.label}
            sceneId={sceneId}
            generating={generating}
            resultImg={resultImg}
            animResult={animResult}
            errorMsg={errorMsg}
            onClearResult={clearResult}
            onDownload={downloadImage}
            onDownloadAnimation={downloadAnimation}
            onAnimate={() => setAnimOpen(true)}
          />
        </div>

        {/* RIGHT: Controls */}
        <aside style={{
          flex: "0 0 380px",
          minWidth: "320px",
          maxWidth: "440px",
          background: C.white,
          borderLeft: `1px solid ${C.mist}`,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}>
          {/* Scrollable inner panel (only if needed) */}
          <div style={{
            flex: "1 1 auto",
            overflowY: "auto",
            padding: "20px 24px",
          }}>
            {/* BRAND */}
            <Label>Brand</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
              <Input value={companyName} onChange={setCompanyName} placeholder="Company name" />
              <Input value={phone} onChange={setPhone} placeholder="Phone" />
            </div>

            {/* COLORS */}
            <Label>Colors</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <ColorField label="Dumpster" value={bodyColor} onChange={setBodyColor} />
              <ColorField label="Text" value={accentColor} onChange={setAccentColor} />
            </div>

            {/* LOGO */}
            <LogoUpload logo={logo} onChange={onLogoChange} onClear={() => setLogo(null)} />

            {/* SIZE */}
            <Label style={{ marginTop: "16px" }}>Size</Label>
            <div style={{ display: "flex", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
              {SIZES.map(s => (
                <button key={s.yd}
                  onClick={() => { setSizeYd(s.yd); setUseCustom(false); }}
                  style={pillStyle(!useCustom && sizeYd === s.yd)}
                >
                  {s.label}
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                style={pillStyle(useCustom)}
              >
                Custom
              </button>
            </div>
            <div style={{ fontSize: "11px", color: C.muted, marginBottom: "12px" }}>
              {resolvedSize.label}
              {!useCustom && ` · ${resolvedSize.dims} ft`}
            </div>

            {useCustom && (
              <div style={{
                background: C.cream, border: `1px solid ${C.mist}`, borderRadius: "8px",
                padding: "10px", marginBottom: "16px",
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px",
              }}>
                <DimensionInput label="L (ft)" value={customL} onChange={setCustomL} />
                <DimensionInput label="W (ft)" value={customW} onChange={setCustomW} />
                <DimensionInput label="H (ft)" value={customH} onChange={setCustomH} />
              </div>
            )}

            {/* SCENE */}
            <Label style={{ marginTop: useCustom ? 0 : "4px" }}>Scene</Label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
              {SCENES.map(s => (
                <button key={s.id}
                  onClick={() => setSceneId(s.id)}
                  style={pillStyle(sceneId === s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* CUSTOM SCENE */}
            <Label small>Or describe a scene</Label>
            <textarea
              value={customScene}
              onChange={(e) => setCustomScene(e.target.value)}
              placeholder="Parked by a lake at dawn, misty…"
              rows={2}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: `1px solid ${C.mist}`,
                borderRadius: "6px",
                fontSize: "13px",
                fontFamily: F.body,
                resize: "none",
                outline: "none",
                background: C.white,
                color: C.ink,
                boxSizing: "border-box",
              }}
              onFocus={(e) => e.target.style.borderColor = C.green}
              onBlur={(e) => e.target.style.borderColor = C.mist}
            />
          </div>

          {/* GENERATE BUTTON (fixed bottom of panel) */}
          <div style={{
            flex: "0 0 auto",
            padding: "16px 24px",
            borderTop: `1px solid ${C.mist}`,
            background: C.white,
          }}>
            <button
              onClick={generate}
              disabled={generating || !companyName.trim()}
              style={{
                width: "100%",
                padding: "12px",
                background: (generating || !companyName.trim()) ? C.muted : C.green,
                color: C.white,
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: (generating || !companyName.trim()) ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { if (!generating && companyName.trim()) e.currentTarget.style.background = C.greenDark; }}
              onMouseLeave={(e) => { if (!generating && companyName.trim()) e.currentTarget.style.background = C.green; }}
            >
              {generating ? "Generating…" : resultImg ? "Generate again" : "Generate image"}
            </button>
          </div>
        </aside>
      </div>

      {/* ── ANIMATION MODAL ── */}
      {animOpen && (
        <AnimationModal
          resultImg={resultImg}
          animPrompt={animPrompt}
          setAnimPrompt={setAnimPrompt}
          animating={animating}
          animStatus={animStatus}
          animResult={animResult}
          animError={animError}
          gifProgress={gifProgress}
          convertingGif={convertingGif}
          onClose={() => { setAnimOpen(false); setAnimError(""); }}
          onStart={startAnimation}
          onDownload={downloadAnimation}
          onReset={() => { setAnimResult(null); setAnimPrompt(""); setAnimError(""); }}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Make sure on narrow viewports the layout still tries to stay no-scroll */
        @media (max-width: 720px) {
          /* On very small screens we can't truly avoid all scrolling,
             but we keep the right panel scrollable internally and the
             outer page locked. */
        }
      `}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────
   PREVIEW CANVAS — left side
   ────────────────────────────────────────────── */

function PreviewCanvas({
  companyName, phone, bodyColor, accentColor, sizeLabel, sceneId,
  generating, resultImg, animResult, errorMsg,
  onClearResult, onDownload, onDownloadAnimation, onAnimate,
}) {
  // If we have an animation, show that
  if (animResult && animResult.gifUrl) {
    return (
      <ResultDisplay
        src={animResult.gifUrl}
        alt="Animated dumpster"
        label="ANIMATED"
        onClear={onClearResult}
        onDownload={onDownloadAnimation}
        downloadLabel="Download GIF"
      />
    );
  }

  // If we have a generated image, show that full-bleed
  if (resultImg) {
    return (
      <ResultDisplay
        src={resultImg.url}
        alt="Generated dumpster"
        label={sceneId.toUpperCase()}
        onClear={onClearResult}
        onDownload={onDownload}
        onAnimate={onAnimate}
        downloadLabel="Download"
      />
    );
  }

  // Otherwise show live preview mockup
  return (
    <div style={{ width: "100%", maxWidth: "720px", position: "relative" }}>
      <div style={{
        background: C.white,
        borderRadius: "16px",
        border: `1px solid ${C.mist}`,
        padding: "40px 24px",
        position: "relative",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {/* Scene label */}
        <div style={{
          position: "absolute", top: "16px", left: "16px",
          fontSize: "10px", fontWeight: 700, color: C.muted,
          letterSpacing: "0.1em",
        }}>
          {sceneId.toUpperCase()}
        </div>

        {/* Live SVG dumpster */}
        <DumpsterSVG
          companyName={companyName}
          phone={phone}
          bodyColor={bodyColor}
          accentColor={accentColor}
          sizeLabel={sizeLabel}
        />

        {/* Caption */}
        <div style={{
          textAlign: "center", fontSize: "12px", color: C.muted, marginTop: "16px",
        }}>
          Live preview — generate when it looks right
        </div>
      </div>

      {/* Generating overlay */}
      {generating && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(255,255,255,0.85)",
          borderRadius: "16px",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "12px",
          animation: "fadeIn 0.2s",
        }}>
          <div style={{
            width: "40px", height: "40px",
            border: `4px solid ${C.mist}`,
            borderTopColor: C.green,
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
          <div style={{ fontSize: "14px", fontWeight: 600, color: C.ink }}>
            Generating your dumpster…
          </div>
          <div style={{ fontSize: "12px", color: C.muted }}>
            Usually 10-20 seconds
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMsg && !generating && (
        <div style={{
          marginTop: "16px",
          padding: "10px 14px",
          background: "#fef2f2",
          border: `1px solid #fecaca`,
          borderRadius: "8px",
          fontSize: "13px",
          color: C.danger,
        }}>
          {errorMsg}
        </div>
      )}
    </div>
  );
}

function ResultDisplay({ src, alt, label, onClear, onDownload, onAnimate, downloadLabel }) {
  return (
    <div style={{
      width: "100%", maxWidth: "900px", position: "relative",
      animation: "fadeIn 0.3s",
    }}>
      <div style={{
        background: C.white,
        borderRadius: "16px",
        border: `1px solid ${C.mist}`,
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        position: "relative",
      }}>
        {/* Scene label */}
        <div style={{
          position: "absolute", top: "16px", left: "16px",
          fontSize: "10px", fontWeight: 700, color: C.white,
          letterSpacing: "0.1em",
          background: "rgba(0,0,0,0.55)",
          padding: "4px 10px", borderRadius: "999px",
          backdropFilter: "blur(4px)",
          zIndex: 2,
        }}>
          {label}
        </div>

        <img src={src} alt={alt} style={{
          width: "100%", display: "block", maxHeight: "70vh", objectFit: "contain",
          background: C.cream,
        }} />
      </div>

      {/* Action bar */}
      <div style={{
        display: "flex", gap: "8px", marginTop: "12px", justifyContent: "center",
        flexWrap: "wrap",
      }}>
        <button onClick={onClear} style={secondaryBtn}>
          ← Back to preview
        </button>
        {onAnimate && (
          <button onClick={onAnimate} style={secondaryBtn}>
            🎬 Animate
          </button>
        )}
        <button onClick={onDownload} style={primaryBtn}>
          ↓ {downloadLabel}
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   LIVE DUMPSTER SVG PREVIEW
   ────────────────────────────────────────────── */

function DumpsterSVG({ companyName, phone, bodyColor, accentColor, sizeLabel }) {
  // Determine if we need a dark stroke (very light bodies need outline for visibility)
  const isVeryLight = (() => {
    const hex = bodyColor.replace("#", "");
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r + g + b) / 3 > 220;
  })();

  const strokeColor = isVeryLight ? "#cbd5e1" : "transparent";

  return (
    <svg viewBox="0 0 500 280" style={{ width: "100%", height: "auto", maxHeight: "360px" }}>
      {/* Subtle shadow ellipse */}
      <ellipse cx="250" cy="240" rx="170" ry="10" fill="rgba(0,0,0,0.08)" />

      {/* Dumpster body */}
      <g>
        <path
          d="M100 130 L120 230 L380 230 L400 130 Z"
          fill={bodyColor}
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        <path
          d="M100 130 L120 125 L380 125 L400 130 Z"
          fill={bodyColor}
          stroke={strokeColor}
          strokeWidth="1.5"
        />

        {/* Vertical reinforcement lines */}
        {[160, 210, 260, 310, 360].map(x => (
          <line key={x} x1={x} y1={130} x2={x} y2={228}
            stroke={isVeryLight ? "#cbd5e1" : "rgba(0,0,0,0.15)"}
            strokeWidth="1"
          />
        ))}

        {/* Company name */}
        <text x="250" y="170" textAnchor="middle"
          fontFamily="system-ui, sans-serif"
          fontSize={companyName.length > 14 ? "18" : "24"}
          fontWeight="800"
          fill={accentColor}
          letterSpacing="0.02em"
        >
          {(companyName || "ABC DUMPSTERS").toUpperCase()}
        </text>

        {/* Phone */}
        <text x="250" y="195" textAnchor="middle"
          fontFamily="system-ui, sans-serif" fontSize="13" fontWeight="700"
          fill={accentColor}
        >
          {phone || ""}
        </text>

        {/* Size badge */}
        <rect x="220" y="205" width="60" height="18" rx="2" fill={C.ink} />
        <text x="250" y="218" textAnchor="middle"
          fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="800"
          fill={C.white}
        >
          {sizeLabel.toUpperCase()}
        </text>
      </g>

      {/* Wheels */}
      <circle cx="155" cy="232" r="6" fill="#1a1a1a" />
      <circle cx="345" cy="232" r="6" fill="#1a1a1a" />
    </svg>
  );
}

/* ──────────────────────────────────────────────
   ANIMATION MODAL
   ────────────────────────────────────────────── */

function AnimationModal({
  resultImg, animPrompt, setAnimPrompt,
  animating, animStatus, animResult, animError,
  gifProgress, convertingGif,
  onClose, onStart, onDownload, onReset,
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15, 23, 42, 0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
      animation: "fadeIn 0.2s",
    }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.white,
          borderRadius: "16px",
          maxWidth: "560px", width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: C.ink, margin: 0 }}>
            🎬 Animate Your Dumpster
          </h2>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", fontSize: "24px",
            color: C.muted, cursor: "pointer", padding: "4px 8px",
          }}>×</button>
        </div>

        {animating ? (
          <div style={{ textAlign: "center", padding: "30px 20px" }}>
            <div style={{
              width: "48px", height: "48px", margin: "0 auto 16px",
              border: `4px solid ${C.mist}`, borderTopColor: C.green,
              borderRadius: "50%", animation: "spin 1s linear infinite",
            }} />
            <div style={{ fontSize: "15px", fontWeight: 600, color: C.ink, marginBottom: "8px" }}>
              {animStatus || "Working…"}
            </div>
            <div style={{ fontSize: "12px", color: C.muted }}>
              {convertingGif
                ? "Almost done — converting your animation to GIF."
                : "Please don't close this window. Veo is rendering 8 seconds of video."}
            </div>
            {convertingGif && (
              <div style={{
                marginTop: "16px", height: "6px", background: C.mist, borderRadius: "3px",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", background: C.green, width: `${gifProgress}%`,
                  transition: "width 0.3s",
                }} />
              </div>
            )}
          </div>
        ) : animResult && animResult.gifUrl ? (
          <div>
            <img src={animResult.gifUrl} alt="Animated GIF"
              style={{ width: "100%", borderRadius: "8px", marginBottom: "12px" }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={onReset} style={secondaryBtn}>🔄 Try Another</button>
              <button onClick={onDownload} style={primaryBtn}>↓ Download GIF</button>
            </div>
          </div>
        ) : (
          <>
            {resultImg && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{
                  fontSize: "11px", fontWeight: 700, color: C.muted,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  marginBottom: "6px",
                }}>Animating this image:</div>
                <img src={resultImg.url} alt="Source"
                  style={{ width: "100%", borderRadius: "8px", maxHeight: "180px", objectFit: "cover" }}
                />
              </div>
            )}

            <div style={{
              fontSize: "12px", color: "#92400e", background: "#fef3c7",
              padding: "10px 12px", borderRadius: "6px", marginBottom: "16px",
              border: "1px solid #fde68a",
            }}>
              ⚠️ Each animation takes ~1-2 minutes and costs about <strong>$0.40</strong>. You'll get an 8-second GIF.
            </div>

            {/* Subtle Motion */}
            <div style={{
              fontSize: "11px", fontWeight: 700, color: C.green, marginBottom: "8px",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              Subtle Motion <span style={{ color: C.muted, textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>· cinemagraph style</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "16px" }}>
              {ANIM_PRESETS.subtle.map(p => (
                <button key={p.id}
                  onClick={() => onStart(p.prompt)}
                  style={{
                    padding: "10px",
                    background: C.white,
                    border: `1px solid ${C.mist}`,
                    borderRadius: "6px",
                    fontSize: "13px", fontWeight: 600, color: C.ink,
                    cursor: "pointer", textAlign: "left",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = C.green}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = C.mist}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>

            {/* Full Action */}
            <div style={{
              fontSize: "11px", fontWeight: 700, color: C.green, marginBottom: "8px",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              Full Action <span style={{ color: C.muted, textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>· people / vehicles in motion</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "16px" }}>
              {ANIM_PRESETS.action.map(p => (
                <button key={p.id}
                  onClick={() => onStart(p.prompt)}
                  style={{
                    padding: "10px",
                    background: C.white,
                    border: `1px solid ${C.mist}`,
                    borderRadius: "6px",
                    fontSize: "13px", fontWeight: 600, color: C.ink,
                    cursor: "pointer", textAlign: "left",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = C.green}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = C.mist}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>

            <div style={{
              fontSize: "11px", fontWeight: 700, color: C.green, marginBottom: "6px",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              Or describe your own
            </div>
            <textarea
              value={animPrompt}
              onChange={(e) => setAnimPrompt(e.target.value)}
              rows={2}
              placeholder='e.g. "have a worker in a red hat toss a trash bag in"'
              style={{
                width: "100%", padding: "8px 10px",
                border: `1px solid ${C.mist}`, borderRadius: "6px",
                fontSize: "13px", fontFamily: F.body,
                resize: "none", outline: "none",
                boxSizing: "border-box",
              }}
            />

            {animError && (
              <div style={{
                marginTop: "10px", padding: "8px 12px",
                background: "#fef2f2", border: `1px solid #fecaca`,
                borderRadius: "6px", fontSize: "12px", color: C.danger,
              }}>
                {animError}
              </div>
            )}

            <button
              onClick={() => onStart()}
              disabled={!animPrompt.trim()}
              style={{
                width: "100%", marginTop: "12px",
                padding: "12px", borderRadius: "8px", border: "none",
                background: !animPrompt.trim() ? C.muted : C.green,
                color: C.white,
                fontSize: "14px", fontWeight: 600,
                cursor: !animPrompt.trim() ? "not-allowed" : "pointer",
              }}
            >
              Animate with custom prompt
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   SMALL UI COMPONENTS
   ────────────────────────────────────────────── */

function Label({ children, small, style }) {
  return (
    <div style={{
      fontSize: small ? "10px" : "11px",
      fontWeight: 700,
      color: C.muted,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      marginBottom: "6px",
      ...style,
    }}>{children}</div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        padding: "8px 10px",
        border: `1px solid ${C.mist}`,
        borderRadius: "6px",
        fontSize: "13px",
        fontFamily: F.body,
        background: C.white,
        color: C.ink,
        outline: "none",
        boxSizing: "border-box",
      }}
      onFocus={(e) => e.target.style.borderColor = C.green}
      onBlur={(e) => e.target.style.borderColor = C.mist}
    />
  );
}

function ColorField({ label, value, onChange }) {
  const upperValue = value.toUpperCase();
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "6px 10px",
      border: `1px solid ${C.mist}`,
      borderRadius: "6px",
      cursor: "pointer",
      background: C.white,
    }}>
      <input type="color"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        style={{
          width: "28px", height: "28px",
          border: "none", padding: 0, cursor: "pointer",
          background: "transparent",
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: C.ink }}>{label}</div>
        <div style={{ fontSize: "10px", color: C.muted, fontFamily: "monospace" }}>
          {upperValue}
        </div>
      </div>
    </label>
  );
}

function LogoUpload({ logo, onChange, onClear }) {
  const inputRef = useRef();
  if (logo) {
    return (
      <div style={{
        padding: "8px 10px",
        border: `1px solid ${C.mist}`,
        borderRadius: "6px",
        display: "flex", alignItems: "center", gap: "8px",
        background: C.cream,
      }}>
        <img src={logo} alt="logo" style={{
          width: "24px", height: "24px", objectFit: "contain",
          background: C.white, borderRadius: "4px",
        }} />
        <span style={{ flex: 1, fontSize: "12px", color: C.ink }}>Logo added</span>
        <button onClick={onClear} style={{
          background: "transparent", border: "none",
          color: C.danger, fontSize: "12px", fontWeight: 600,
          cursor: "pointer",
        }}>Remove</button>
      </div>
    );
  }
  return (
    <>
      <input type="file" ref={inputRef} accept="image/*"
        onChange={onChange} style={{ display: "none" }} />
      <button
        onClick={() => inputRef.current?.click()}
        style={{
          width: "100%", padding: "8px 10px",
          border: `1px dashed ${C.mist}`, borderRadius: "6px",
          background: C.greenLight, color: C.green,
          fontSize: "12px", fontWeight: 600,
          cursor: "pointer",
        }}
      >
        + Add logo (optional)
      </button>
    </>
  );
}

function DimensionInput({ label, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: "10px", color: C.muted, fontWeight: 600, marginBottom: "2px" }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
        style={{
          width: "100%", padding: "6px 8px",
          border: `1px solid ${C.mist}`, borderRadius: "4px",
          fontSize: "13px", textAlign: "center",
          background: C.white, color: C.ink,
          boxSizing: "border-box",
          outline: "none",
        }}
      />
    </div>
  );
}

function pillStyle(active) {
  return {
    padding: "6px 12px",
    border: `1px solid ${active ? C.green : C.mist}`,
    background: active ? C.green : C.white,
    color: active ? C.white : C.ink,
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  };
}

const primaryBtn = {
  padding: "10px 18px",
  background: C.green,
  color: C.white,
  border: "none",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryBtn = {
  padding: "10px 16px",
  background: C.white,
  color: C.ink,
  border: `1px solid ${C.mist}`,
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};
