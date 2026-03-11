const { crawl } = require('./crawler');
const { reduceNoise } = require('./noiseReducer');
const { buildFlow } = require('./flowBuilder');
const { formatFlow } = require('./output/formatter');
const logger = require('./utils/logger');

async function runPipeline(config) {
    logger.info(`Starting crawler map via pipeline...`);

    // 1. Crawl all pages within depth limit and get raw edges
    const { crawledPages, rawEdges } = await crawl(config);

    // 2. Reduce noise (identify global navigation menus and identical components on most pages)
    const cleanedData = reduceNoise(rawEdges, crawledPages.length);

    // 3. Build text-based user flow representation
    const userFlow = buildFlow(cleanedData, config.startUrl);

    // 4. Transform to final JSON for frontend consumption
    const formattedFlow = formatFlow(userFlow);

    return formattedFlow;
}

module.exports = {
    runPipeline
};
