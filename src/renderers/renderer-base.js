class RendererBase {
    constructor(options = {}) {
        this.verbose = options.verbose || false;
    }

    loadStyle(styleFile) {
        if (!styleFile) {
            return {};
        }
        const fs = require('fs');
        return JSON.parse(fs.readFileSync(styleFile, 'utf8'));
    }

    getScaleConfig(style) {
        throw new Error('getScaleConfig must be implemented by renderer');
    }

    getOutputPath(basePath) {
        throw new Error('getOutputPath must be implemented by renderer');
    }

    render(nodes, edges, outputPath) {
        throw new Error('render must be implemented by renderer');
    }

    getNodeAnchor(node) {
        throw new Error('getNodeAnchor must be implemented by renderer');
    }
}

module.exports = RendererBase;