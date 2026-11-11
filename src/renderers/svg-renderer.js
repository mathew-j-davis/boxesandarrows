const RendererBase = require('./renderer-base');
const VectorLayoutEngine = require('../layout/vector-layout-engine');
const SvgStyleHandler = require('../styles/svg-style-handler');
const fs = require('fs');

/**
 * SVG Renderer using composition with VectorLayoutEngine
 * Generates SVG diagrams from nodes and edges
 */
class SvgRenderer extends RendererBase {
    constructor(options = {}) {
        const styleHandler = new SvgStyleHandler(options);
        const layoutEngine = new VectorLayoutEngine(styleHandler, options);
        super(layoutEngine, styleHandler, options);

        this.verbose = options.verbose || false;
        this.useColor = options.useColor !== false;
        this.log = this.verbose ? console.log.bind(console) : () => {};

        this.outputPath = null;
        this.renderOptions = {};
    }

    /**
     * Render nodes and edges to SVG
     */
    render(nodes, edges, outputPath, options = {}) {
        this.renderOptions = options || {};

        // Call parent render() which will:
        // 1. Call layoutEngine.calculateLayout(nodes, edges)
        // 2. Call this.generateOutput()
        super.render(nodes, edges, outputPath);

        return this.outputPath;
    }

    /**
     * Generate SVG output
     * Called by RendererBase after layout is calculated
     */
    generateOutput() {
        // Generate SVG content (keep nodes as Map for edge drawing)
        const svgContent = this.generateSvg(this.nodes, this.edges, this.renderOptions);

        // Save SVG to file
        const svgFilePath = `${this.outputPath}.svg`;
        fs.writeFileSync(svgFilePath, svgContent, 'utf8');
        this.log(`SVG saved to ${svgFilePath}`);
    }

    /**
     * Generate complete SVG document
     */
    generateSvg(nodes, edges, options = {}) {
        const grid = options.grid || null;

        // Convert nodes to array if it's a Map
        const nodesArray = nodes instanceof Map ? Array.from(nodes.values()) : nodes;

        // Calculate bounding box
        const bbox = this.calculateBoundingBox(nodesArray);

        // Add margin
        const margin = 20;
        const width = bbox.maxX - bbox.minX + (2 * margin);
        const height = bbox.maxY - bbox.minY + (2 * margin);
        const viewBoxX = bbox.minX - margin;
        const viewBoxY = bbox.minY - margin;

        // SVG header
        let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}cm"
     height="${height}cm"
     viewBox="${viewBoxX} ${viewBoxY} ${width} ${height}">
  <defs>
    <style type="text/css">
      text { font-family: sans-serif; font-size: 12px; }
      .node-text { text-anchor: middle; dominant-baseline: middle; }
    </style>
  </defs>
  <g id="diagram">
`;

        // Draw edges first (so they appear behind nodes)
        edges.forEach(edge => {
            svg += this.drawEdge(edge, nodes);
        });

        // Draw nodes
        nodesArray.forEach(node => {
            svg += this.drawNode(node);
        });

        // SVG footer
        svg += `  </g>
</svg>`;

        return svg;
    }

    /**
     * Draw a single node as SVG
     */
    drawNode(node) {
        const x = node.position.xScaled;
        const y = -node.position.yScaled; // SVG Y axis is inverted
        const width = node.dimensions.widthScaled;
        const height = node.dimensions.heightScaled;

        // Calculate top-left corner (node position is at anchor point)
        const anchorVector = node.anchorVector || { x: 0, y: 0 };
        const left = x - (anchorVector.x + 1) * width / 2;
        const top = y - (anchorVector.y + 1) * height / 2;

        // Get node style
        const fill = node.fill_color || '#ffffff';
        const stroke = node.edge_color || '#000000';
        const strokeWidth = 0.02;
        const shape = node.shape || 'rectangle';

        let shapeSvg = '';

        switch (shape) {
            case 'circle':
            case 'ellipse':
                const cx = x;
                const cy = y;
                const rx = width / 2;
                const ry = height / 2;
                shapeSvg = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
                    fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
                break;

            case 'diamond':
                // Diamond as a rotated square
                const points = [
                    `${x},${y - height / 2}`,           // top
                    `${x + width / 2},${y}`,            // right
                    `${x},${y + height / 2}`,           // bottom
                    `${x - width / 2},${y}`             // left
                ].join(' ');
                shapeSvg = `<polygon points="${points}"
                    fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
                break;

            case 'rectangle':
            default:
                shapeSvg = `<rect x="${left}" y="${top}" width="${width}" height="${height}"
                    fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="0.05" />`;
                break;
        }

        // Add label
        const label = node.label || node.name || '';
        const textColor = node.textcolor || '#000000';
        const labelSvg = `<text x="${x}" y="${y}" class="node-text" fill="${textColor}">${this.escapeXml(label)}</text>`;

        return `    <!-- Node: ${node.name} -->
    <g id="node-${node.name}">
      ${shapeSvg}
      ${labelSvg}
    </g>
`;
    }

    /**
     * Draw a single edge as SVG
     */
    drawEdge(edge, nodes) {
        const fromNode = nodes.get(edge.from);
        const toNode = nodes.get(edge.to);

        if (!fromNode || !toNode || !edge.start || !edge.end) {
            return '';
        }

        const x1 = edge.start.x;
        const y1 = -edge.start.y; // Invert Y axis
        const x2 = edge.end.x;
        const y2 = -edge.end.y;   // Invert Y axis

        const stroke = edge.color || '#000000';
        const strokeWidth = 0.02;

        let pathSvg = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
            stroke="${stroke}" stroke-width="${strokeWidth}" />`;

        // Add label if present
        let labelSvg = '';
        if (edge.label) {
            const labelX = (x1 + x2) / 2;
            const labelY = (y1 + y2) / 2;
            labelSvg = `<text x="${labelX}" y="${labelY}" class="edge-label" fill="${stroke}">${this.escapeXml(edge.label)}</text>`;
        }

        return `    <!-- Edge: ${edge.from} -> ${edge.to} -->
    <g id="edge-${edge.from}-${edge.to}">
      ${pathSvg}
      ${labelSvg}
    </g>
`;
    }

    /**
     * Calculate bounding box for all nodes
     */
    calculateBoundingBox(nodes) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            const x = node.position.xScaled;
            const y = node.position.yScaled;
            const w = node.dimensions.widthScaled;
            const h = node.dimensions.heightScaled;

            minX = Math.min(minX, x - w / 2);
            maxX = Math.max(maxX, x + w / 2);
            minY = Math.min(minY, y - h / 2);
            maxY = Math.max(maxY, y + h / 2);
        });

        return { minX, minY, maxX, maxY };
    }

    /**
     * Escape XML special characters
     */
    escapeXml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}

module.exports = SvgRenderer;
