# OKdevTV Markdown Documentation (omd)

![Node.js](https://img.shields.io/badge/Node.js-22_LTS-green?logo=node.js)
![Docker](https://img.shields.io/badge/Docker-Compose-blue?logo=docker)
![EJS](https://img.shields.io/badge/Template-EJS-orange)
![Markdown-it](https://img.shields.io/badge/Renderer-markdown--it-lightgrey)

---

## 🚀 Quick Start with Docker Compose

Run the application using Docker Compose with zero host dependencies:

```sh
# Start the container in background
docker compose up -d --build

# View logs
docker compose logs -f

# Stop the container
docker compose down
```

Open your browser and navigate to:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## ✨ Features

- **Node.js LTS (22-alpine)**: Lightweight, secure, and modern runtime container.
- **Server-Side Rendered with EJS**: Fast, SEO-friendly HTML templates.
- **Rich Markdown Rendering**:
  - Code syntax highlighting with `highlight.js` (dark & light themes).
  - Copy-to-clipboard button on every code block.
  - Automatic Table of Contents (TOC) with scrollspy tracking.
  - Anchor permalinks for headings (`#`).
  - GFM task lists and footnotes.
  - Smart image resolution and fallback support (`.jpg`/`.png` to `.webp`).
- **Interactive Search**:
  - Live modal search via `⌘K` or `/` key.
  - Instant client-side sidebar filter for 210+ categories and documents.
- **Theme Support**:
  - Built-in Dark Mode (default) and Light Mode.
  - Persistent user preference in `localStorage`.
- **Live Markdown Mount**:
  - `./md` is mounted as a read-only volume in `docker-compose.yml`, so adding or modifying markdown files updates the site immediately without rebuilding the image!
- **Healthcheck & Monitoring**:
  - Built-in `/health` endpoint for Docker and container orchestrators.

---

## 📂 Project Structure

```text
omd/
├── Dockerfile                  # Node.js 22 LTS Alpine container definition
├── docker-compose.yml          # Compose service configuration with live volume mount
├── package.json                # Dependencies and scripts
├── server.js                   # Express application entrypoint
├── lib/
│   ├── docs.js                 # Directory scanner, category grouper, search indexer
│   └── markdown.js             # markdown-it parser, syntax highlighter, anchor generator
├── views/
│   ├── index.ejs               # Home landing page with categories & stats
│   ├── doc.ejs                 # Markdown reader page with sidebar, breadcrumbs, TOC
│   ├── 404.ejs                 # Error page
│   └── partials/
│       ├── header.ejs          # Glassmorphic header & search modal
│       ├── sidebar.ejs         # Category explorer & live filter
│       ├── toc.ejs             # Sticky right table of contents
│       └── footer.ejs          # Footer credits
├── public/
│   ├── css/
│   │   ├── style.css           # Modern responsive design system
│   │   └── hljs-github.css     # Dark / light code highlight styling
│   ├── js/
│   │   └── main.js             # Theme toggle, search modal, TOC scrollspy, copy code
│   └── images/
│       └── logo.webp           # OKdevTV branding logo
└── md/                         # 470+ Markdown documentation files in 210+ categories
```

---

## 🛠 Local Development (Without Docker)

If Node.js 20+ is installed on your host:

```sh
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

---

## 🔌 API Endpoints

- `GET /health` : Healthcheck status, uptime, total document count.
- `GET /api/search?q=:query` : Real-time document search results.
- `GET /api/docs` : Full list of indexed markdown files.
- `POST /api/refresh` : Re-scan and re-index the `md/` directory.
- `GET /raw/:category/:file` : Raw markdown / asset access (or append `?raw=1` to any document URL).
