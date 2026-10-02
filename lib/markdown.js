const MarkdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const markdownItTaskLists = require('markdown-it-task-lists');
const markdownItFootnote = require('markdown-it-footnote');
const hljs = require('highlight.js');
const matter = require('gray-matter');

// Helper to slugify heading titles for anchors and TOC
function slugify(s) {
  return encodeURIComponent(
    String(s)
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\uac00-\ud7a3\s-]/g, '')
      .replace(/\s+/g, '-')
  );
}

// Create configured markdown-it instance
function createMarkdownRenderer(options = {}) {
  const currentCategory = options.category || '';
  const currentDir = options.dir || '';

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
          return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-lang">${lang}</span><button class="copy-code-btn" type="button" aria-label="Copy code" onclick="copyCode(this)"><svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span class="btn-text">Copy</span></button></div><pre class="hljs"><code class="hljs language-${lang}">${highlighted}</code></pre></div>`;
        } catch (__) {}
      }
      const escaped = md.utils.escapeHtml(str);
      return `<div class="code-block-wrapper"><div class="code-block-header"><span class="code-lang">text</span><button class="copy-code-btn" type="button" aria-label="Copy code" onclick="copyCode(this)"><svg class="copy-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span class="btn-text">Copy</span></button></div><pre class="hljs"><code>${escaped}</code></pre></div>`;
    }
  });

  // Plugins
  md.use(markdownItAnchor, {
    slugify,
    permalink: markdownItAnchor.permalink.headerLink({
      safariReaderFix: true
    })
  });
  md.use(markdownItTaskLists, { enabled: true, label: true });
  md.use(markdownItFootnote);

  // Custom link renderer: rewrite internal .md links and external target=_blank
  const defaultLinkRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const aIndex = tokens[idx].attrIndex('href');
    if (aIndex >= 0) {
      let href = tokens[idx].attrs[aIndex][1];
      if (/^https?:\/\//i.test(href)) {
        tokens[idx].attrPush(['target', '_blank']);
        tokens[idx].attrPush(['rel', 'noopener noreferrer']);
      } else if (href && !href.startsWith('#')) {
        // Rewrite relative markdown link
        // e.g. "docker-exec.md" -> "/docker/docker-exec"
        // e.g. "../nodejs/express.md" -> "/nodejs/express"
        if (href.endsWith('.md')) {
          href = href.slice(0, -3);
        }
        if (href.startsWith('./')) {
          href = href.slice(2);
        }
        if (!href.startsWith('/')) {
          if (currentDir) {
            href = '/' + currentDir + '/' + href;
          } else if (currentCategory) {
            href = '/' + currentCategory + '/' + href;
          }
        }
        tokens[idx].attrs[aIndex][1] = href;
      }
    }
    return defaultLinkRender(tokens, idx, options, env, self);
  };

  // Custom image renderer: resolve relative image paths
  const defaultImageRender = md.renderer.rules.image || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

  md.renderer.rules.image = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const srcIndex = token.attrIndex('src');
    if (srcIndex >= 0) {
      let src = token.attrs[srcIndex][1];
      if (!/^https?:\/\//i.test(src) && !src.startsWith('/')) {
        if (src.startsWith('./')) {
          src = src.slice(2);
        }
        // Route through /raw/${currentDir || currentCategory}/${src}
        const basePath = currentDir || currentCategory || '';
        src = '/raw/' + (basePath ? basePath + '/' : '') + src;
        token.attrs[srcIndex][1] = src;
      }
    }
    token.attrPush(['loading', 'lazy']);
    return defaultImageRender(tokens, idx, options, env, self);
  };

  return md;
}

// Extract Table of Contents and clean headings from markdown string
function extractHeadings(markdownContent) {
  const headings = [];
  const lines = markdownContent.split('\n');
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{1,4})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      let rawTitle = match[2].trim();
      // Remove any trailing anchor or markdown formatting
      const cleanTitle = rawTitle.replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      const id = slugify(cleanTitle);
      headings.push({ level, title: cleanTitle, id });
    }
  }

  return headings;
}

// Parse markdown file content with frontmatter, headings, and render HTML
function renderMarkdownDocument(rawContent, context = {}) {
  // Support optional frontmatter
  const { data: frontmatter, content } = matter(rawContent);

  // Extract headings
  const headings = extractHeadings(content);

  // Determine title
  let title = frontmatter.title;
  if (!title) {
    const h1 = headings.find(h => h.level === 1) || headings.find(h => h.level === 2);
    if (h1) {
      title = h1.title;
    } else {
      title = context.defaultTitle || 'Documentation';
    }
  }

  // Create renderer with context for link/image resolution
  const renderer = createMarkdownRenderer(context);
  const html = renderer.render(content);

  // Estimate reading time
  const wordCount = content.replace(/\s+/g, ' ').trim().split(' ').length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  // Table of contents for level 2 & 3
  const toc = headings.filter(h => h.level >= 2 && h.level <= 3);

  return {
    title,
    frontmatter,
    headings,
    toc,
    html,
    wordCount,
    readingTimeMin
  };
}

module.exports = {
  createMarkdownRenderer,
  extractHeadings,
  renderMarkdownDocument,
  slugify
};
