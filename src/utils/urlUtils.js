const { URL } = require('url');

function normalizeUrl(rawUrl, baseUrl) {
    try {
        const urlObj = new URL(rawUrl, baseUrl);
        // Remove hash/fragment
        urlObj.hash = '';
        // Normalize path (remove trailing slash if present on path)
        if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
            urlObj.pathname = urlObj.pathname.slice(0, -1);
        }
        return urlObj.href;
    } catch (e) {
        return null;
    }
}

function isInternalLink(linkUrl, startUrl) {
    try {
        const linkObj = new URL(linkUrl);
        const startObj = new URL(startUrl);
        // Check if same domain/host
        return linkObj.hostname === startObj.hostname;
    } catch (e) {
        return false;
    }
}

function isValidLink(href) {
    if (!href) return false;
    if (href.startsWith('javascript:')) return false;
    if (href.startsWith('mailto:')) return false;
    if (href.startsWith('tel:')) return false;
    if (href === '#') return false;

    // also exclude common non-html files
    const lowerResp = href.toLowerCase();
    const badExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.zip', '.tar.gz', '.mp3', '.mp4'];
    for (const ext of badExtensions) {
        if (lowerResp.endsWith(ext)) return false;
    }
    return true;
}

module.exports = {
    normalizeUrl,
    isInternalLink,
    isValidLink
};
