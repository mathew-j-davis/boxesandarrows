class Renderer {
    constructor(style) {
        this.style = style;
    }

    // Core rendering methods that all renderers must implement
    renderNode(node) {
        throw new Error('renderNode must be implemented');
    }

    renderEdge(edge, fromNode, toNode) {
        throw new Error('renderEdge must be implemented');
    }

    // Optional methods that renderers can override
    beforeRender() {} // Setup before rendering starts
    afterRender() {}  // Cleanup after rendering completes
}

module.exports = Renderer;