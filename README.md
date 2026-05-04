# iCans Dumpster Image Generator

AI-powered marketing image generator for dumpster companies. Users enter their company name, brand colors, dumpster size, and either pick a preset scene OR describe their own — then get back a branded dumpster image they can use in their shopping cart, marketing emails, or social media.

Powered by **Google Gemini "Nano Banana"** — best-in-class for rendering legible text on objects, which is critical for getting company names and size labels right.

Mobile-friendly with PWA support — users can install it to their home screen.

---

## Features

- **6 preset scenes + Plain Background** — Construction site, Suburban driveway, Sunset hero, Commercial lot, Home renovation, Studio product, Plain Background. One click to generate.
- **Custom prompt textarea** — full free-form control for users who know exactly what they want.
- **Logo upload** — customers can upload a PNG/JPG logo and Gemini will place it on the dumpster's side panel alongside their company name.
- **Dimensions as measuring lines** — instead of being painted on the dumpster, dimensions appear as architectural-style measuring lines outside the container, so the dumpster looks clean.
- **Custom size + dimensions** — users can pick from 10/15/20/30/40 YD presets OR type in their own size and dimensions.
- **🎬 Animate** — turn any generated image into an 8-second animated **GIF** using Veo 3.1 Fast. Two style groups: **Subtle Motion** (cinemagraph-style — only one element moves, rest stays still) and **Full Action** (realistic video with workers, excavators, trucks). GIF conversion happens entirely in the browser, so it's free and instant. Plus a custom prompt option.
- **2 quality tiers** — **Standard** (default, fast & reliable, works on free Vercel plan) and **Pro** (sharper text, slower, only recommended on Vercel Pro plan due to longer generation time).
- **Generation history** — last 8 generations shown as thumbnails, click to view any of them.
- **Download button** — saves the image with a smart filename like `abc-dumpsters-20YD.png`.
- **Phone number field** (optional) — gets included in the prompt.
- **Mobile responsive** — panels stack vertically on phones, auto-scrolls to result after generating.
- **PWA installable** — users can add to home screen on iOS/Android.

---

## Setup — Step by Step

### 1. Get a Gemini API Key

1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with a Google account
3. Click **"Create API key"** → "Create API key in new project"
4. Copy the key — it starts with `AIza...`

**Free tier:** 50 image generations per day, no credit card required. Good for testing and demos.

### 2. Push to GitHub

Either drag-and-drop the unzipped folder contents into a new GitHub repo via the web UI, or:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

### 3. Deploy to Vercel

1. Go to **https://vercel.com/new** and import your GitHub repo.
2. Before clicking Deploy, expand **"Environment Variables"** and add:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** the `AIza...` key you copied
3. Click **Deploy**.

If you forgot to add the env var:
- Settings → Environment Variables → add `GEMINI_API_KEY`
- Deployments → ⋯ → Redeploy

### 4. Local Development (optional)

```bash
npm install
```

Create `.env.local`:
```
GEMINI_API_KEY=AIza-your-key-here
```

For local testing of the `/api/generate` route, use Vercel CLI:
```bash
npm i -g vercel
vercel dev
```

---

## Cost

**Free tier:** 50 images/day at no cost.

**Beyond free tier:** Roughly $0.04 per image with Nano Banana (Flash) and ~$0.13 per image with Pro.

**Animation (Veo 3.1 Fast):** ~$0.40 per 8-second animated GIF. Veo generates the video, then it's converted to GIF in the browser at no extra cost. Each click on "Animate" generates one video. Recommend setting a budget alert in Google Cloud Console (Billing → Budgets & alerts) to avoid surprises if the feature gets popular.

---

## Upgrading to Nano Banana Pro (Optional)

The current setup uses Nano Banana Flash, which works on the free tier and produces great results. If you want Nano Banana Pro for even sharper text rendering:

1. Enable billing on your Google Cloud project (the one tied to your API key)
2. In `api/generate.js`, change this line:
   ```js
   const modelId = "gemini-2.5-flash-image";
   ```
   to:
   ```js
   const modelId = "gemini-3-pro-image-preview";
   ```
3. Redeploy

Pro costs about $0.13 per image but renders text noticeably crisper.

---

## Troubleshooting

**"GEMINI_API_KEY environment variable is not set"**
You forgot to add it in Vercel, or you added it but didn't redeploy.
Settings → Environment Variables, then Deployments → Redeploy.

**"You exceeded your current quota"**
You hit the free tier daily limit (50 images). Either wait until tomorrow or enable billing in Google Cloud Console.

**"Gemini returned no image. Try rephrasing the prompt."**
Gemini's safety filters occasionally reject prompts. The error message will show what the model said. Usually fixed by removing aggressive words or switching to a different preset.

**"Pro quality timed out" / FUNCTION_INVOCATION_TIMEOUT**
Vercel's free Hobby plan caps serverless functions at 60 seconds. Pro quality (Nano Banana Pro) often takes 60-90 seconds, so it can hit this limit. Two fixes:
1. Use **Standard quality** instead — it uses Nano Banana Flash, which finishes in 10-20 seconds and almost never times out. Quality is still excellent.
2. Or upgrade to **Vercel Pro** ($20/month), which raises the limit to 5 minutes. Then Pro quality works reliably.

**Cold start is slow (first request takes 20+ seconds)**
Normal for serverless. Subsequent requests are much faster.

---

## Tech Stack

- **Frontend:** React 18 + Vite
- **Backend:** Vercel Serverless Functions (Node 20)
- **Image AI:** Google Gemini API (Nano Banana / Nano Banana Pro)
- **Mobile:** Responsive layout + PWA manifest
- **No external SDKs** — uses native `fetch`
