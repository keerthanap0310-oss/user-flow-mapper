const cheerio = require('cheerio');
const { normalizeUrl, isInternalLink, isValidLink } = require('../utils/urlUtils');

function extractLinks(html, sourceUrl, startUrl) {
    if (!html) return [];

    const $ = cheerio.load(html);
    const links = [];

    $('a').each((_, elem) => {
        const $elem = $(elem);
        const href = $elem.attr('href');
        const $clone = $elem.clone();
        // Remove noise elements: badges, counts, descriptions, status tags
        $clone.find('.badge, .count, [class*="badge"], [class*="count"], [data-cy*="count"]').remove();
        $clone.find('p, .description, [class*="description"], [class*="subtitle"], [class*="status"]').remove();
        $clone.find('span.iconify, [aria-hidden="true"]').remove();

        // Strategy 1: Try to get text from heading-like elements first (h1-h6, strong, b, .title)
        let text = '';
        const $heading = $elem.find('h1, h2, h3, h4, h5, h6, strong, b, [class*="title"], [class*="heading"], [class*="name"]').first();
        if ($heading.length && $heading.text().trim().length > 1) {
            text = $heading.text().replace(/\s+/g, ' ').trim();
        }

        // Strategy 2: Use the cleaned clone text
        if (!text) {
            text = $clone.text().replace(/\s+/g, ' ').trim();
        }

        // Strategy 3: Try aria-label or image alt
        if (!text) {
            text = $elem.attr('aria-label') || $elem.find('img').attr('alt') || 'Unknown Link';
            text = text.trim();
        }

        // Final safety: if text is absurdly long, take only the first meaningful chunk
        if (text.length > 80) {
            // Try to find a natural break
            const firstSentence = text.match(/^[^.!?\n]{5,60}/);
            if (firstSentence) {
                text = firstSentence[0].trim();
            } else {
                text = text.substring(0, 60).trim();
            }
        }

        // Filter out meaningless / noisy labels:
        // - Single characters like "?" or "×"
        // - HTML-like strings like "<script setup>"
        // - Pure numbers like "1" or "22"
        // - Pure punctuation/symbols
        if (text.length <= 2 || /^<[^>]+>$/.test(text) || /^[\d]+$/.test(text) || /^[^\w\s]+$/.test(text)) {
            text = 'Unknown Link';
        }

        if (!isValidLink(href)) return;

        // Normalizing URL relative to source domain
        const absoluteLocation = normalizeUrl(href, sourceUrl);

        if (!absoluteLocation) return;

        if (isInternalLink(absoluteLocation, startUrl)) {
            links.push({
                href: absoluteLocation,
                text: text,
                // Collect extra metadata for potential noise reduction 
                inHeader: $elem.parents('header, nav').length > 0,
                inFooter: $elem.parents('footer').length > 0,
            });
        }
    });

    return links;
}

module.exports = {
    extractLinks
};
