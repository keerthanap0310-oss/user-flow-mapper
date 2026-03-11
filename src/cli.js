const { program } = require('commander');
const fs = require('fs');
const { runPipeline } = require('./service');
const { createConfig } = require('./config');
const logger = require('./utils/logger');

program
    .name('user-flow-mapper')
    .description('CLI to crawl and map user flows structure of a web application')
    .requiredOption('-u, --url <url>', 'Starting URL to crawl')
    .option('-d, --depth <number>', 'Maximum crawl depth', '3')
    .option('-m, --max-pages <number>', 'Maximum pages to crawl', '50')
    .option('-o, --output <file>', 'Output JSON file', 'result.json')
    .option('-b, --browser', 'Use playwright browser for dynamic/SPA sites', false)
    // Optional auth
    .option('--username <username>', 'Username for authentication')
    .option('--password <password>', 'Password for authentication')
    .option('--login-url <url>', 'Login URL for authentication')
    .parse(process.argv);

const options = program.opts();

async function main() {
    try {
        const config = createConfig({
            startUrl: options.url,
            maxDepth: parseInt(options.depth, 10),
            maxPages: parseInt(options.maxPages, 10),
            useBrowser: options.browser,
            auth: (options.username && options.password && options.loginUrl)
                ? { username: options.username, password: options.password, loginUrl: options.loginUrl }
                : null
        });

        logger.info(`Starting crawler map via CLI for ${config.startUrl}`);
        const flowResult = await runPipeline(config);

        fs.writeFileSync(options.output, JSON.stringify(flowResult, null, 2));
        logger.info(`Done! Result saved to ${options.output}`);

        process.exit(0);
    } catch (error) {
        logger.error('Failed to run pipeline', error);
        process.exit(1);
    }
}

main();
