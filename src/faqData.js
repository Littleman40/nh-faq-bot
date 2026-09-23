const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, '..', 'cache.json');
const GITBOOK_API_BASE = 'https://api.gitbook.com/v1';

function readCache() {
  if (!fs.existsSync(CACHE_PATH)) {
    return { lastUpdated: null, faqs: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  } catch (err) {
    console.error('Failed to read/parse cache.json, starting with an empty cache:', err);
    return { lastUpdated: null, faqs: [] };
  }
}

function writeCache(faqs) {
  const data = { lastUpdated: new Date().toISOString(), faqs };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

function findByTitle(title) {
  return readCache().faqs.find((f) => f.title === title);
}

function searchByTitle(query, limit = 25) {
  const q = (query || '').toLowerCase();
  return readCache().faqs.filter((f) => f.title.toLowerCase().includes(q)).slice(0, limit);
}

function flattenPages(pages, out = []) {
  if (!Array.isArray(pages)) return out;

  for (const page of pages) {
    const isDocument = page.kind === 'document' || page.type === 'document' || (!page.kind && page.path);

    if (isDocument && page.title && page.path) {
      out.push({ title: page.title, path: page.path });
    }

    if (Array.isArray(page.pages) && page.pages.length > 0) {
      flattenPages(page.pages, out);
    }
  }

  return out;
}

async function gitbookRequest(pathname, apiKey) {
  const res = await fetch(`${GITBOOK_API_BASE}${pathname}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`GitBook API request failed (${res.status} ${res.statusText}) for ${pathname}`);
  }

  return res.json();
}

async function fetchFaqsFromGitBook() {
  const apiKey = process.env.GITBOOK_API_KEY;
  const spaceId = process.env.GITBOOK_SPACE_ID;

  if (!apiKey || !spaceId) {
    throw new Error('GITBOOK_API_KEY and GITBOOK_SPACE_ID must be set in .env');
  }

  const space = await gitbookRequest(`/spaces/${spaceId}`, apiKey);
  const baseUrl =
    process.env.GITBOOK_BASE_URL || space?.urls?.published || space?.urls?.public || space?.urls?.app;

  if (!baseUrl) {
    throw new Error('Could not resolve a base URL for the GitBook space. Set GITBOOK_BASE_URL in .env manually.');
  }

  const content = await gitbookRequest(`/spaces/${spaceId}/content`, apiKey);
  const flat = flattenPages(content?.pages || []);
  const cleanBase = baseUrl.replace(/\/+$/, '');

  return flat.map((page) => ({
    title: page.title,
    url: `${cleanBase}/${String(page.path).replace(/^\/+/, '')}`,
  }));
}

module.exports = { readCache, writeCache, findByTitle, searchByTitle, fetchFaqsFromGitBook };
