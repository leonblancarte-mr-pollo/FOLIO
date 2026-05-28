export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  try {
    const esUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&langRestrict=es&maxResults=12`;
    const esRes = await fetch(esUrl);
    const esData = await esRes.json();
    let items = esData.items || [];

    if (items.length < 3) {
      const allUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12`;
      const allRes = await fetch(allUrl);
      const allData = await allRes.json();
      const existingIds = new Set(items.map(i => i.id));
      for (const item of allData.items || []) {
        if (!existingIds.has(item.id)) items.push(item);
      }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ items });
  } catch (err) {
    console.error('Google Books proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
