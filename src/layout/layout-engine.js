/**
 * Abstract base class for layout engines
 * Subclasses implement coordinate-system-specific layout logic
 */
class LayoutEngine {
    constructor(styleHandler, options = {}) {
        if (new.target === LayoutEngine) {
            throw new Error('LayoutEngine is abstract - cannot instantiate directly');
        }

        this.styleHandler = styleHandler;
        this.options = options;
    }

    /**
     * Calculate layout for all nodes and edges
     *
     * @param {Map<string, Node>} nodes - Map of node name to node object
     * @param {Array<Edge>} edges - Array of edge objects
     * @returns {{ nodes: Map, edges: Array }} - Nodes and edges with layout info added
     * @abstract
     */
    calculateLayout(nodes, edges) {
        throw new Error('calculateLayout() must be implemented by subclass');
    }
}

module.exports = LayoutEngine;
