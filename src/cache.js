const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, '..', 'cache.json');

function readCache() {
  if (!fs.existsSync(CACHE_PATH)) {
    return { lastUpdated: null, faqs: [] };
  }
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read/parse cache.json, starting with an empty cache:', err);
    return { lastUpdated: null, faqs: [] };
  }
}

function writeCache(faqs) {
  const data = {
    lastUpdated: new Date().toISOString(),
    faqs,
  };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

function findByTitle(title) {
  const cache = readCache();
  return cache.faqs.find((f) => f.title === title);
}

function searchByTitle(query, limit = 25) {
  const cache = readCache();
  const q = (query || '').toLowerCase();
  return cache.faqs
    .filter((f) => f.title.toLowerCase().includes(q))
    .slice(0, limit);
}

module.exports = { readCache, writeCache, findByTitle, searchByTitle, CACHE_PATH };