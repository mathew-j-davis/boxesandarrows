const Renderer = require('./base');
const { Point2D, Direction, Box } = require('../geometry/basic-points');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class LatexRenderer extends Renderer {
    constructor(style, options = {}) {
        super(style);
        this.style = style || {};
        this.scale = options.scale || 1;
        this.useColor = options.useColor ?? true;

        this.content = [];
        this.usedColors = new Map(); // Keep track of used colors and their names

            // Load the default edge style
            this.defaultEdgeStyle = style.edge?.default || {};
            
        this.verbose = options.verbose || false;
        this.log = this.verbose ? console.log.bind(console) : () => {};
    }

    // Core rendering methods
    renderNode(node) {
        const pos = `(${node.x},${node.y})`;
        const nodeStyle = this.getNodeStyle(node);
        const styleStr = this.tikzifyStyle(nodeStyle);
        
        // Generate unique node ID for referencing using node.name
        const nodeId = `node_${node.name.replace(/\W/g, '_')}`;
        
        let output = '';
        if (node.hideLabel) {
            output += `\\node[${styleStr}] (${nodeId}) at ${pos} {};`;
        } else {
            let labelText = this.escapeLaTeX(node.label);
            if (node.textcolor) {
                const textColor = this.getColor(node.textcolor);
                labelText = `\\textcolor{${textColor}}{${labelText}}`;
            }
            output += `\\node[${styleStr}] (${nodeId}) at ${pos} {${labelText}};`;
        }
        
        this.content.push(output);
    }

    renderEdge(edge, fromNode, toNode) {
        if (!fromNode || !toNode) {
            console.warn(`Edge from '${edge.from_name}' to '${edge.to_name}' cannot be rendered because one of the nodes is missing.`);
            return;
        }

        // Generate unique node IDs
        const fromNodeId = `node_${fromNode.name.replace(/\W/g, '_')}`;
        const toNodeId = `node_${toNode.name.replace(/\W/g, '_')}`;

        // Build style options dynamically from default edge styles
        const styleOptions = new Map();
        
        // 1. Start with default edge styles from style-latex.json
        const defaultEdgeStyle = this.style.edge_styles?.default || {};
        Object.entries(defaultEdgeStyle).forEach(([key, value]) => {
            styleOptions.set(key, value);
        });

        // 2. Add any edge-specific styles from edge.style
        if (edge.style) {
            if (typeof edge.style === 'string') {
                // Handle simple string styles like 'dotted'
                if (['dotted', 'dashed', 'solid'].includes(edge.style)) {
                    styleOptions.set(edge.style, true);
                } else {
                    // Parse semicolon-separated styles
                    edge.style.split(';').forEach(stylePair => {
                        const [key, value] = stylePair.split('=').map(s => s.trim());
                        if (key) {
                            styleOptions.set(key, value || true);
                        }
                    });
                }
            } else if (typeof edge.style === 'object') {
                // Handle object-style definitions
                Object.entries(edge.style).forEach(([key, value]) => {
                    styleOptions.set(key, value);
                });
            }
        }

        // 3. Add edge color if specified
        if (edge.color) {
            styleOptions.set('draw', this.getColor(edge.color));
        }

        // 4. Convert style options to TikZ format
        const styleStr = Array.from(styleOptions.entries())
            .map(([key, value]) => value === true ? key : `${key}=${value}`)
            .join(',');

        // Build the path including waypoints
        const pathPoints = [this.getNodeAnchor(fromNodeId, edge.start_direction)];

        // Include waypoints if any
        if (edge.waypoints && edge.waypoints.length > 0) {
            edge.waypoints.forEach((wp) => {
                pathPoints.push(`(${wp.x},${wp.y})`);
            });
        }

        pathPoints.push(this.getNodeAnchor(toNodeId, edge.end_direction));

        // Build the draw command
        let drawCommand = `\\draw[${styleStr}] ${pathPoints[0]}`;

        // Build the path with labels
        for (let i = 1; i < pathPoints.length; i++) {
            drawCommand += ` -- ${pathPoints[i]}`;
        }

        // Add labels if present
        const labels = this.getLabelsForSegment(edge, 1, pathPoints.length);
        if (labels.length > 0) {
            labels.forEach(label => {
                drawCommand += ` node[${label.justify}, pos=${label.position}] {${this.escapeLaTeX(label.text)}}`;
            });
        }

        drawCommand += ';';
        this.content.push(drawCommand);
    }

    generateTikzOptions(styleObj) {
        const options = [];
 
        for (const [key, value] of Object.entries(styleObj)) {
            // Direct mapping of style keys to TikZ options
            options.push(`${key}=${value}`);
        }
 
        return options.join(', ');
    }
    
    calculateControlPoint(node, direction, controlLength) {
        if (!direction || !controlLength) {
            return new Point2D(node.x, node.y);
        }

        const directionVector = Direction.getVector(direction);
        return new Point2D(
            node.x + (directionVector.x * controlLength),
            node.y + (directionVector.y * controlLength)
        );
    }

    // Document structure
    beforeRender() {
        // Update the preamble to include default styles
        return `\\begin{tikzpicture}[
    > = stealth,
    every node/.style={
        draw,
        align=center
    }
]
`;
    }

    afterRender() {
        return '\\end{tikzpicture}';
    }

    // Helper methods
    escapeLaTeX(text) {
        if (!text) return '';
        
        // Basic LaTeX special character escaping
        return text
            .replace(/\\/g, '\\textbackslash{}')
            .replace(/[&%$#_{}~^]/g, '\\$&')
            .replace(/\[/g, '{[}')
            .replace(/\]/g, '{]}');
    }

    getNodeStyle(node) {
        const nodeStyles = this.style.node_styles || {};
        const defaultStyle = nodeStyles.default || {};
        const typeStyle = nodeStyles[node.type] || {};
        const sizeStyle = {};

        // If node has custom height and width, add them to the style
        if (node.h !== undefined) {
            sizeStyle['minimum height'] = `${node.h}cm`; // Adjust units if necessary
        }
        if (node.w !== undefined) {
            sizeStyle['minimum width'] = `${node.w}cm`;
        }

        // Apply custom colors
        const colorStyle = {};
        if (node.fillcolor) {
            if (node.fillcolor.startsWith('#')) {
                const colorName = this.defineHexColor(node.fillcolor);
                colorStyle['fill'] = colorName;
            } else {
                colorStyle['fill'] = node.fillcolor;
            }
        }
        if (node.color) {
            if (node.color.startsWith('#')) {
                const colorName = this.defineHexColor(node.color);
                colorStyle['draw'] = colorName;
            } else {
                colorStyle['draw'] = node.color;
            }
        }

        return { ...defaultStyle, ...typeStyle, ...sizeStyle, ...colorStyle, ...node.style };
    }

    tikzifyStyle(style) {
        const styleProps = [];
        
        // Convert style properties to TikZ format
        for (const [key, value] of Object.entries(style)) {
            switch (key) {
                case 'shape':
                    styleProps.push(value);
                    break;
                case 'fill':
                    if (this.useColor) styleProps.push(`fill=${value}`);
                    break;
                case 'draw':
                    styleProps.push(`draw=${value}`);
                    break;
                case 'minimum width':
                case 'minimum height':
                case 'minimum size':
                    styleProps.push(`${key}=${value}`);
                    break;
                case 'line width':
                    styleProps.push(`line width=${value}`);
                    break;
                case 'rounded corners':
                    if (value !== '0pt') styleProps.push(`rounded corners=${value}`);
                    break;
                case 'aspect':
                    styleProps.push(`aspect=${value}`);
                    break;
                // Add more style conversions as needed
            }
        }

        return styleProps.join(', ');
    }

    getLatexContent() {
        // Generate color definitions for hex colors
        const colorDefinitions = Array.from(this.usedColors.entries()).map(([hexCode, colorName]) => {
            return `\\definecolor{${colorName}}{HTML}{${hexCode.slice(1)}}`;
        }).join('\n');

        const preamble = `
\\documentclass{standalone}
\\usepackage{tikz}
\\usetikzlibrary{arrows.meta,calc,decorations.pathmorphing}
\\usepackage{xcolor}
${colorDefinitions}
\\begin{document}
\\begin{tikzpicture}
    [>={Stealth[scale=1.0]},  % Uniform arrow style
    ]
    `;
        const body = this.content.join('\n');
        const closing = `
\\end{tikzpicture}
\\end{document}
`;
        return `${preamble}\n${body}\n${closing}`;
    }

    async compileToPdf(texFilePath) {
        const texDir = path.dirname(texFilePath);
        const texFileName = path.basename(texFilePath);

        return new Promise((resolve, reject) => {
            exec(`pdflatex -output-directory=${texDir} ${texFileName}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error compiling LaTeX: ${error.message}`);
                    reject(error);
                } else {
                    console.log('pdflatex output:', stdout);
                    resolve();
                }
            });
        });
    }

    defineHexColor(hexCode) {
        // Generate a color name by removing '#' and prefixing with 'color'
        const colorName = 'color' + hexCode.slice(1);
        if (!this.usedColors.has(hexCode)) {
            this.usedColors.set(hexCode, colorName);
        }
        return colorName;
    }

    getColor(colorValue) {
        if (colorValue.startsWith('#')) {
            const colorName = this.defineHexColor(colorValue);
            return colorName;
        } else {
            return colorValue;
        }
    }

    // Helper method to get node anchor point
    getNodeAnchor(nodeId, direction) {
        if (direction) {
            if (direction === 'c') {
                return `(${nodeId}.center)`;
            } else if (this.isCompassDirection(direction)) {
                return `(${nodeId}.${this.translateDirection(direction)})`;
            } else if (!isNaN(parseFloat(direction))) {
                // Angle in degrees (requires TikZ calc library)
                const angle = parseFloat(direction);
                return `({${nodeId}.\${${angle}}})`;
            } else {
                this.log(`Unknown direction '${direction}' for node '${nodeId}', defaulting to center.`);
                return `(${nodeId}.center)`;
            }
        } else {
            // Default to node border in the direction towards the other node
            return `(${nodeId})`;
        }
    }

    // Helper method to check if direction is a compass point
    isCompassDirection(direction) {
        const compassDirections = [
            'north', 'south', 'east', 'west',
            'north east', 'north west', 'south east', 'south west',
            'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'
        ];
        return compassDirections.includes(direction.toLowerCase());
    }

    // Helper method to translate shorthand directions to TikZ anchors
    translateDirection(direction) {
        const directionMap = {
            n: 'north',
            s: 'south',
            e: 'east',
            w: 'west',
            ne: 'north east',
            nw: 'north west',
            se: 'south east',
            sw: 'south west'
        };
        return directionMap[direction.toLowerCase()] || direction.toLowerCase();
    }

    // Helper method to build a curved path
    buildCurvedPath(pathPoints) {
        let path = '';
        for (let i = 0; i < pathPoints.length - 1; i++) {
            const from = pathPoints[i];
            const to = pathPoints[i + 1];
            // Use smooth curve between points
            path += `${from} .. controls `;
            // Calculate control points
            path += `(${from} ..!50! ${to}) and (${from} ..!50! ${to}) .. `;
            path += `${to} `;
        }
        return path;
    }

    // Helper method to build labels along the edge
    buildEdgeLabels(edge, pathPoints) {
        let labelOutput = '';
        const numSegments = pathPoints.length - 1;

        // Calculate segment lengths for accurate positioning
        const segmentLengths = [];
        let totalLength = 0;
        for (let i = 0; i < numSegments; i++) {
            const from = this.parsePoint(pathPoints[i]);
            const to = this.parsePoint(pathPoints[i + 1]);
            const length = this.calculateDistance(from, to);
            segmentLengths.push(length);
            totalLength += length;
        }

        // Helper function to calculate absolute position along the path
        const getPositionAlongPath = (segmentIndex, positionInSegment) => {
            const cumulativeLength = segmentLengths.slice(0, segmentIndex).reduce((acc, len) => acc + len, 0);
            const segmentLength = segmentLengths[segmentIndex];
            const pos = (cumulativeLength + positionInSegment * segmentLength) / totalLength;
            return Math.min(Math.max(pos, 0), 1); // Clamp between 0 and 1
        };

        // Function to add a label node
        const addLabelNode = (pos, labelText, justify) => {
            return ` node[${justify}, pos=${pos}] {${this.escapeLaTeX(labelText)}}`;
        };

        // Start Label
        if (edge.start_label) {
            const segmentIndex = edge.start_label_segment !== undefined ? edge.start_label_segment - 1 : 0; // Default to first segment
            const segmentPos = edge.start_label_position !== undefined ? parseFloat(edge.start_label_position) : 0.1; // Default to 0.1
            const index = segmentIndex < 0 ? numSegments + segmentIndex : segmentIndex;

            if (index >= 0 && index < numSegments) {
                const pos = getPositionAlongPath(index, segmentPos);
                labelOutput += addLabelNode(pos, edge.start_label, edge.label_justify || 'above');
            } else {
                console.warn(`Invalid start_label_segment for edge from '${edge.from_name}' to '${edge.to_name}'`);
            }
        }

        // End Label
        if (edge.end_label) {
            const segmentIndex = edge.end_label_segment !== undefined ? edge.end_label_segment - 1 : numSegments - 1; // Default to last segment
            const segmentPos = edge.end_label_position !== undefined ? parseFloat(edge.end_label_position) : 0.9; // Default to 0.9
            const index = segmentIndex < 0 ? numSegments + segmentIndex : segmentIndex;

            if (index >= 0 && index < numSegments) {
                const pos = getPositionAlongPath(index, segmentPos);
                labelOutput += addLabelNode(pos, edge.end_label, edge.label_justify || 'above');
            } else {
                console.warn(`Invalid end_label_segment for edge from '${edge.from_name}' to '${edge.to_name}'`);
            }
        }

        // Main Label
        if (edge.label) {
            let defaultSegmentNumber;
            if (numSegments % 2 === 1) {
                // Odd number of segments, middle segment
                defaultSegmentNumber = Math.ceil(numSegments / 2);
            } else {
                // Even number of segments, one after the middle
                defaultSegmentNumber = (numSegments / 2) + 1;
            }

            const labelSegment = edge.label_segment !== undefined ? parseInt(edge.label_segment) : defaultSegmentNumber;

            if (labelSegment === segmentNumber) {
                const position = edge.label_position !== undefined ? parseFloat(edge.label_position) :
                    (totalSegments % 2 === 1 ? 0.5 : 0.0);
                labels.push({
                    text: edge.label,
                    position: position,
                    justify: edge.label_justify || 'above'
                });
            }
        }

        return labelOutput;
    }

    getLabelsForSegment(edge, segmentNumber, totalSegments) {
        const labels = [];

        // Start Label
        let startLabelSegment = edge.start_label_segment !== undefined ? parseInt(edge.start_label_segment) : 1; // Default to first segment
        if (startLabelSegment < 0) {
            startLabelSegment = totalSegments + startLabelSegment + 1; // Adjust for negative indices
        }
        if (edge.start_label && startLabelSegment === segmentNumber) {
            const position = edge.start_label_position !== undefined ? parseFloat(edge.start_label_position) : 0.1;
            labels.push({
                text: edge.start_label,
                position: position,
                justify: edge.label_justify || 'above'
            });
        }

        // End Label
        let endLabelSegment = edge.end_label_segment !== undefined ? parseInt(edge.end_label_segment) : totalSegments; // Default to last segment
        if (endLabelSegment < 0) {
            endLabelSegment = totalSegments + endLabelSegment + 1; // Adjust for negative indices
        }
        if (edge.end_label && endLabelSegment === segmentNumber) {
            const position = edge.end_label_position !== undefined ? parseFloat(edge.end_label_position) : 0.9;
            labels.push({
                text: edge.end_label,
                position: position,
                justify: edge.label_justify || 'above'
            });
        }

        // Main Label
        let defaultLabelSegment;
        if (totalSegments % 2 === 1) {
            // Odd number of segments, middle segment
            defaultLabelSegment = Math.ceil(totalSegments / 2);
        } else {
            // Even number of segments, one after the middle
            defaultLabelSegment = Math.floor(totalSegments / 2) + 1;
        }
        let labelSegment = edge.label_segment !== undefined ? parseInt(edge.label_segment) : defaultLabelSegment;
        if (labelSegment < 0) {
            labelSegment = totalSegments + labelSegment + 1; // Adjust for negative indices
        }
        if (edge.label && labelSegment === segmentNumber) {
            const position = edge.label_position !== undefined ? parseFloat(edge.label_position) :
                (totalSegments % 2 === 1 ? 0.5 : 0.0);
            labels.push({
                text: edge.label,
                position: position,
                justify: edge.label_justify || 'above'
            });
        }

        return labels;
    }

    // Helper method to parse a point string into coordinates
    parsePoint(pointStr) {
        // Remove parentheses and split by comma
        const coords = pointStr.replace(/[()]/g, '').split(',');
        const x = parseFloat(coords[0]);
        const y = parseFloat(coords[1]);
        return { x, y };
    }

    // Helper method to calculate distance between two points
    calculateDistance(pointA, pointB) {
        const dx = pointB.x - pointA.x;
        const dy = pointB.y - pointA.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

module.exports = LatexRenderer; 