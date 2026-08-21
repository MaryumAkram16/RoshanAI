import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import OpenAI from "openai";
import admin from "firebase-admin";
import { createServer as createViteServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";
const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
let firebaseAdminReady = false;

try {
  if (admin.apps.length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    admin.initializeApp(serviceAccountJson
      ? { credential: admin.credential.cert(JSON.parse(serviceAccountJson)), projectId: firebaseProjectId }
      : { credential: admin.credential.applicationDefault(), projectId: firebaseProjectId });
  }
  firebaseAdminReady = true;
} catch (error) {
  // Local development can run with IP-based limits; production should provide
  // Firebase Admin credentials so authenticated limits are enforced.
  console.warn("Firebase Admin verification is unavailable; using IP-based limits", error instanceof Error ? error.message : "unknown error");
}

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "12mb", strict: true }));

const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || "").split(",").map(origin => origin.trim()).filter(Boolean));
app.use((req, res, next) => {
  const origin = req.header("origin");
  if (isProduction && origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: "Origin is not allowed." });
  }
  return next();
});
app.use(authenticate);

const protectedApi = isProduction || process.env.REQUIRE_API_AUTH === "true";
app.use((req, res, next) => {
  if (!req.path.startsWith("/api/") || req.path === "/api/health" || !protectedApi) return next();
  if (!res.locals.authUid) return res.status(401).json({ error: "Authentication is required." });
  return next();
});

// Lightweight security headers; production hosting should also set these at the edge.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  if (isProduction) {
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  }
  next();
});

const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 20;
const sharedRateLimitDb = firebaseAdminReady && process.env.RATE_LIMIT_STORE === "firestore" ? admin.firestore() : null;

async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header("authorization");
  if (!authorization) return next();
  if (!authorization.startsWith("Bearer ")) return res.status(401).json({ error: "Invalid authorization header." });
  if (!firebaseAdminReady) return res.status(503).json({ error: "Authentication service is not configured." });
  try {
    const token = authorization.slice("Bearer ".length).trim();
    const decoded = await admin.auth().verifyIdToken(token);
    res.locals.authUid = decoded.uid;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired authentication token." });
  }
}

async function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = String(res.locals.authUid ? `uid:${res.locals.authUid}` : `ip:${req.ip || req.socket.remoteAddress || "unknown"}`);
  const now = Date.now();

  if (sharedRateLimitDb) {
    try {
      const documentId = createHash("sha256").update(key).digest("hex").slice(0, 40);
      const ref = sharedRateLimitDb.collection("_rate_limits").doc(documentId);
      const allowed = await sharedRateLimitDb.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref);
        const current = snapshot.exists ? snapshot.data() as { count?: number; resetAt?: number } : undefined;
        const count = current && current.resetAt && current.resetAt > now ? current.count || 0 : 0;
        if (count >= RATE_LIMIT) return false;
        transaction.set(ref, { keyHash: documentId, count: count + 1, resetAt: now + RATE_WINDOW_MS, updatedAt: new Date() });
        return true;
      });
      if (!allowed) return res.status(429).json({ error: "Too many requests. Please try again later." });
      return next();
    } catch (error) {
      console.error("Shared rate limiter unavailable", error instanceof Error ? error.message : "unknown error");
    }
  }

  const current = requestCounts.get(key);
  if (!current || current.resetAt <= now) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    if (requestCounts.size > 10_000) {
      for (const [entryKey, entry] of requestCounts) if (entry.resetAt <= now) requestCounts.delete(entryKey);
    }
    return next();
  }
  if (current.count >= RATE_LIMIT) return res.status(429).json({ error: "Too many requests. Please try again later." });
  current.count += 1;
  return next();
}

function validatePrompt(prompt: unknown): prompt is string {
  return typeof prompt === "string" && prompt.trim().length > 0 && prompt.length <= 50000;
}

function validateImageData(fileData: unknown): fileData is { mimeType: string; data: string } {
  if (!fileData || typeof fileData !== "object") return false;
  const value = fileData as Record<string, unknown>;
  return typeof value.mimeType === "string" && /^image\/(png|jpeg|jpg|webp|gif)$/i.test(value.mimeType)
    && typeof value.data === "string" && value.data.length <= 8_000_000;
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiConfigured: Boolean(process.env.OPENAI_API_KEY), serpConfigured: Boolean(process.env.SERPAPI_KEY), authConfigured: firebaseAdminReady });
});

app.post("/api/ai", rateLimit, async (req, res) => {
  const { prompt, fileData } = req.body ?? {};
  if (!validatePrompt(prompt)) return res.status(400).json({ error: "A valid prompt is required." });
  if (fileData !== undefined && !validateImageData(fileData)) {
    return res.status(400).json({ error: "Only supported image attachments up to 8 MB are accepted." });
  }
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "AI service is not configured." });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000, maxRetries: 1 });
    const content = fileData
      ? [{ type: "text" as const, text: prompt }, { type: "image_url" as const, image_url: { url: `data:${fileData.mimeType};base64,${fileData.data}` } }]
      : prompt;
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [{ role: "user", content }],
      max_tokens: 4000,
    });
    return res.json({ text: completion.choices[0]?.message?.content ?? "" });
  } catch (error) {
    console.error("AI request failed", error instanceof Error ? error.message : "unknown error");
    return res.status(502).json({ error: "AI service request failed." });
  }
});

