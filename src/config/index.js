/**
 * Configuration Factory
 * Creates a validated, normalized configuration object from user input.
 * Supports both CLI and HTTP API input sources.
 */

function createConfig(options) {
    const {
        startUrl,
        maxDepth = 3,
        maxPages = 50,
        useBrowser = false,
        auth = null,
        // Advanced noise reduction tuning
        globalNavThreshold = 0.5,   // % of pages a link must appear on to be global
        maxLabelLength = 50,        // Max characters for node labels
        includeExternalRefs = false, // Whether to include external link references
        requestDelay = 500,          // Delay between requests in ms (politeness)
        timeout = 15000,             // Per-page fetch timeout in ms
    } = options;

    return {
        startUrl: normalizeStartUrl(startUrl),
        maxDepth,
        maxPages,
        useBrowser,
        auth, // { username, password, loginUrl }
        globalNavThreshold,
        maxLabelLength,
        includeExternalRefs,
        requestDelay,
        timeout,
    };
}

/**
 * Ensures the URL starts with a protocol scheme.
 * Defaults to HTTPS if missing.
 */
function normalizeStartUrl(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
    }
    return url;
}

module.exports = {
    createConfig,
};
