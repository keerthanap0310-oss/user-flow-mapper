# Intelligent User Flow Mapper

A smart web crawler service that analyzes a website or web application and produces a        **user flow representation** of the system. Instead of producing raw link graphs, it intelligently identifies meaningful navigation paths and separates global navigation (headers, footers, menus) from the core user journey — outputting a clean JSON structure ready for rendering on a frontend canvas (React Flow, D3.js, etc.).

## Problem Solved

When you crawl a website, every page has dozens of links in headers, footers, and sidebars that create a tangled "ball of yarn" graph. This service uses **multi-layered noise reduction heuristics** to separate those repetitive global navigation links from the actual user flow, producing a clean, readable graph of how a user truly navigates through the application.

---

## Features

- **Intelligent Crawling** — Breadth-first crawl with configurable depth (`maxDepth`) and page limits (`maxPages`).
- **Noise Reduction** — Multi-heuristic approach to identify and isolate global navigation links, preventing redundant edges.
- **URL Normalization** — Strips `.html` extensions, `index.html`, trailing slashes, and fragments to prevent duplicate nodes for the same page.
- **Smart Label Extraction** — Extracts meaningful labels from link text, headings, `aria-label`, and image `alt` attributes. Falls back to clean URL-based names when link text is missing or noisy (e.g., `"?"`, `"×"`, `"<script setup>"`).
- **SPA Support** — Optional Playwright browser mode (`--browser` / `useBrowser`) for crawling React, Angular, Vue, and other single-page applications with dynamic rendering.
- **Authentication Support** — Cleanly architected optional auth flow that logs in via Playwright before crawling, maintaining session state across pages.
- **Spanning Tree Enforcement** — Prevents backward/circular edges in the output, keeping the flow graph as a clean forward-only tree.
- **Dual Interface** — Usable via CLI or HTTP API.

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Playwright (only needed for SPA crawling)
```bash
npx playwright install chromium
```

---

## CLI Usage

### Static Site Crawl (Fast — uses Axios + Cheerio)
```bash
node src/cli.js --url https://books.toscrape.com/ --depth 2 --output result.json
```

### SPA Crawl with Playwright (Dynamic — for React/Angular/Vue)
```bash
node src/cli.js --url https://vuejs.org/ --depth 2 --browser --output result.json
```

---

## HTTP API Usage

### Start the Server
```bash
npm start
```

The server starts on `http://localhost:3000`.

### API Endpoint
```
POST /crawl
Content-Type: application/json
```

### Request Body Parameters

| Parameter    | Type    | Required | Default | Description |
|-------------|---------|----------|---------|-------------|
| `startUrl`  | string  | ✅       | —       | The URL to start crawling from |
| `maxDepth`  | number  | ❌       | `3`     | Maximum crawl depth |
| `maxPages`  | number  | ❌       | `50`    | Maximum number of pages to crawl |
| `useBrowser`| boolean | ❌       | `false` | Use Playwright for SPA crawling |
| `auth`      | object  | ❌       | `null`  | Authentication credentials (see below) |

### Auth Object

| Field       | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `loginUrl`  | string | ✅       | URL of the login page |
| `username`  | string | ✅       | Username or email credential |
| `password`  | string | ✅       | Password credential |

---

## 🚀 Sample API Examples

### Example 1: Static Site Crawl
A basic crawl of a simple static website using Axios (fast, no browser needed).

```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "startUrl": "https://books.toscrape.com",
    "maxDepth": 2,
    "maxPages": 20
  }'
```

**Use case:** E-commerce sites, blogs, documentation sites rendered server-side.

---

### Example 2: Simple SPA Crawl (Vue, React, Angular)
Crawling a JavaScript-rendered SPA using Playwright's headless browser.

```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "startUrl": "https://vuejs.org",
    "maxDepth": 2,
    "maxPages": 20,
    "useBrowser": true
  }'
```

**Use case:** Single Page Applications where content is rendered dynamically via JavaScript frameworks. The crawler uses Playwright to evaluate the DOM after JavaScript execution, and even attempts SPA soft-navigation (e.g., Vue Router push) to avoid destroying the client-side app state.

---

### Example 3: Authenticated Crawl (Logged-In Flow)
Crawling a protected application that requires login before accessing internal pages.

