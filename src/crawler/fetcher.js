const axios = require('axios');
const { chromium } = require('playwright');
const logger = require('../utils/logger');

let browserInstance = null;
let pageInstance = null;
let postAuthUrl = null; // Track where the browser lands after authentication

async function initBrowser(config) {
    if (config.useBrowser && !browserInstance) {
        logger.info('Initializing Playwright chromium browser for SPA crawling...');
        browserInstance = await chromium.launch({ headless: true });
        const context = await browserInstance.newContext();
        pageInstance = await context.newPage();

        if (config.auth) {
            logger.info('Handling Authentication flow via Browser...');
            try {
                await pageInstance.goto(config.auth.loginUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
                await pageInstance.waitForTimeout(2000);

                const usernameSelector = 'input[type="email"], input[name="username"], input[name="login"], input[id="email"], input[name="email"]';
                await pageInstance.waitForSelector(usernameSelector, { timeout: 15000 }).catch(() => { });
                await pageInstance.fill(usernameSelector, config.auth.username);
                await pageInstance.fill('input[type="password"], input[name="password"]', config.auth.password);

                await pageInstance.keyboard.press('Enter');

                await pageInstance.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
                await pageInstance.waitForTimeout(5000);

                // Record where the browser ended up after authentication
                postAuthUrl = pageInstance.url();
                logger.info(`Browser Authentication complete. Post-auth URL: ${postAuthUrl}`);
            } catch (e) {
                logger.warn('Browser Auth flow encountered an error, or wait timed out: ' + e.message);
                postAuthUrl = pageInstance.url();
            }
        }
    }
}

function getPostAuthUrl() {
    return postAuthUrl;
}

async function closeBrowser() {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
        pageInstance = null;
        postAuthUrl = null;
    }
}

async function fetchPage(url, config) {
    if (config.useBrowser) {
        await initBrowser(config);
        try {
            const currentUrl = pageInstance.url();

            // Check if the target URL is the site root (e.g. https://example.com/ or https://example.com)
            // If we're already on an authenticated page (post-auth), skip navigation entirely.
            // Many SPAs redirect root "/" to a public/marketing site, destroying the auth session.
            const targetObj = new URL(url);
            const isRootUrl = (targetObj.pathname === '/' || targetObj.pathname === '');
            const isCurrentlyAuthenticated = !currentUrl.includes('login') && !currentUrl.includes('about:blank');

            if (isRootUrl && isCurrentlyAuthenticated && postAuthUrl) {
                logger.info(`Target is site root — using current authenticated page: ${currentUrl}`);
                // Don't navigate, just grab the current page content
            } else if (currentUrl !== url && !currentUrl.includes('login')) {
                try {
                    const currentObj = new URL(currentUrl);
                    const isSameDomain = (currentObj.hostname === targetObj.hostname);

                    if (isSameDomain) {
                        const dest = targetObj.pathname + targetObj.search + targetObj.hash;
                        logger.info(`Performing SPA soft-navigation to: ${dest}`);
                        const clicked = await pageInstance.evaluate((destPath) => {
                            try {
                                if (window.$nuxt && window.$nuxt.$router) {
                                    window.$nuxt.$router.push(destPath);
                                    return true;
                                }
                                const a = document.querySelector('a[href="' + destPath + '"], a[href="' + window.location.origin + destPath + '"]');
                                if (a) {
                                    a.click();
                                    return true;
                                }
                            } catch (err) { }
                            return false;
                        }, dest);
                        if (!clicked) {
                            await pageInstance.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                        }
                    } else {
                        await pageInstance.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                    }
                } catch (e) {
                    await pageInstance.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
                }
            }
            // else: currentUrl === url, no navigation needed

            await pageInstance.waitForSelector('a', { timeout: 10000 }).catch(() => { });
            await pageInstance.waitForTimeout(5000);
            const html = await pageInstance.content();
            return html;
        } catch (error) {
            logger.error(`Playwright fetch failed for ${url}: ${error.message}`);
            return null;
        }
    } else {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'IntelligentUserFlowMapper/1.0',
                },
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            logger.error(`Axios fetch failed for ${url}: ${error.message}`);
            return null;
        }
    }
}

module.exports = {
    fetchPage,
    closeBrowser,
    getPostAuthUrl
};
