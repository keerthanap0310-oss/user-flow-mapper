const { fetchPage, closeBrowser, getPostAuthUrl } = require('./fetcher');
const { extractLinks } = require('../analyzer/linkExtractor');
const logger = require('../utils/logger');
const cheerio = require('cheerio');

/**
 * Polite delay between requests to avoid overwhelming target servers.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function crawl(config) {
    let { startUrl, maxDepth = 3, maxPages = 50 } = config;

    const queue = [{ url: startUrl, depth: 0 }];
    const visited = new Set();
    const discovered = new Set([startUrl]);
    const rawEdges = [];
    const crawledPages = [];
    const pageTitles = new Map(); // URL -> page title
    let effectiveStartUrl = startUrl; // May be remapped after auth

    while (queue.length > 0 && visited.size < maxPages) {
        // Basic breadth-first search for consistent depth mapping
        const { url, depth } = queue.shift();

        if (visited.has(url) || depth > maxDepth) {
            continue;
        }

        visited.add(url);
        logger.info(`[${visited.size}/${maxPages}] Crawling Depth ${depth}: ${url}`);

        const html = await fetchPage(url, config);
        if (!html) {
            logger.warn(`Skipping missing content for ${url}`);
            continue;
        }

        // Extract <title> from the page for better node labels
        try {
            const $ = cheerio.load(html);
            const title = $('title').first().text().trim();
            if (title && title.length > 0) {
                pageTitles.set(url, title);
            }
        } catch (e) {
            // Title extraction is optional; ignore errors
        }

        // After the first page fetch, check if auth redirected us.
        // If the original startUrl was the site root ("/"), the browser actually ended up
        // on e.g. "/dashboard". We need to use the post-auth domain for link extraction
        // so internal links are correctly matched.
        if (visited.size === 1 && config.auth) {
            const postAuthUrl = getPostAuthUrl();
            if (postAuthUrl) {
                try {
                    const origObj = new URL(startUrl);
                    const postObj = new URL(postAuthUrl);
                    // Use the post-auth URL's origin as the effective start for internal link checks
                    effectiveStartUrl = postObj.origin + '/';
                    logger.info(`Remapped effectiveStartUrl to: ${effectiveStartUrl}`);
                } catch (e) { }
            }
        }

        const links = extractLinks(html, url, effectiveStartUrl);
        crawledPages.push(url);

        for (const link of links) {
            // Record the edge for noise analysis (important for target frequency counting!)
            rawEdges.push({
                source: url,
                target: link.href,
                text: link.text,
                inHeader: link.inHeader,
                inFooter: link.inFooter,
            });

            // Protect the queue from massive duplicate processing loops
            if (!discovered.has(link.href)) {
                discovered.add(link.href);

                if (depth < maxDepth) {
                    // Queue next to explore
                    queue.push({ url: link.href, depth: depth + 1 });
                }
            }
        }

        // Polite crawling: wait between requests to avoid overwhelming the server
        if (queue.length > 0 && config.requestDelay > 0) {
            await sleep(config.requestDelay);
        }
    }

    // Ensure browser closes after crawling all pages
    if (config.useBrowser) {
        await closeBrowser();
    }

    return { crawledPages, rawEdges, pageTitles };
}

module.exports = {
    crawl
};