```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "startUrl": "https://the-internet.herokuapp.com",
    "maxDepth": 2,
    "maxPages": 15,
    "useBrowser": true,
    "auth": {
      "loginUrl": "https://the-internet.herokuapp.com/login",
      "username": "tomsmith",
      "password": "SuperSecretPassword!"
    }
  }'
```

**Use case:** Internal dashboards, admin panels, or any web app behind a login wall. The crawler:
1. Opens the `loginUrl` in Playwright.
2. Automatically fills in the username/email and password fields.
3. Submits the form and waits for the post-login page to load.
4. Records the post-authentication URL (e.g., `/dashboard`) as the effective start.
5. Continues crawling all internal pages while maintaining the authenticated session.

---

### Example 4: Quick Sanity Check
A fast test to verify the service is working.

```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "startUrl": "https://example.com",
    "maxDepth": 1,
    "maxPages": 5
  }'
```

---

## ✅ Recommended Test Order

| Step | URL | Mode | Why |
|------|-----|------|-----|
| 1st  | `https://example.com` | Static | Sanity check — runs in ~5 seconds |
| 2nd  | `https://quotes.toscrape.com` | Static | Clean static site, good flow output |
| 3rd  | `https://books.toscrape.com` | Static | Real e-commerce category → product flows |
| 4th  | `https://the-internet.herokuapp.com` | Browser + Auth | Authentication testing |
| 5th  | `https://demo.playwright.dev/todomvc` | Browser | SPA with Playwright |

---

## 🧠 Approach: Noise Reduction & Smart Flow Extraction

Noise reduction is **critical** to producing meaningful user flows. Without it, the output graph becomes an unreadable web of edges where every page connects to every other page via shared menus and footers. Below is a detailed explanation of the approach used in this service.

### The Pipeline

```
URL Input → Crawler → Link Extractor → Noise Reducer → Flow Builder → JSON Output
```

Each step has a specific responsibility:

| Module | File | Responsibility |
|--------|------|----------------|
| **Config** | `src/config/index.js` | Validates and normalizes input parameters |
| **Fetcher** | `src/crawler/fetcher.js` | Fetches HTML via Axios (static) or Playwright (SPA/auth) |
| **Crawler** | `src/crawler/index.js` | BFS traversal with depth tracking, visited set, page limits |
| **Link Extractor** | `src/analyzer/linkExtractor.js` | Parses HTML with Cheerio, extracts internal links with metadata |
| **Noise Reducer** | `src/noiseReducer/index.js` | Separates global nav from flow edges using heuristics |
| **Flow Builder** | `src/flowBuilder/index.js` | Builds final nodes/edges/globalNavigation JSON output |

---

### Heuristic 1: Target Frequency Analysis

**Problem:** Global navigation menus (Home, About, Contact, etc.) appear on virtually every page. If we keep them as edges, every node connects to every menu item.

**Solution:** After crawling, we count how many **distinct source pages** link to each target URL. If a target is referenced by **≥ 60%** of all crawled pages, it is statistically a global navigation item, not a unique user flow step.

```
globalThreshold = max(2, ceil(totalPagesCount × 0.6))
```

These links are removed from the main `edges` array and placed into a separate `globalNavigation` metadata array. This preserves the information for frontend rendering without polluting the core user journey graph.

> **File:** `src/noiseReducer/index.js`

---

### Heuristic 2: DOM Position Detection (Header/Footer Tags)

**Problem:** On smaller sites, the 60% frequency threshold alone may not catch all navigation links.

**Solution:** During link extraction, we check if each `<a>` tag is nested inside a `<header>`, `<nav>`, or `<footer>` HTML element. This metadata (`inHeader`, `inFooter`) is passed to the noise reducer. If **> 50%** of a link's occurrences came from header/footer elements, it is classified as global navigation regardless of frequency.

> **File:** `src/analyzer/linkExtractor.js` (metadata collection) → `src/noiseReducer/index.js` (classification)

---

### Heuristic 3: Spanning Tree Enforcement (No Backward Edges)

**Problem:** Even after removing global nav, many links still point backward (e.g., a "Back to Catalog" button on a product page). These create cycles and make the graph unreadable.

**Solution:** We maintain a `flowVisited` Set during noise reduction. When processing edges, if a target node has **already been discovered** earlier in the flow, we do not create a backward edge to it. This enforces a clean, tree-like forward-only structure representing the user's journey from entry point to deeper pages.

