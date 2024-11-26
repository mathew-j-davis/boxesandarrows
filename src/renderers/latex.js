const Renderer = require('./base');
const { Point2D } = require('../geometry/basic-points');
const { Direction } = require('../geometry/direction');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class LatexRenderer extends Renderer {
    constructor(style, options = {}) {
        super(style);
        this.initializeState(style, options);
    }

    initializeState(style, options = {}) {
        this.style = style || {};
        this.useColor = options.useColor ?? true;
        this.content = [];
        this.usedColors = new Map();
        this.defaultNodeStyle = style.node?.default?.node || {};
        this.defaultEdgeStyle = style.edge?.default?.edge || {};
        this.defaultNodeTextFlags = style.node_text_flags?.default || {};
        this.defaultEdgeTextFlags = style.edge_text_flags?.default || {};
        this.defaultEdgeStartTextFlags = style.edge_start_text_flags?.default || {};
        this.defaultEdgeEndTextFlags = style.edge_end_text_flags?.default || {};
        this.verbose = options.verbose || false;
        this.log = this.verbose ? console.log.bind(console) : () => {};
        this.margin = {
            h: style.margin?.h || 1,
            w: style.margin?.w || 1
        };
        this.bounds = {
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity
        };
    }

    async render(nodes, edges, outputPath) {
        // Reset all state to initial values
        this.initializeState(this.style, { 
            verbose: this.verbose, 
            useColor: this.useColor 
        });

        // Render all nodes
        nodes.forEach(node => this.renderNode(node));

        // Render all edges
        edges.forEach(edge => this.renderEdge(edge));

        // Generate the complete LaTeX content
        const latexContent = this.getLatexContent();

        // Save the LaTeX content to a .tex file
        const texFilePath = `${outputPath}.tex`;
        fs.writeFileSync(texFilePath, latexContent, 'utf8');
        this.log(`LaTeX source saved to ${texFilePath}`);

        // Compile the .tex file to a .pdf file
        await this.compileToPdf(texFilePath, { verbose: this.verbose });
        this.log(`PDF generated at ${outputPath}.pdf`);
    }
    updateBounds(x, y) {
        this.bounds.minX = Math.min(this.bounds.minX, x);
        this.bounds.minY = Math.min(this.bounds.minY, y);
        this.bounds.maxX = Math.max(this.bounds.maxX, x);
        this.bounds.maxY = Math.max(this.bounds.maxY, y);
    }

    // Core rendering methods
    renderNode(node) {
        const pos = `(${node.x},${node.y})`;

        this.updateNodeBounds(node);
        
        const nodeStyle = this.getNodeStyle(node);
        let styleStr = this.tikzifyStyle(nodeStyle);

        // Generate unique node ID for referencing using node.name
        const nodeId = `node_${node.name.replace(/\W/g, '_')}`;

        let output = '';
        if (node.hideLabel) {
            output += `\\node[${styleStr}] (${nodeId}) at ${pos} {};`;
        } else {
            let labelText = node.label;
            if (node.textcolor) {
                const textColor = this.getColor(node.textcolor);
                labelText = `\\textcolor{${textColor}}{${labelText}}`;
            }
            // Add adjustbox to constrain label size while maintaining node size
            // const labelWithAdjustbox = `{\\adjustbox{max width=${node.width}cm, max height=${node.height}cm}{${node.label}}}`;
            const labelWithAdjustbox = `{\\adjustbox{max width=${node.width}cm, max height=${node.height}cm}{${labelText}}}`;


            // Label styles
            let label_above = '';

            if (node.label_above) {
                if (styleStr.length > 0) {
                    label_above += ',';
                }
                label_above +=  `label=above:{${this.escapeLaTeX(node.label_above)}}`
                styleStr += label_above;
            }

            let label_below = '';
            if (node.label_below) {
                if (styleStr.length > 0) {
                    label_below += ',';
                }
                label_below += `label=below:{${this.escapeLaTeX(node.label_below)}}`; // Separate label for below
                styleStr += label_below;
            }

            output += `\\node[${styleStr}] (${nodeId}) at ${pos} ${labelWithAdjustbox};`;


            //{label_above}${label_below};
        }

        this.content.push(output);
    }

    renderEdge(edge) {

        // Track edge bounds
        this.updateBounds(edge.start.x, edge.start.y);
        this.updateBounds(edge.end.x, edge.end.y);

        // Track waypoint bounds
        if (edge.waypoints) {
            edge.waypoints.forEach(wp => {
                this.updateBounds(wp.x, wp.y);
            });
        }

        // Get edge style options
        const styleOptions = this.getEdgeStyle(edge);

        // Convert style options to TikZ format
        const styleStr = this.tikzifyStyle(styleOptions);

        // Build the draw command
        let drawCommand = `\\draw[${styleStr}] (${edge.start.x},${edge.start.y})`;

        // Track actual segments (excluding control points)

        // const startPoint = `(${edge.start.x},${edge.start.y})`;
        // const endPoint = `(${edge.end.x},${edge.end.y})`;

        let segmentIndex = 0;



        // Calculate total number of real segments
        const realPointsInWaypoints = edge.waypoints
            ? edge.waypoints.filter(wp => !wp.isControl)
            : [];

        const totalSegments = realPointsInWaypoints.length + 1; // +1 for the final segment to end point



        console.log('Edge waypoints:', edge.waypoints);
        console.log('Real points in waypoints:', realPointsInWaypoints);
        console.log('Total segments:', totalSegments);

        console.log('draw command', drawCommand);

        let currentSegmentTail = '';

        if (edge.waypoints.length === 0) {

            drawCommand += ` -- (${edge.end.x},${edge.end.y})`;

            const labels = this.getLabelsForSegment(edge, 1, totalSegments);
            if (labels.length > 0) {
                labels.forEach(label => {
                    drawCommand += ` node[${label.justify}, pos=${label.position}] {${label.text}}`;
                });
            }
        } else {
            // Process all waypoints
            for (const wp of edge.waypoints) {
                if (wp.isControl) {
                    if (currentSegmentTail.length === 0) {
                        // We found a control point no previous control point in this segment   
                        currentSegmentTail += ` .. controls (${wp.x},${wp.y})`;
                    } else {
                        // We already have a control point in this segment, add this control point
                        currentSegmentTail += ` and (${wp.x},${wp.y})`;
                    }
                } else {
                    if (currentSegmentTail.length === 0) {
                        // We found a real point no previous control point in this segment      
                        currentSegmentTail += ` -- (${wp.x},${wp.y})`;
                    } else {
                        // We already have a control point in this segment, add this real point
                        currentSegmentTail += ` .. (${wp.x},${wp.y})`;
                    }
                    
                    // control found end segment
                    drawCommand += currentSegmentTail;
                    currentSegmentTail = '';
                    segmentIndex++;

                    // Add labels for this segment
                    const labels = this.getLabelsForSegment(edge, segmentIndex, totalSegments);
                    if (labels.length > 0) {
                        labels.forEach(label => {
                            drawCommand += ` node[${label.justify}, pos=${label.position}] {${label.text}}`;
                        });
                    }
                    console.log('draw command', drawCommand);
                }
            }

            // did waypoint processing leave and open segment?

            if (currentSegmentTail.length > 0) {
                drawCommand +=  currentSegmentTail + ` .. (${edge.end.x},${edge.end.y})`;
            } else {
                drawCommand += ` -- (${edge.end.x},${edge.end.y})`;
            }

            // Add labels for this segment
            const labels = this.getLabelsForSegment(edge, totalSegments, totalSegments);
            if (labels.length > 0) {
                labels.forEach(label => {
                    drawCommand += ` node[${label.justify}, pos=${label.position}] {${label.text}}`;
                });
            }
        }


        drawCommand += ';';
        console.log('draw command', drawCommand);
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

        // Get the base style based on node's style property
        const baseStyle = node.style && typeof node.style === 'string' && this.style.node?.[node.style]?.node
            ? this.style.node[node.style].node
            : this.defaultNodeStyle;

        const sizeStyle = {};

        // If node has custom height and width, add them to the style
        if (node.height !== undefined) {
            sizeStyle['minimum height'] = `${node.height}cm`; // Adjust units if necessary
        }
        if (node.width !== undefined) {
            sizeStyle['minimum width'] = `${node.width}cm`;
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



        //\node[shape=rectangle, draw=black, minimum width=2cm, minimum height=1cm, label={above:Upper Label,below:Lower Label}] (node1) at (4,4) {Main Text};

        // Combine all styles, maintaining precedence order
        return { 
            ...baseStyle,
            ...sizeStyle, 
            ...colorStyle
            //...(typeof node.style === 'object' ? node.style : {})
        };
    }

    tikzifyStyle(style) {
        const styleProps = [];

        for (const [key, value] of Object.entries(style)) {
            if (value === true) {
                styleProps.push(key);
            } else {
                styleProps.push(`${key}=${value}`);
            }
        }

        return styleProps.join(', ');

    }

    getLatexContent() {
        // Generate color definitions for hex colors
        const colorDefinitions = Array.from(this.usedColors.entries()).map(([hexCode, colorName]) => {
            return `\\definecolor{${colorName}}{HTML}{${hexCode.slice(1)}}`;
        }).join('\n');

        // Calculate bounding box after all nodes and edges have been rendered
        const boxMinX = this.bounds.minX - this.margin.w;
        const boxMinY = this.bounds.minY - this.margin.h;
        const boxMaxX = this.bounds.maxX + this.margin.w;
        const boxMaxY = this.bounds.maxY + this.margin.h;


        const preamble = `
\\documentclass{standalone}
\\usepackage{tikz}
\\usepackage{adjustbox}
\\usepackage{helvet}  
\\usepackage{sansmathfonts}  
\\renewcommand{\\familydefault}{\\sfdefault}  
\\usetikzlibrary{arrows.meta,calc,decorations.pathmorphing}
\\usetikzlibrary{shapes.arrows}
\\usepackage{xcolor}
${colorDefinitions}
\\begin{document}
\\begin{tikzpicture}
    [>={Stealth[scale=1.0]},  % Uniform arrow style
    ]
     \\useasboundingbox (${boxMinX},${boxMinY}) rectangle (${boxMaxX},${boxMaxY});
    `;
        const body = this.content.join('\n');
        const closing = `
\\end{tikzpicture}
\\end{document}
`;
        return `${preamble}\n${body}\n${closing}`;
    }

    async compileToPdf(texFilePath, options = {}) {
        const texDir = path.dirname(texFilePath);
        const texFileName = path.basename(texFilePath);
    
        // Get verbose from options with default false
        const verbose = options.verbose ?? false;
    
        // Add -quiet flag if not verbose
        const interactionMode = verbose ? 'nonstopmode' : 'batchmode';
        const command = `pdflatex -interaction=${interactionMode} -file-line-error -output-directory="${texDir}" "${texFileName}"`;
    
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (verbose) {
                    console.log('LaTeX stdout:', stdout);
                    if (stderr) console.error('LaTeX stderr:', stderr);
                }
    
                if (error) {
                    console.error('LaTeX compilation error:', error);
                    reject(error);
                } else {
                    if (verbose) {
                        console.log('pdflatex output:', stdout);
                    }
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
    getNodeAnchor(node) {
        const tryGetAnchor = () => {  // Changed to arrow function to preserve 'this' context
            // Check for named style on node
            if (node.anchor && typeof node.anchor === 'string') {
                return Direction.getVector(node.anchor);
            }

            // Check for named style on node
            if (node.style && typeof node.style === 'string') {
                // Check if named style exists in stylesheet
                const namedStyle = this.style.node?.[node.style]?.node;
                if (namedStyle) {
                    // Check if named style has an anchor
                    if (namedStyle.anchor) {
                        this.log(`Using anchor '${namedStyle.anchor}' from named style '${node.style}'`);
                        return Direction.getVector(namedStyle.anchor);
                    }
                    else{
                        return null;
                    }
                }
            }

            // Check default style for anchor
            const defaultAnchor = this.style.node?.default?.node?.anchor;
            if (defaultAnchor) {
                this.log(`Using anchor '${defaultAnchor}' from default style`);
                return Direction.getVector(defaultAnchor);
            }

            return null;  // Return null if no anchor is found
        };

        let anchorVector = tryGetAnchor();

        if (!anchorVector) {
            // Fallback to center
            this.log('No anchor specified, using center');
            anchorVector = Direction.getVector('center');
        }

        return anchorVector;
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

    getLabelsForSegment(edge, segmentNumber, totalSegments) {
        const labels = [];

        // Helper function to calculate position along the path
        const calculatePosition = (segmentIndex, defaultPosition) => {
            if (segmentIndex < 0) {
                segmentIndex = totalSegments + segmentIndex + 1; // Handle negative indices
            }
            if (segmentIndex === segmentNumber) {
                return defaultPosition;
            }
            return null;
        };

        // Helper to apply text flags to label text
        const applyTextFlags = (text, flags) => {
            let result = text;
            Object.entries(flags).forEach(([flag, value]) => {
                if (value === true) {
                    result = `\\${flag}{${result}}`;
                }
            });
            return result;
        };

        // Start Label
        if (edge.start_label) {
            const segmentIndex = edge.start_label_segment !== undefined
                ? parseInt(edge.start_label_segment)
                : 1;

            const position = calculatePosition(
                segmentIndex,
                edge.start_label_position !== undefined
                    ? parseFloat(edge.start_label_position)
                    : 0.1
            );

            if (position !== null) {
                labels.push({
                    text: applyTextFlags(this.escapeLaTeX(edge.start_label), this.defaultEdgeStartTextFlags),
                    position: position,
                    justify: edge.label_justify || 'above'
                });
            }
        }

        // End Label
        if (edge.end_label) {
            const segmentIndex = edge.end_label_segment !== undefined ?
                parseInt(edge.end_label_segment) : totalSegments;
            const position = calculatePosition(segmentIndex,
                edge.end_label_position !== undefined ?
                    parseFloat(edge.end_label_position) : 0.9);

            if (position !== null) {
                labels.push({
                    text: applyTextFlags(this.escapeLaTeX(edge.end_label), this.defaultEdgeEndTextFlags),
                    position: position,
                    justify: edge.label_justify || 'above'
                });
            }
        }

        // Main Label
        if (edge.label) {
            const defaultSegment = totalSegments % 2 === 1 ?
                Math.ceil(totalSegments / 2) :
                Math.floor(totalSegments / 2) + 1;

            const segmentIndex = edge.label_segment !== undefined ?
                parseInt(edge.label_segment) : defaultSegment;
            const position = calculatePosition(segmentIndex,
                edge.label_position !== undefined ?
                    parseFloat(edge.label_position) :
                    (totalSegments % 2 === 1 ? 0.5 : 0.0));

            if (position !== null) {
                labels.push({
                    text: applyTextFlags(this.escapeLaTeX(edge.label), this.defaultEdgeTextFlags),
                    position: position,
                    justify: edge.label_justify || 'above'
                });
            }
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

    getArrowStyle(startArrow, endArrow) {
        // Get default arrow modifiers from style
        const defaultModifiers = [];
        if (this.style?.arrow?.default) {
            const defaults = this.style.arrow.default;
            Object.entries(defaults).forEach(([key, value]) => {
                defaultModifiers.push(`${key}=${value}`);
            });
        }
        const modifierStr = defaultModifiers.length > 0 ? 
            `[${defaultModifiers.join(',')}]` : '';

        const arrows = [];
        
        // Start arrow (at the beginning of the line)
        if (startArrow) {
            // Apply default modifiers unless the arrow already has its own
            const arrowStr = startArrow.includes('[') ? 
                `{${startArrow}}` : 
                `{${startArrow}${modifierStr}}`;
            arrows.push(arrowStr);
        } else {
            arrows.push('');
        }
        
        // End arrow (at the end of the line)
        if (endArrow) {
            // Apply default modifiers unless the arrow already has its own
            const arrowStr = endArrow.includes('[') ? 
                `{${endArrow}}` : 
                `{${endArrow}${modifierStr}}`;
            arrows.push(arrowStr);
        } else {
            arrows.push('');
        }
        
        return `${arrows.join('-')}`;
    }

    getEdgeStyle(edge) {
        // Get the base style based on edge's style property
        const baseStyle = edge.style && typeof edge.style === 'string' && this.style.edge?.[edge.style]?.edge
            ? this.style.edge[edge.style].edge
            : this.defaultEdgeStyle;

        // Build style options
        const styleOptions = {
            ...baseStyle
        };

        // Add edge-specific styles if provided as string (e.g., 'dotted', 'dashed')
        if (edge.style && typeof edge.style === 'string') {
            if (['dotted', 'dashed', 'solid'].includes(edge.style)) {
                styleOptions[edge.style] = true;
            } else if (!this.style.edge?.[edge.style]) {
                // Parse semicolon-separated styles if it's not a predefined style name
                edge.style.split(';').forEach(stylePair => {
                    const [key, value] = stylePair.split('=').map(s => s.trim());
                    if (key) {
                        styleOptions[key] = value || true;
                    }
                });
            }
        }

        // Add edge color if specified
        if (edge.color) {
            styleOptions['draw'] = this.getColor(edge.color);
        }

        // Add arrow styles if specified
        if (edge.start_arrow || edge.end_arrow) {
            const arrowStyle = this.getArrowStyle(edge.start_arrow, edge.end_arrow);
            if (arrowStyle) {
                styleOptions['arrows'] = arrowStyle;
            }
        }

        return styleOptions;
    }

    updateNodeBounds(node) {
        // Use the pre-calculated anchor vector
        const anchorVector = node.anchorVector;
        
        // Calculate the actual center point of the node
        const centerX = node.x + ((0 - anchorVector.x) * node.width/2);
        const centerY = node.y + ((0 - anchorVector.y) * node.height/2);
        
        // Update bounds for all corners of the node
        this.updateBounds(centerX - node.width/2, centerY - node.height/2);
        this.updateBounds(centerX + node.width/2, centerY - node.height/2);
        this.updateBounds(centerX - node.width/2, centerY + node.height/2);
        this.updateBounds(centerX + node.width/2, centerY + node.height/2);
    }
}

module.exports = LatexRenderer; 