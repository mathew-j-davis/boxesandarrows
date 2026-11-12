const RendererBase = require('./renderer-base');
const VectorLayoutEngine = require('../layout/vector-layout-engine');
const SvgStyleHandler = require('../styles/svg-style-handler');
const { BoundingBox } = require('../geometry/bounding-box');
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

        // Set Y-axis direction for SVG BEFORE layout calculation
        // SVG uses screen coordinates (down=+), unlike LaTeX which uses math coordinates (up=+)
        this.layoutEngine.yAxisDirection = -1;

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

        // Get scale config early (needed for edge bounds calculation)
        const scale = this.layoutEngine.scaleConfig || { position: { x: 1, y: 1 } };

        // Calculate bounding box manually for SVG (accounting for screen Y-axis)
        // Can't use BoundingBox.fromNodes() because it assumes mathematical Y-axis (LaTeX)
        let left = Infinity;
        let bottom = Infinity;  // smallest Y (topmost visually)
        let right = -Infinity;
        let top = -Infinity;    // largest Y (bottommost visually)

        for (const node of nodesArray) {
            const width = node.dimensions.widthScaled;
            const height = node.dimensions.heightScaled;
            const anchorVector = node.anchorVector || { x: 0, y: 0 };

            // Calculate node bounds using SVG coordinate system (flipped Y)
            const nodeLeft = node.position.xScaled - (anchorVector.x + 1) * width / 2;
            const nodeTop = node.position.yScaled - (-anchorVector.y + 1) * height / 2;
            const nodeRight = nodeLeft + width;
            const nodeBottom = nodeTop + height;

            left = Math.min(left, nodeLeft);
            right = Math.max(right, nodeRight);
            bottom = Math.min(bottom, nodeTop);  // top edge is minimum Y
            top = Math.max(top, nodeBottom);     // bottom edge is maximum Y

            // Account for external labels
            if (node.label_above) {
                const labelY = nodeTop - 10;
                bottom = Math.min(bottom, labelY);
            }
            if (node.label_below) {
                const labelY = nodeBottom + 20;
                top = Math.max(top, labelY);
            }
        }

        // Include edges in bounding box
        for (const edge of edges) {
            if (edge.start && edge.end) {
                // Edge start/end are in unscaled coordinates, need to scale them
                const x1 = edge.start.x * scale.position.x;
                const y1 = edge.start.y * scale.position.y;
                const x2 = edge.end.x * scale.position.x;
                const y2 = edge.end.y * scale.position.y;

                left = Math.min(left, x1, x2);
                right = Math.max(right, x1, x2);
                bottom = Math.min(bottom, y1, y2);
                top = Math.max(top, y1, y2);
            }
        }

        const bbox = new BoundingBox(left, bottom, right, top);

        // Get page properties
        const page = this.styleHandler.getPage();

        // Get margins from page config (default 1 unit)
        const marginW = parseFloat(page.margin?.w) || 1;
        const marginH = parseFloat(page.margin?.h) || 1;

        // Scale margins to pixels
        const marginXPx = marginW * parseFloat(scale.position.x);
        const marginYPx = marginH * parseFloat(scale.position.y);

        // Add margin to bounding box
        // viewBox x,y = minimum coordinate - margin (provides padding around all content)
        let viewBoxX = bbox.left - marginXPx;
        let viewBoxY = bbox.bottom - marginYPx;
        const width = bbox.right - bbox.left + (2 * marginXPx);
        const height = bbox.top - bbox.bottom + (2 * marginYPx);

        // Check if we should normalize to positive space (default: true)
        const normalizeViewBox = page.normalize_viewbox !== false;
        let offsetX = 0;
        let offsetY = 0;

        if (normalizeViewBox && (viewBoxX < 0 || viewBoxY < 0)) {
            // Calculate offsets to shift everything to positive space
            offsetX = viewBoxX < 0 ? -viewBoxX : 0;
            offsetY = viewBoxY < 0 ? -viewBoxY : 0;
            viewBoxX = 0;
            viewBoxY = 0;
        }

        // Calculate font size based on scale
        const baseFontSize = Math.max(8, scale.position.x * 0.4);
        const svgDefs = page.svg_definitions || page['svg-definitions'] || '';
        const customStyles = page.svg_styles || page['svg-styles'] || page.css_styles || page['css-styles'] || '';
        const backgroundColor = options.backgroundColor || page.background;

        // SVG header
        let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}"
     height="${height}"
     viewBox="${viewBoxX} ${viewBoxY} ${width} ${height}">
  <defs>
    <style type="text/css">
      text { font-family: sans-serif; font-size: ${baseFontSize}px; }
      .node-text { text-anchor: middle; dominant-baseline: middle; }
${customStyles}
    </style>
${svgDefs}
  </defs>
  <g id="diagram">
`;

        // Add background if specified
        if (backgroundColor) {
            const bgX = normalizeViewBox ? offsetX + (bbox.left - marginXPx) : viewBoxX;
            const bgY = normalizeViewBox ? offsetY + (bbox.bottom - marginYPx) : viewBoxY;
            svg += `    <!-- Background -->
    <rect x="${bgX}" y="${bgY}" width="${width}" height="${height}" fill="${backgroundColor}" />
