const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const {
  getAllDocs,
  getCategories,
  getDocByPath,
  getAdjacentDocs,
  searchDocs,
  indexDocs,
  MD_DIR
} = require('./lib/docs');

const { renderMarkdownDocument } = require('./lib/markdown');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(compression());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// Helper to resolve raw asset files with fallback (.jpg/.png -> .webp)
function resolveAssetPath(filePath) {
  let fullPath = path.join(MD_DIR, filePath);
  if (fs.existsSync(fullPath)) return fullPath;

  // Check fallback from jpg/png to webp
  if (/\.(jpe?g|png)$/i.test(filePath)) {
    const webpPath = fullPath.replace(/\.(jpe?g|png)$/i, '.webp');
    if (fs.existsSync(webpPath)) {
      return webpPath;
    }
  }

  return null;
}

// Health check endpoint for Docker / orchestration
app.get('/health', (req, res) => {
  const docs = getAllDocs();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    docsCount: docs.length,
    categoriesCount: getCategories().length,
    nodeVersion: process.version
  });
});

// API: Search documents
app.get('/api/search', (req, res) => {
  const q = req.query.q || '';
  const results = searchDocs(q, 15);
  res.json(results);
});

// API: All documents list
app.get('/api/docs', (req, res) => {
  res.json(getAllDocs());
});

// API: Refresh document index
app.post('/api/refresh', (req, res) => {
  const result = indexDocs();
  res.json({
    status: 'reindexed',
    docsCount: result.docs.length,
    categoriesCount: result.categories.length
  });
});

// Raw files handler: /raw/*
app.get('/raw/*', (req, res) => {
  const rawPath = req.params[0];
  const resolved = resolveAssetPath(rawPath);

  if (resolved) {
    if (rawPath.endsWith('.md')) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    }
    return res.sendFile(resolved);
  }

  res.status(404).send('Raw file not found: ' + rawPath);
});

// Home page: Directory / Overview
app.get('/', (req, res) => {
  const docs = getAllDocs();
  const categories = getCategories();

  // Pick top / popular categories
  const featuredNames = [
    'docker', 'kubernetes', 'nodejs', 'git', 'spring',
    'python', 'ai', 'llm', 'aws', 'linux', 'intellij', 'security'
  ];
  const featuredCategories = categories.filter(c => featuredNames.includes(c.name));

  res.render('index', {
    pageTitle: 'OKdevTV Markdown Documentation',
    docs,
    categories,
    featuredCategories,
    totalDocs: docs.length,
    totalCategories: categories.length
  });
});

// Document or Asset Viewer: catch-all
app.get('*', (req, res) => {
  const reqPath = decodeURIComponent(req.path).replace(/^\/+/, '');
  
  if (!reqPath) {
    return res.redirect('/');
  }

  // 1. Check if this is an asset request within a category (e.g. /elk/images/elastic-stack.webp)
  const assetResolved = resolveAssetPath(reqPath);
  if (assetResolved && !reqPath.endsWith('.md')) {
    return res.sendFile(assetResolved);
  }

  // 2. Resolve to markdown document
  const doc = getDocByPath(reqPath);

  if (doc) {
    // If raw markdown requested via query ?raw=1
    if (req.query.raw === '1') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.sendFile(doc.fullPath);
    }

    try {
      const rawContent = fs.readFileSync(doc.fullPath, 'utf8');
      const rendered = renderMarkdownDocument(rawContent, {
        category: doc.category,
        dir: path.dirname(doc.relPath) === '.' ? '' : path.dirname(doc.relPath),
        defaultTitle: doc.title
      });

      const adjacent = getAdjacentDocs(doc);
      const categories = getCategories();

      return res.render('doc', {
        pageTitle: `${rendered.title} - OKdevTV Docs`,
        doc,
        rendered,
        adjacent,
        categories,
        currentCategory: doc.category,
        currentSlug: doc.slug
      });
    } catch (err) {
      console.error('Error rendering markdown:', err);
      return res.status(500).render('404', {
        pageTitle: 'Error Rendering Document',
        message: 'Failed to render markdown document: ' + err.message,
        categories: getCategories()
      });
    }
  }

  // 3. Document not found -> 404
  res.status(404).render('404', {
    pageTitle: '404 - Document Not Found',
    path: req.path,
    categories: getCategories()
  });
});

// Start Express Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[omd] Server running on http://0.0.0.0:${PORT}`);
  console.log(`[omd] Node.js ${process.version} - Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[omd] Total Markdown Docs: ${getAllDocs().length} across ${getCategories().length} categories`);
});
