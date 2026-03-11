# Intelligent User Flow Mapper

A smart web crawler service designed to analyze a website or web application and produce a user flow representation mapping the system. It filters redundant structural links (e.g. headers, footers) into global navigational context and preserves the true internal flow of navigation paths in a JSON format suitable for direct rendering on a frontend canvas (like React Flow or similar tools).

## Problem Solved
By analyzing frequencies of links and locations across multiple pages, this mapper distinguishes global recurring navigational choices from unique inner-page transitions, drastically reducing graph noise.

## Features
- Intelligently crawls internal edges and maps node architecture.
- Removes infinite loops and controls recursion with depth configuration (`maxDepth`).
- Built-in `noiseReducer` limits identical links spanning > 60% of crawled pages (or typical header/footers) to a list of Global Navigations, keeping edge-to-edge paths strictly intentional.
- Optional CLI argument (`--browser`) powers `playwright` for evaluating and crawling Single Page Apps (SPA) dynamically.
- Includes Authentication functionality (configurable via arguments pointing to login targets and credentials).
- Outputs a consumable JSON structure.

## Quick Start
1. Install dependencies:
\```bash
npm install
\```

2. Run with standard static parsing (faster):
\```bash
node src/cli.js --url https://books.toscrape.com/ --depth 2 --output result.json
\```

3. Run with Playwright Browser evaluation (for SPAs, React/Angular/Vue etc)
*(Ensure you've executed `npx playwright install chromium` first!)*
\```bash
node src/cli.js --url https://angular.io/ --depth 2 --browser --output result.json
\```

## HTTP Implementation
Start the API Server:
\```bash
npm start
\```

POST to it:
\```bash
curl -X POST http://localhost:3000/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "startUrl": "https://books.toscrape.com",
    "maxDepth": 2,
    "maxPages": 20
  }'
\```

## Noise Reduction Architecture
Because crawling maps links in raw format, menus and footers duplicate edges endlessly causing "graph balls of yarn". This service employs a heuristic strategy in `/src/noiseReducer/index.js`. 
1. It loops over the set of targets across all pages.
2. If a specific edge target is found in > 60% of all distinct pages explored, it considers the link a Global Navigation entity instead of an edge case flow.
3. This shifts the item to `globalNavigation` metadata output, drastically flattening out the nodes/edges arrays leaving only the primary workflow (e.g., Categories -> Books -> Checkout format).

## 🚀 Sample API Endpoint Examples

### 1. Basic Static Crawl (Fast)
\```bash
curl -X POST http://localhost:3000/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "startUrl": "https://example.com",
    "maxDepth": 2,
    "maxPages": 15
  }'
\```

### 2. Deep E-Commerce Crawl
\```bash
curl -X POST http://localhost:3000/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "startUrl": "https://books.toscrape.com/",
    "maxDepth": 3,
    "maxPages": 50
  }'
\```

### 3. SPA Crawl with Playwright (Dynamic)
\```bash
curl -X POST http://localhost:3000/api/v1/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "startUrl": "https://demo.playwright.dev/todomvc/",
    "maxDepth": 2,
    "maxPages": 10,
    "useBrowser": true
  }'
\```

## ✅ Recommended Test Order

| Step | URL | Why |
|------|-----|-----|
| 1st  | `https://example.com` | Sanity check — runs in 5 seconds |
| 2nd  | `https://quotes.toscrape.com` | Clean static site, good flow output |
| 3rd  | `https://books.toscrape.com` | Real e-commerce flows |
| 4th  | `https://the-internet.herokuapp.com` | Auth testing |
| 5th  | `https://demo.playwright.dev/todomvc` | SPA with Playwright |
