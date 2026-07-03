export default async function handler(req, res) {
  const { isbn } = req.query;

  if (!isbn || !/^\d{10,13}$/.test(isbn.replace(/-/g, ""))) {
    return res.status(400).json({ available: false, error: "ISBN inválido" });
  }

  const url = `https://www.buscalibre.com.mx/libros/isbn/${isbn}`;

  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FolioApp/1.0)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });

    // Buscalibre returns 404 for ISBNs that don't exist
    const available = response.status === 200;
    return res.status(200).json({ available });
  } catch {
    // On timeout or network error, default to showing the button
    return res.status(200).json({ available: true });
  }
}
