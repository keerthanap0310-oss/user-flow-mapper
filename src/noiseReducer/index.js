function reduceNoise(rawEdges, totalPagesCount) {
    // A heuristic: if a link target appears in > 60% of crawled pages,
    // it is considered a global navigation item.
    // We can also use inHeader and inFooter indicators.

    const targetFrequencies = {};

    // Count how many distinct pages link to a particular target
    rawEdges.forEach(edge => {
        if (!targetFrequencies[edge.target]) {
            targetFrequencies[edge.target] = new Set();
        }
        targetFrequencies[edge.target].add(edge.source);
    });

    const globalThreshold = Math.max(2, Math.ceil(totalPagesCount * 0.6));
    const globalNavUrls = new Set();

    for (const [target, sources] of Object.entries(targetFrequencies)) {
        // Check if it's across many pages, or if they're purely header/footer links.
        // We'll stick to frequency-based + header/footer flags.
        const isWidespread = sources.size >= globalThreshold;

        // Also check if MOST of its occurrences were in header/footer
        const linksToTarget = rawEdges.filter(e => e.target === target);
        const headerFooterCount = linksToTarget.filter(e => e.inHeader || e.inFooter).length;

        // If it's very common, or >=50% of the times it appeared in header/footer
        if (isWidespread || (headerFooterCount > 0 && (headerFooterCount / linksToTarget.length) > 0.5)) {
            globalNavUrls.add(target);
        }
    }

    const cleanedEdges = [];
    const globalNavs = [];

    // Track visited nodes in the flow to prevent massive link repetition and back/cross links.
    // If a node was already visited, we don't add another edge to it, keeping the user flow graph a clean Spanning Tree.
    const flowVisited = new Set();
    if (rawEdges.length > 0) {
        flowVisited.add(rawEdges[0].source); // Ensure the initial root node is marked visited
    }

    rawEdges.forEach(edge => {
        if (globalNavUrls.has(edge.target)) {
            // It's global nav, store just one instance for reference if needed
            if (!globalNavs.find(n => n.target === edge.target)) {
                globalNavs.push({ target: edge.target, text: edge.text || 'Global Nav Item' });
            }
        } else {
            // It's a genuine flow transition
            // We also don't want self-loops in the flow (page pointing to itself)
            if (edge.source !== edge.target) {
                // Prevent backward link repetition! If target was already visited/discovered
                // by the main flow, don't create a backward loop. This cleans up the massive graph.
                if (!flowVisited.has(edge.target)) {
                    flowVisited.add(edge.target);
                    // Also ensure source is marked visited
                    flowVisited.add(edge.source);

                    cleanedEdges.push({
                        source: edge.source,
                        target: edge.target,
                        text: edge.text || ''
                    });
                }
            }
        }
    });

    // Remove duplicate edges (same source -> same target)
    // Note: This might be redundant now with the Strict tree generation, but keeps safety
    const uniqueEdges = [];
    const edgeSignatures = new Set();

    cleanedEdges.forEach(edge => {
        const key = `${edge.source}:::${edge.target}`;
        if (!edgeSignatures.has(key)) {
            edgeSignatures.add(key);
            uniqueEdges.push(edge);
        }
    });

    return { uniqueEdges, globalNavs };
}

module.exports = { reduceNoise };