`;
        }

        // Add transform group if normalizing to positive space
        if (normalizeViewBox && (offsetX !== 0 || offsetY !== 0)) {
            svg += `    <g transform="translate(${offsetX}, ${offsetY})">
`;
        }

        // Draw nodes first (so edges appear on top)
        nodesArray.forEach(node => {
            svg += this.drawNode(node);
        });

        // Draw edges (so they appear in front of nodes)
        edges.forEach(edge => {
            svg += this.drawEdge(edge, nodes);
        });

        // Add custom SVG overlays (e.g., group titles)
        const svgOverlays = page.svg_overlays || page['svg-overlays'] || '';
        if (svgOverlays) {
            svg += svgOverlays;
        }

        // Close transform group if it was opened
        if (normalizeViewBox && (offsetX !== 0 || offsetY !== 0)) {
            svg += `    </g>
`;
        }

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
        const y = node.position.yScaled;
        const width = node.dimensions.widthScaled;
        const height = node.dimensions.heightScaled;

        // Calculate top-left corner (node position is at anchor point)
        // Note: anchorVector uses math Y-axis (north=+1), but SVG uses screen Y (down=+1)
        // So we need to flip the Y component: use -anchorVector.y for SVG
        const anchorVector = node.anchorVector || { x: 0, y: 0 };
        const left = x - (anchorVector.x + 1) * width / 2;
        const top = y - (-anchorVector.y + 1) * height / 2;  // Flip Y for screen coordinates

        // Initialize SVG attributes object - this will hold all the styling
        const node_svg = {};
        const nodeProperties = node._dynamicProperties || [];

        // 1. Start with base style from style handler (if it exists)
        let style = this.styleHandler.getStyleBranchAndModify(node.style, 'node.object', nodeProperties);

        if (style && style.svg) {
            // Copy base style attributes
            Object.assign(node_svg, style.svg);
        }

        // 2. Apply node-specific attributes from CSV (these override style)
        if (node.shape) {
            node_svg.shape = node.shape;
        }
        if (node.rx !== undefined) {
            node_svg.rx = node.rx;
        }
        if (node.ry !== undefined) {
            node_svg.ry = node.ry;
        }
        if (node.fill_color) {
            node_svg.fill = node.fill_color;
        }
        if (node.edge_color) {
            node_svg.stroke = node.edge_color;
        }
        if (node.stroke_width !== undefined || node['stroke-width'] !== undefined) {
            node_svg['stroke-width'] = node.stroke_width || node['stroke-width'];
        }

        // 3. Extract final values with defaults
        const useCssClass = node.css_class || node['class'];
        const shape = node_svg.shape || 'rectangle';
        const fill = useCssClass ? 'none' : (node_svg.fill || '#ffffff');
        const stroke = useCssClass ? 'none' : (node_svg.stroke || '#000000');
        const strokeWidth = useCssClass ? 0 : (node_svg['stroke-width'] || 1);
        const cornerRx = node_svg.rx || 8;
        const cornerRy = node_svg.ry || 8;

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
                    fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" rx="${cornerRx}" ry="${cornerRy}" />`;
                break;
        }

        // Calculate center of shape (for labels, always use center regardless of anchor)
        const centerX = left + width / 2;
        const centerY = top + height / 2;

        // Build label SVGs
        let labelsSvg = '';

        // Main label (unless hidden)
        if (node.hide_label !== true) {
            const label = node.label || node.name || '';

            // Get label style from style system
            const labelStyle = this.styleHandler.getStyleBranchAndModify(node.style, 'node.label', nodeProperties);
            const labelSvg = labelStyle.svg || {};

            // Priority: node CSV -> style system -> default
            const textColor = node.textcolor || node.text_color || labelSvg.fill || '#000000';
            const fontSize = node.font_size || node['font-size'];
            const fontWeight = node.font_weight || node['font-weight'];
            const fontFamily = node.font_family || node['font-family'];

            let styleAttr = `class="node-text node-label" fill="${textColor}"`;
            if (fontSize) styleAttr += ` font-size="${fontSize}"`;
            if (fontWeight) styleAttr += ` font-weight="${fontWeight}"`;
            if (fontFamily) styleAttr += ` font-family="${fontFamily}"`;

            labelsSvg += `<text x="${centerX}" y="${centerY}" ${styleAttr}>${this.escapeXml(label)}</text>`;
        }

        // External labels (label_above and label_below)
        if (node.label_above) {
            // Get label_above style from style system
            const labelAboveStyle = this.styleHandler.getStyleBranchAndModify(node.style, 'node.label_above', nodeProperties);
            const labelAboveSvg = labelAboveStyle.svg || {};

            const textColor = node.textcolor || node.text_color || labelAboveSvg.fill || '#000000';
            const labelY = top - 10; // Position above the node
            labelsSvg += `\n      <text x="${centerX}" y="${labelY}" class="node-text label-above" text-anchor="middle" fill="${textColor}">${this.escapeXml(node.label_above)}</text>`;
        }

        if (node.label_below) {
            // Get label_below style from style system
            const labelBelowStyle = this.styleHandler.getStyleBranchAndModify(node.style, 'node.label_below', nodeProperties);
            const labelBelowSvg = labelBelowStyle.svg || {};

            const textColor = node.textcolor || node.text_color || labelBelowSvg.fill || '#000000';
            const labelY = top + height + 20; // Position below the node
            labelsSvg += `\n      <text x="${centerX}" y="${labelY}" class="node-text label-below" text-anchor="middle" fill="${textColor}">${this.escapeXml(node.label_below)}</text>`;
        }

        const cssClass = useCssClass ? ` class="${useCssClass}"` : '';
        return `    <!-- Node: ${node.name} -->
    <g id="node-${node.name}"${cssClass}>
      ${shapeSvg}
      ${labelsSvg}
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

        // Get scale for proper coordinate scaling
        const scale = this.layoutEngine.scaleConfig || { position: { x: 1, y: 1 } };

        // Edge start/end are in unscaled coordinates, need to scale them
        const x1 = edge.start.x * scale.position.x;
        const y1 = edge.start.y * scale.position.y; // Keep Y positive
        const x2 = edge.end.x * scale.position.x;
        const y2 = edge.end.y * scale.position.y;   // Keep Y positive

        // Initialize SVG attributes object - this will hold all the styling
        const edge_svg = {};
        const edgeProperties = edge._dynamicProperties || [];

        // 1. Start with base style from style handler (if it exists)
        let style = this.styleHandler.getStyleBranchAndModify(edge.style, 'edge.object', edgeProperties);

        if (style && style.svg) {
            // Copy base style attributes
            Object.assign(edge_svg, style.svg);
        }

        // 2. Apply edge-specific attributes from CSV (these override style)
        if (edge.color) {
            edge_svg.stroke = edge.color;
        }
        if (edge.stroke_width !== undefined || edge['stroke-width'] !== undefined) {
            edge_svg['stroke-width'] = edge.stroke_width || edge['stroke-width'];
        }

        // 3. Extract final values with defaults
        const stroke = edge_svg.stroke || '#000000';
        const strokeWidth = edge_svg['stroke-width'] || 1;

        // Add arrowhead by default (can be disabled with arrow: false)
        const hasArrow = edge.arrow !== false;
        const markerEnd = hasArrow ? ' marker-end="url(#arrowhead)"' : '';

        let pathSvg;

        // Check if edge has waypoints for bezier curves
        if (edge.waypoints && edge.waypoints.length > 0) {
            // Build SVG path with bezier curves
            let pathData = `M ${x1},${y1}`;
            let reachedEnd = false;

            let i = 0;
            while (i < edge.waypoints.length) {
                const wp = edge.waypoints[i];
                const wpX = wp.x * scale.position.x;
                const wpY = wp.y * scale.position.y;

                if (wp.isControl) {
                    // This is a control point - look for next point
                    if (i + 1 < edge.waypoints.length) {
                        const nextWp = edge.waypoints[i + 1];
                        const nextX = nextWp.x * scale.position.x;
                        const nextY = nextWp.y * scale.position.y;

                        if (nextWp.isControl) {
                            // Two control points: cubic bezier
                            if (i + 2 < edge.waypoints.length) {
                                // More waypoints after these control points
                                const destWp = edge.waypoints[i + 2];
                                const destX = destWp.x * scale.position.x;
                                const destY = destWp.y * scale.position.y;
                                pathData += ` C ${wpX},${wpY} ${nextX},${nextY} ${destX},${destY}`;
                                i += 3;
                            } else {
                                // No more waypoints - curve to end
                                pathData += ` C ${wpX},${wpY} ${nextX},${nextY} ${x2},${y2}`;
                                i += 2;
                                reachedEnd = true;
                            }
                        } else {
                            // One control point: quadratic bezier to next waypoint
                            pathData += ` Q ${wpX},${wpY} ${nextX},${nextY}`;
                            i += 2;
                        }
                    } else {
                        // Single control point to end
                        pathData += ` Q ${wpX},${wpY} ${x2},${y2}`;
                        i++;
                        reachedEnd = true;
                    }
                } else {
                    // Regular waypoint: straight line
                    pathData += ` L ${wpX},${wpY}`;
                    i++;
                }
            }

            // If we haven't reached the end yet, draw line to end
            if (!reachedEnd) {
                pathData += ` L ${x2},${y2}`;
            }

            pathSvg = `<path d="${pathData}" class="edge-path"
                stroke="${stroke}" stroke-width="${strokeWidth}" fill="none"${markerEnd} />`;
        } else {
            // Straight line (no waypoints)
            pathSvg = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="edge-path"
                stroke="${stroke}" stroke-width="${strokeWidth}"${markerEnd} />`;
        }

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
