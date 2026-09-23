import { devLog } from "./devLog.js";

// ============ GOOGLE BOOKS (proxy /api/books) ============
const _gbSearchCache = new Map();
const GB_CACHE_TTL = 60_000;

function normTitle(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

function mapGBItem(item) {
  const vi = item.volumeInfo || {};
  return {
    gbId: item.id || '',
    title: vi.title || 'Sin título',
    author: (vi.authors || [])[0] || 'Autor desconocido',
    year: vi.publishedDate?.substring(0, 4) || null,
    coverUrl: vi.imageLinks?.thumbnail?.replace('http://', 'https://') || null,
    isbn: (vi.industryIdentifiers?.find(i => i.type === 'ISBN_13') || vi.industryIdentifiers?.[0])?.identifier || null,
    pageCount: vi.pageCount || null,
    description: vi.description || '',
    genre: vi.categories?.[0] || null,
    publisher: vi.publisher || null,
    language: vi.language || null,
  };
}

async function gbFetch(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('GB API error');
  return r.json();
}

async function searchGoogleBooks(query) {
  if (!query.trim()) return [];
  const key = query.trim().toLowerCase();
  const cached = _gbSearchCache.get(key);
  if (cached && Date.now() - cached.ts < GB_CACHE_TTL) { devLog('[books] cache hit', key, cached.results.length); return cached.results; }

  const q = encodeURIComponent(query.trim());
  devLog('[books] fetch /api/books?q=', q);
  const d = await gbFetch(`/api/books?q=${q}`);
  if (import.meta.env.DEV) devLog('[books] raw response:', JSON.stringify(d).slice(0, 300));
  const items = d.items || [];

  const processed = items.map(mapGBItem);

  // Deduplicate: same normalized title+author -> keep the one with a cover
  const seen = new Map();
  const deduped = [];
  for (const book of processed) {
    const dk = normTitle(book.title) + '|' + normTitle(book.author);
    const prev = seen.get(dk);
    if (!prev) {
      seen.set(dk, book);
      deduped.push(book);
    } else if (!prev.coverUrl && book.coverUrl) {
      const idx = deduped.indexOf(prev);
      if (idx !== -1) deduped[idx] = book;
      seen.set(dk, book);
    }
  }

  const results = deduped.slice(0, 12);
  _gbSearchCache.set(key, { ts: Date.now(), results });
  return results;
}


export { searchGoogleBooks };
