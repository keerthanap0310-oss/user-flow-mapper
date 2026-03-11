function formatFlow(userFlow) {
    // It takes the { nodes, edges, globalNavigation } object and formats it
    // This JSON is directly consumable by frontend applications like React Flow.
    // We can add metadata like total nodes/edges here.

    const flowGraph = {
        metadata: {
            totalNodes: userFlow.nodes.length,
            totalEdges: userFlow.edges.length,
            globalNavItems: userFlow.globalNavigation.length,
            timestamp: new Date().toISOString()
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
