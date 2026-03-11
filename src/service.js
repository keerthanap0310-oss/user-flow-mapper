const { crawl } = require('./crawler');
const { reduceNoise } = require('./noiseReducer');
const { buildFlow } = require('./flowBuilder');
const { formatFlow } = require('./output/formatter');
const logger = require('./utils/logger');

async function runPipeline(config) {
    logger.info(`Starting crawler map via pipeline...`);

    const startTime = Date.now();

    // 1. Crawl all pages within depth limit and get raw edges
    const { crawledPages, rawEdges, pageTitles } = await crawl(config);

    // 2. Reduce noise (identify global navigation menus and identical components on most pages)
    const cleanedData = reduceNoise(rawEdges, crawledPages.length);

    // 3. Build text-based user flow representation
    const userFlow = buildFlow(cleanedData, config.startUrl, pageTitles);

    const crawlDurationMs = Date.now() - startTime;

    // 4. Transform to final JSON for frontend consumption
    const formattedFlow = formatFlow(userFlow, {
        crawlDurationMs,
        pagesExplored: crawledPages.length,
        startUrl: config.startUrl,
    });

    logger.info(`Pipeline complete in ${(crawlDurationMs / 1000).toFixed(1)}s — ${crawledPages.length} pages crawled.`);

    return formattedFlow;
}

module.exports = {
    runPipeline
};
