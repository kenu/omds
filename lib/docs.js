const fs = require('fs');
const path = require('path');

const MD_DIR = path.join(__dirname, '..', 'md');

let cachedDocs = [];
let cachedCategories = [];
let cachedDocMap = new Map();
let lastIndexTime = 0;

// Helper to format category or filename to readable title
function titleize(str) {
  if (!str) return '';
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Quick title extractor without parsing full markdown body
function extractTitleFromContent(content, fallback) {
  const lines = content.split('\n', 15);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.replace(/^#\s+/, '').replace(/`([^`]+)`/g, '$1').trim();
    }
  }
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      return trimmed.replace(/^##\s+/, '').replace(/`([^`]+)`/g, '$1').trim();
    }
  }
  return fallback;
}

// Recursively find all .md files in md/
function scanDirectory(dir, baseDir = MD_DIR) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      // Skip hidden directories or images folders
      if (entry.name.startsWith('.') || entry.name === 'images') {
        continue;
      }
      results.push(...scanDirectory(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const parts = relPath.split('/');
      const category = parts.length > 1 ? parts[0] : 'general';
      const slug = relPath.replace(/\.md$/, '');
      const basename = path.basename(entry.name, '.md');

      let stats;
      try {
        stats = fs.statSync(fullPath);
      } catch (err) {
        stats = { size: 0, mtime: new Date() };
      }

      // Read sample to extract title
      let title = titleize(basename);
      try {
        const sample = fs.readFileSync(fullPath, 'utf8');
        title = extractTitleFromContent(sample, title);
      } catch (err) {}

      results.push({
        title,
        relPath,
        slug,
        category,
        url: '/' + slug,
        rawUrl: '/raw/' + relPath,
        basename,
        size: stats.size,
        mtime: stats.mtime,
        fullPath
      });
    }
  }

  return results;
}

// Build and refresh index
function indexDocs() {
  const docs = scanDirectory(MD_DIR);

  // Sort docs by category and title
  docs.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.title.localeCompare(b.title);
  });

  // Group into categories
  const catMap = new Map();
  for (const doc of docs) {
    if (!catMap.has(doc.category)) {
      catMap.set(doc.category, {
        name: doc.category,
        title: titleize(doc.category),
        docs: []
      });
    }
    catMap.get(doc.category).docs.push(doc);
  }

  const categories = Array.from(catMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Build lookup map for fast routing
  const map = new Map();
  for (const doc of docs) {
    map.set(doc.slug.toLowerCase(), doc);
    map.set(doc.relPath.toLowerCase(), doc);
  }

  cachedDocs = docs;
  cachedCategories = categories;
  cachedDocMap = map;
  lastIndexTime = Date.now();

  return { docs, categories };
}

// Initialize on require
indexDocs();

function getAllDocs() {
  // Re-index every 60 seconds if in development, or keep cached
  if (process.env.NODE_ENV !== 'production' && Date.now() - lastIndexTime > 5000) {
    indexDocs();
  }
  return cachedDocs;
}

function getCategories() {
  if (process.env.NODE_ENV !== 'production' && Date.now() - lastIndexTime > 5000) {
    indexDocs();
  }
  return cachedCategories;
}

// Resolve requested path to matching document
function getDocByPath(requestedPath) {
  if (!requestedPath) return null;
  let clean = requestedPath.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
  
  // Strip .md if provided
  const withoutMd = clean.endsWith('.md') ? clean.slice(0, -3) : clean;
  const withMd = clean.endsWith('.md') ? clean : clean + '.md';

  // 1. Direct match on slug
  if (cachedDocMap.has(withoutMd)) {
    return cachedDocMap.get(withoutMd);
  }

  // 2. Direct match on relative path
  if (cachedDocMap.has(withMd)) {
    return cachedDocMap.get(withMd);
  }

  // 3. Category root fallback: e.g. /docker -> docker/docker.md or docker/README.md or first doc in category
  const categoryDocs = cachedDocs.filter(d => d.category.toLowerCase() === withoutMd);
  if (categoryDocs.length > 0) {
    // Prefer doc where basename == category name
    const mainDoc = categoryDocs.find(d => d.basename.toLowerCase() === withoutMd) ||
                    categoryDocs.find(d => d.basename.toLowerCase() === 'readme') ||
                    categoryDocs.find(d => d.basename.toLowerCase() === 'index') ||
                    categoryDocs[0];
    return mainDoc;
  }

  return null;
}

// Get previous and next documents within the same category
function getAdjacentDocs(currentDoc) {
  if (!currentDoc) return { prev: null, next: null };
  const catDocs = cachedDocs.filter(d => d.category === currentDoc.category);
  const idx = catDocs.findIndex(d => d.slug === currentDoc.slug);
  return {
    prev: idx > 0 ? catDocs[idx - 1] : null,
    next: idx >= 0 && idx < catDocs.length - 1 ? catDocs[idx + 1] : null
  };
}

// Search documents with fuzzy/scoring match
function searchDocs(query, limit = 20) {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results = [];
  const docs = getAllDocs();

  for (const doc of docs) {
    let score = 0;
    const titleLower = doc.title.toLowerCase();
    const slugLower = doc.slug.toLowerCase();
    const catLower = doc.category.toLowerCase();

    if (titleLower === q) score += 100;
    else if (titleLower.startsWith(q)) score += 50;
    else if (titleLower.includes(q)) score += 30;

    if (slugLower.includes(q)) score += 20;
    if (catLower === q) score += 40;
    else if (catLower.includes(q)) score += 15;

    if (score > 0) {
      results.push({ ...doc, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

module.exports = {
  MD_DIR,
  getAllDocs,
  getCategories,
  getDocByPath,
  getAdjacentDocs,
  searchDocs,
  indexDocs
};
