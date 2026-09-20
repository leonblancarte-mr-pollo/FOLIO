import "dotenv/config";
import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json({ limit: "25mb" })); // base64 images can be large

const API_KEY = process.env.ANTHROPIC_API_KEY;
// Igual que api/anthropic.js: el modelo lo decide el servidor (ANTHROPIC_MODEL, fallback claude-sonnet-4-6).
const DEFAULT_MODEL = "claude-sonnet-4-6";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

app.post("/api/anthropic", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in .env" });
  }

  const isAdmin = process.env.ADMIN_KEY && req.headers["x-admin-key"] === process.env.ADMIN_KEY;
  if (!isAdmin) {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Missing Authorization header" });
    const supabaseAuth = createClient(SUPABASE_URL, ANON_KEY);
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) return res.status(401).json({ error: "Invalid session" });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        ...req.body,
        model: (isAdmin && req.body?.model) || process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      }),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error("[proxy] Anthropic request failed:", err.message);
    res.status(502).json({ error: "Proxy request failed" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`[proxy] Anthropic proxy → http://localhost:${PORT}`)
);