> **File:** `src/noiseReducer/index.js`

---

### Heuristic 4: URL Normalization (Duplicate Prevention)

**Problem:** Many websites serve the same page at multiple URL variants:
- `/guide/web-components` vs `/guide/web-components.html`
- `/about/` vs `/about`
- `/catalogue/book_1/index.html` vs `/catalogue/book_1`

Without normalization, these create duplicate nodes and redundant edges.

**Solution:** Before any processing, all URLs pass through `normalizeUrl()` which:
1. Strips `#fragment` hashes
2. Removes `/index.html` and `/index.htm` suffixes
3. Removes `.html` and `.htm` file extensions
4. Removes trailing slashes (except for root `/`)

This ensures the same page always resolves to a single canonical URL.

> **File:** `src/utils/urlUtils.js`

---

### Heuristic 5: Smart Label Extraction (Noise-Free Labels)

**Problem:** Many links have noisy or missing text:
- Icon-only links with no text → `"Unknown Link"`
- Links with single characters → `"?"`
- Links with HTML-like text → `"<script setup>"`
- Links with badge counts → `"Dashboard 5/5 not-activated"`

**Solution:** Multi-strategy label extraction:
1. **Priority 1:** Look for heading elements inside the link (`h1`–`h6`, `strong`, `.title`)
2. **Priority 2:** Use cleaned clone text (strips badges, counts, status tags)
3. **Priority 3:** Fall back to `aria-label` or image `alt` text
4. **Filter:** Reject labels that are ≤ 2 characters, pure numbers, pure symbols, or HTML-like tags
5. **Final fallback:** Generate a clean, title-cased label from the URL path (e.g., `/guide/web-components` → `"Web Components"`)

> **Files:** `src/analyzer/linkExtractor.js` (extraction) → `src/flowBuilder/index.js` (fallback labeling)

---

## Output Format

The output JSON has three top-level keys, designed for direct use with graph rendering libraries:

```json
{
  "nodes": [
    {
      "id": "https://example.com",
      "label": "Home",
      "type": "entry"
    },
    {
      "id": "https://example.com/products",
      "label": "Products",
      "type": "feature"
    }
  ],
  "edges": [
    {
      "source": "https://example.com",
      "target": "https://example.com/products"
    }
  ],
  "globalNavigation": [
    {
      "id": "https://example.com/about",
      "label": "About Us",
      "type": "global_nav"
    }
  ]
}
```

### Node Types

| Type | Meaning |
|------|---------|
| `entry` | The start URL / landing page |
| `auth` | Login, register, or password reset pages |
| `dashboard` | Dashboard page |
| `settings` | Settings, preferences, or configuration pages |
| `feature` | Feature pages (2 URL segments, e.g., `/sms/campaign`) |
| `sub-page` | Deeper pages (3+ URL segments, e.g., `/blog/2025/post-title`) |
| `page` | Default single-segment pages |
| `global_nav` | Global navigation items (separated from main flow) |

---

## Project Structure

```
src/
├── config/
│   └── index.js          # Configuration factory & validation
├── crawler/
│   ├── index.js          # BFS crawler with depth tracking
│   └── fetcher.js        # Axios (static) + Playwright (SPA/auth) fetcher
├── analyzer/
│   └── linkExtractor.js  # Cheerio-based link extraction with metadata
├── noiseReducer/
│   └── index.js          # Frequency + positional heuristics for noise reduction
├── flowBuilder/
│   └── index.js          # Graph builder (nodes, edges, globalNavigation)
├── output/
│   └── formatter.js      # Output formatting utilities
├── utils/
│   ├── urlUtils.js       # URL normalization, validation, internal link checks
│   └── logger.js         # Logging utility
├── service.js            # Pipeline orchestrator
├── index.js              # Express HTTP server
└── cli.js                # CLI entry point
```

---

## Non-Functional Design

- **Clean Separation of Concerns** — Each module has a single, well-defined responsibility (fetching, parsing, reducing, building).
- **Error Handling** — Fetch failures are caught gracefully with warnings; the crawler continues processing remaining pages. Playwright timeouts do not crash the service.
- **Configurable** — All key parameters (depth, page limits, thresholds, timeouts, delays) are configurable through both CLI and API inputs.
- **Polite Crawling** — Configurable `requestDelay` between requests to avoid overwhelming target servers, plus a custom `User-Agent` header.
