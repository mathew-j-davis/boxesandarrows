/**
 * Abstract base class for renderers
 * Subclasses compose with a LayoutEngine and implement output generation
 */
class RendererBase {
    constructor(layoutEngine, styleHandler, options = {}) {
        if (new.target === RendererBase) {
            throw new Error('RendererBase is abstract - cannot instantiate directly');
        }

        this.layoutEngine = layoutEngine;
        this.styleHandler = styleHandler;
        this.options = options;
        this.nodes = null;
        this.edges = null;
        this.outputPath = null;
    }

    /**
     * Main entry point for rendering
     *
     * @param {Map<string, Node>} nodes - Map of node name to node object
     * @param {Array<Edge>} edges - Array of edge objects
     * @param {string} outputPath - Path to write output file
     */
    render(nodes, edges, outputPath) {
        this.nodes = nodes;
        this.edges = edges;
        this.outputPath = outputPath;

        // Phase 1: Calculate layout using injected engine
        this.layoutEngine.calculateLayout(nodes, edges);

        // Phase 2: Generate output (subclass-specific)
        this.generateOutput();
    }

    /**
     * Generate output in target format
     * MUST be implemented by subclass
     *
     * @abstract
     */
    generateOutput() {
        throw new Error('generateOutput() must be implemented by subclass');
    }

    /**
     * Write output to file
     * Can be overridden by subclasses with different write logic
     */
    writeOutput(content) {
        const fs = require('fs');
        fs.writeFileSync(this.outputPath, content, 'utf8');
    }
}

module.exports = RendererBase;
