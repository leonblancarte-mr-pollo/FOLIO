const rateLimitStore = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_FREE = 10;

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  return (fwd ? fwd.split(",")[0].trim() : null)
    || req.socket?.remoteAddress
    || "unknown";
}

function checkRateLimit(key, max) {
  const now = Date.now();

  // Prevent unbounded growth
  if (rateLimitStore.size > 500) {
    for (const [k, v] of rateLimitStore) {
      if (now - v.windowStart > WINDOW_MS * 2) rateLimitStore.delete(k);
    }
  }

  const record = rateLimitStore.get(key);
  if (!record || now - record.windowStart > WINDOW_MS) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: max - 1, resetAt: now + WINDOW_MS };
  }

  if (record.count >= max) {
    return { allowed: false, remaining: 0, resetAt: record.windowStart + WINDOW_MS };
  }

  record.count++;
  return { allowed: true, remaining: max - record.count, resetAt: record.windowStart + WINDOW_MS };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  const isAdmin =
    process.env.ADMIN_KEY &&
    req.headers["x-admin-key"] === process.env.ADMIN_KEY;

  if (!isAdmin) {
    const ip = getClientIp(req);
    const limit = checkRateLimit(ip, MAX_FREE);

    res.setHeader("X-RateLimit-Limit", MAX_FREE);
    res.setHeader("X-RateLimit-Remaining", limit.remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(limit.resetAt / 1000));

    if (!limit.allowed) {
      return res.status(429).json({
        error: "Demasiadas solicitudes. Espera 1 minuto.",
        retryAfter: Math.ceil((limit.resetAt - Date.now()) / 1000),
      });
    }
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
}
