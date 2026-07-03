import "dotenv/config";
import express from "express";

const app = express();
app.use(express.json({ limit: "25mb" })); // base64 images can be large

const API_KEY = process.env.ANTHROPIC_API_KEY;

app.post("/api/anthropic", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in .env" });
  }
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
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
