function formatFlow(userFlow, pipelineStats = {}) {
    // It takes the { nodes, edges, globalNavigation } object and formats it
    // This JSON is directly consumable by frontend applications like React Flow.
    // We include metadata like total nodes/edges, timing, and a human-readable summary.

    const { crawlDurationMs = 0, pagesExplored = 0, startUrl = '' } = pipelineStats;
    const durationSec = (crawlDurationMs / 1000).toFixed(1);

    const flowGraph = {
        metadata: {
            startUrl,
            totalNodes: userFlow.nodes.length,
            totalEdges: userFlow.edges.length,
            globalNavItems: userFlow.globalNavigation.length,
            pagesExplored,
            crawlDurationMs,
            timestamp: new Date().toISOString(),
            summary: `Crawled ${pagesExplored} pages in ${durationSec}s — found ${userFlow.nodes.length} unique nodes, ${userFlow.edges.length} flow edges, and ${userFlow.globalNavigation.length} global nav items.`
        },
        nodes: userFlow.nodes,
        edges: userFlow.edges,
        globalNavigation: userFlow.globalNavigation
    };

    return flowGraph;
}

module.exports = {
    formatFlow
};