app.get("/api/jobs", rateLimit, async (req, res) => {
  const query = String(req.query.query || "").trim();
  const employmentTypes = String(req.query.employment_types || "FULLTIME");
  if (!query || query.length > 240) return res.status(400).json({ error: "A valid job search query is required." });
  const apiKey = process.env.JSEARCH_API_KEY;
  if (!apiKey) return res.json({ data: [] });
  try {
    const url = new URL("https://jsearch.p.rapidapi.com/search");
    url.search = new URLSearchParams({ query, num_pages: "3", results_per_page: "5", job_details: "true", date_posted: "all", employment_types: employmentTypes }).toString();
    if (String(req.query.remote_jobs_only) === "true") url.searchParams.set("remote_jobs_only", "true");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const upstream = await fetch(url, { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" }, signal: controller.signal });
    clearTimeout(timer);
    const data = await upstream.json();
    return res.status(upstream.ok ? 200 : 502).json(upstream.ok ? data : { error: "Job data service request failed." });
  } catch (error) {
    console.error("JSearch request failed", error instanceof Error ? error.message : "unknown error");
    return res.json({ data: [] });
  }
});

app.get("/api/youtube", rateLimit, async (req, res) => {
  const skill = String(req.query.skill || "").trim();
  const fallback = { url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + " tutorial for beginners")}`, title: `Search "${skill} tutorial" on YouTube` };
  if (!skill || skill.length > 160) return res.status(400).json({ error: "A valid skill is required." });
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.json(fallback);
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.search = new URLSearchParams({ part: "snippet", q: `${skill} tutorial for beginners 2024`, type: "video", maxResults: "1", key: apiKey }).toString();
    const upstream = await fetch(url);
    const data = await upstream.json() as any;
    const video = data?.items?.[0];
    return res.json(video?.id?.videoId ? { url: `https://www.youtube.com/watch?v=${video.id.videoId}`, title: video.snippet?.title ?? fallback.title } : fallback);
  } catch { return res.json(fallback); }
});

app.get("/api/serp-jobs", rateLimit, async (req, res) => {
  const skill = String(req.query.skill || "").trim();
  const role = String(req.query.role || "").trim();
  const location = String(req.query.location || "").trim();
  if ((!skill && !role) || [skill, role, location].some(value => value.length > 160)) return res.status(400).json({ error: "A valid search is required." });
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return res.json(skill ? { organic_results: [] } : { jobs_results: [], related_searches: [] });
  try {
    const url = new URL("https://serpapi.com/search.json");
    const params = skill
      ? { engine: "google", q: `best ${skill} course site:udemy.com OR site:coursera.org`, api_key: apiKey, num: "3" }
      : { engine: "google_jobs", q: `${role} salary`, location, chips: "date_posted:month", api_key: apiKey };
    url.search = new URLSearchParams(params).toString();
    const upstream = await fetch(url);
    const data = await upstream.json();
    return res.status(upstream.ok ? 200 : 502).json(upstream.ok ? data : { error: "Course data service request failed." });
  } catch { return res.json({ organic_results: [] }); }
});

app.get("/api/serp-search", rateLimit, async (req, res) => {
  const query = String(req.query.q || "").trim();
  const gl = String(req.query.gl || "us").trim().slice(0, 2);
  if (!query || query.length > 500) return res.status(400).json({ error: "A valid search query is required." });
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return res.json({ organic_results: [] });
  try {
    const url = new URL("https://serpapi.com/search.json");
    url.search = new URLSearchParams({ engine: "google", q: query, num: "8", api_key: apiKey, gl, hl: "en" }).toString();
    const upstream = await fetch(url);
    const data = await upstream.json();
    return res.status(upstream.ok ? 200 : 502).json(upstream.ok ? data : { error: "Search service request failed." });
  } catch { return res.json({ organic_results: [] }); }
});

app.get("/api/serp", rateLimit, async (req, res) => {
  const role = String(req.query.role || "").trim();
  const experience = String(req.query.experience || "").trim();
  const location = String(req.query.location || "").trim();
  if (!role || !experience || !location || [role, experience, location].some(value => value.length > 160)) {
    return res.status(400).json({ error: "Role, experience, and location are required." });
  }
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return res.status(503).json({ error: "Salary data service is not configured." });

  const query = `${role} salary ${experience} ${location} 2024`;
  const url = new URL("https://serpapi.com/search.json");
  url.search = new URLSearchParams({ engine: "google", q: query, api_key: apiKey, num: "10" }).toString();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    const upstream = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const data = await upstream.json() as Record<string, unknown>;
    if (!upstream.ok || data.error) return res.status(502).json({ error: "Salary data service request failed." });
    return res.json(data);
  } catch (error) {
    console.error("SERP request failed", error instanceof Error ? error.message : "unknown error");
    return res.status(502).json({ error: "Salary data service request failed." });
  }
});

if (isProduction) {
  app.use(express.static(path.join(__dirname, "dist"), { maxAge: "1h", index: false }));
  app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  app.listen(port, "0.0.0.0", () => console.log(`RoshanAI server listening on ${port}`));
} else {
  const vite = await createViteServer({ server: { middlewareMode: true, hmr: true } });
  app.use(vite.middlewares);
  app.listen(port, "0.0.0.0", () => console.log(`RoshanAI dev server listening on ${port}`));
}
