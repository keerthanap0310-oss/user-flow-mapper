const { URL } = require('url');

function buildFlow(cleanedData, startUrl) {
    const { uniqueEdges, globalNavs } = cleanedData;

    const nodesMap = new Map();
    const edges = [];

    // Collect global nav URLs for type detection
    const globalNavUrls = new Set(globalNavs.map(nav => nav.target));

    // Pre-build a label lookup: URL -> best human-readable text from edges
    const labelMap = new Map();

    // Collect labels from unique edges
    uniqueEdges.forEach(edge => {
        if (edge.text && edge.text !== 'Unknown Link' && !labelMap.has(edge.target)) {
            labelMap.set(edge.target, edge.text);
        }
    });

    // Also collect labels from global nav items
    globalNavs.forEach(nav => {
        if (nav.text && nav.text !== 'Global Nav Item' && nav.text !== 'Unknown Link' && !labelMap.has(nav.target)) {
            labelMap.set(nav.target, nav.text);
        }
    });

    /**
     * Clean up a raw label string:
     * - Strip known noise like "not-activated", badge counts, status tags
     * - Collapse whitespace
     * - Truncate to max length
     */
    function cleanLabel(rawText, maxLength = 50) {
        if (!rawText) return '';

        let text = rawText;

        // Remove common noise patterns from SPA UIs
        text = text.replace(/not-activated/gi, '');
        text = text.replace(/activated/gi, '');
        text = text.replace(/\b\d+\/\d+\b/g, ''); // Remove "5/5", "1/1" patterns
        text = text.replace(/\s*\|\s*/g, ' '); // Replace "|" separators

        // Collapse multiple whitespace into single space
        text = text.replace(/\s+/g, ' ').trim();

        // If still too long, try to take just the first sentence/phrase
        if (text.length > maxLength) {
            // Try to cut at the first natural break point
            const breakPoints = ['. ', ' - ', ': ', '\n'];
            for (const bp of breakPoints) {
                const idx = text.indexOf(bp);
                if (idx > 5 && idx <= maxLength) {
                    text = text.substring(0, idx);
                    break;
                }
            }
        }

        // Final truncation if still too long
        if (text.length > maxLength) {
            text = text.substring(0, maxLength).trim() + '…';
        }

        return text.trim();
    }

    /**
     * Determine the page type based on URL patterns
     */
    function getPageType(url) {
        if (url === startUrl) return 'entry';

        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname.toLowerCase();

            // Auth-related pages
            if (path.includes('/login') || path.includes('/register') ||
                path.includes('/signup') || path.includes('/auth') ||
                path.includes('/forgot-password') || path.includes('/reset-password')) {
                return 'auth';
            }

            // Dashboard
            if (path === '/dashboard' || path === '/dashboard/') {
                return 'dashboard';
            }

            // Settings / Configuration
            if (path.includes('/settings') || path.includes('/preferences') ||
                path.includes('/config') || path.includes('/pricing') ||
                path.includes('/customize')) {
                return 'settings';
            }

            // Sub-pages (paths with 3+ segments like /trust-center/spam-likely)
            const segments = path.split('/').filter(Boolean);
            if (segments.length >= 3) {
                return 'sub-page';
            }

            // Feature pages (2 segments like /sms/campaign)
            if (segments.length === 2) {
                return 'feature';
            }

            // Default single-segment pages
            return 'page';
        } catch (e) {
            return 'page';
        }
    }

    function getReadableLabel(url) {
        // 1. Check if we have a label from the link text that discovered this page
        if (labelMap.has(url)) {
            const cleaned = cleanLabel(labelMap.get(url));
            // If cleaning wiped out the label, fall through to URL-based label
            if (cleaned) return cleaned;
        }

        // 2. Otherwise, create a clean label from the URL path
        try {
            const urlObj = new URL(url);
            if (urlObj.pathname === '/' || urlObj.pathname === '') {
                return 'Home';
            }

            let path = urlObj.pathname;
            path = path.replace(/\/index\.html?$/i, '');
            const segments = path.split('/').filter(Boolean);
            const lastSegment = segments[segments.length - 1] || 'Home';
            const cleaned = lastSegment.replace(/\.\w+$/, '');
            const titleCased = cleaned
                .replace(/[-_]+/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
            return titleCased;
        } catch (e) {
            return url;
        }
    }

    function addNode(url) {
        if (!nodesMap.has(url)) {
            const label = getReadableLabel(url);
            const type = getPageType(url);
            nodesMap.set(url, {
                id: url,
                label: label,
                type: type
            });
        }
    }

    // Iterate over cleaned edges and build the graph structure
    uniqueEdges.forEach(edge => {
        addNode(edge.source);
        addNode(edge.target);

        const edgeObj = {
            source: edge.source,
            target: edge.target
        };

        edges.push(edgeObj);
    });

    // Ensure startUrl is in nodes even if it had no outgoing edges
    addNode(startUrl);

    const nodes = Array.from(nodesMap.values());

    return {
        nodes,
        edges,
        globalNavigation: globalNavs.map(nav => {
            let label = cleanLabel(nav.text);
            if (!label || label === 'Unknown Link' || label === 'Global Nav Item') {
                // Determine a readable label from the URL if the text is missing or unknown
                label = getReadableLabel(nav.target);
            }
            return {
                id: nav.target,
                label: label,
                type: 'global_nav'
            };
        })
    };
}

module.exports = {
    buildFlow
};
