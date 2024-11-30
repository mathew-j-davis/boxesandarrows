const RendererBase = require('./renderer-base');
const { Point2D } = require('../geometry/basic-points');
const { Direction } = require('../geometry/direction');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const LatexStyleHandler = require('../styles/latex-style-handler');

class LatexRenderer extends RendererBase {
    constructor(options = {}) {
        super(options);
        
        // Load style if path provided, otherwise use empty object
        const style = options.stylePath ? this.loadStyle(options.stylePath) : {};
        this.styleHandler = new LatexStyleHandler(style);
        this.scale = this.getScaleConfig(style);  // Make sure scale is stored as instance variable
        this.initializeState(style, options);
    }

    initializeState(style, options = {}) {
        this.style = style || {};
        this.useColor = options.useColor ?? true;
        this.content = [];
        this.usedColors = new Map();
        this.verbose = options.verbose || false;
        this.log = this.verbose ? console.log.bind(console) : () => {};
        
        // Add default values when style.page is undefined
        const pageStyle = this.style.page || {};
        const marginStyle = pageStyle.margin || {};
        
        // Get margins with fallbacks
        this.margin = {
            h: marginStyle.h || 1,
            w: marginStyle.w || 1
        };

        this.bounds = {
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity
        };

        // Get text flags from style system
        this.defaultNodeTextFlags = this.styleHandler.getCompleteStyle(null, 'node', 'text');
        this.defaultEdgeTextFlags = this.styleHandler.getCompleteStyle(null, 'edge', 'text');
        this.defaultEdgeStartTextFlags = this.styleHandler.getCompleteStyle(null, 'edge', 'text', 'text_start');
        this.defaultEdgeEndTextFlags = this.styleHandler.getCompleteStyle(null, 'edge', 'text', 'text_end');
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
        
        // Get base style from style handler
        const nodeStyle = this.styleHandler.getCompleteStyle(node.style, 'node', 'object');
        
        // Override dimensions with node-specific values
        nodeStyle['minimum width'] = `${node.width}cm`;
        nodeStyle['minimum height'] = `${node.height}cm`;
        
        let styleStr = this.tikzifyStyle(nodeStyle);

        // Generate unique node ID for referencing using node.name
        const nodeId = `node_${node.name.replace(/\W/g, '_')}`;

        let output = '';
        if (node.hideLabel) {
            output += `\\node[${styleStr}] (${nodeId}) at ${pos} {};`;
        } else {
            // Apply text styles by wrapping the label
            let labelText = node.label;
            const textStyle = this.styleHandler.getCompleteStyle(node.style, 'node', 'text');
            
            // Apply text styles as wrappers
            Object.entries(textStyle || {}).forEach(([flag, value]) => {
                if (value === true) {
                    const command = flag.startsWith('\\') ? flag.slice(1) : flag;
                    labelText = `\\${command}{${labelText}}`;
                }
            });

            if (node.textcolor) {
                labelText = `\\textcolor{${this.getColor(node.textcolor)}}{${labelText}}`;
            }

            // Add adjustbox
            const labelWithAdjustbox = `{\\adjustbox{max width=${node.width}cm, max height=${node.height}cm}{${labelText}}}`;

            // Handle labels
            if (node.label_above) {
                styleStr += (styleStr.length > 0 ? ',' : '') + `label=above:{${this.escapeLaTeX(node.label_above)}}`;
            }
            if (node.label_below) {
                styleStr += (styleStr.length > 0 ? ',' : '') + `label=below:{${this.escapeLaTeX(node.label_below)}}`;
            }

            output += `\\node[${styleStr}] (${nodeId}) at ${pos} ${labelWithAdjustbox};`;
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
            if (value === true) {
                options.push(key);
            } else if (value !== false) {
                options.push(`${key}=${value}`);
            }
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
        // Get preamble settings from style system
        const preambleStyle = this.styleHandler.getCompleteStyle(null, 'document', 'preamble') || {
            documentClass: 'standalone',
            packages: [
                'tikz',
                'adjustbox',
                'helvet',
                'sansmathfonts',
                'xcolor'
            ],
            tikzlibraries: [
                'arrows.meta',
                'calc',
                'decorations.pathmorphing',
                'shapes.arrows'
            ]
        };

        // Generate preamble from style
        const packages = preambleStyle.packages
            .map(pkg => `\\usepackage{${pkg}}`)
            .join('\n');
        
        const libraries = preambleStyle.tikzlibraries
            .map(lib => `\\usetikzlibrary{${lib}}`)
            .join('\n');

        return `
\\documentclass{${preambleStyle.documentClass}}
${packages}
${libraries}
\\renewcommand{\\familydefault}{\\sfdefault}
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
        // Get object and text styles
        const objectStyle = this.styleHandler.getCompleteStyle(node.style, 'node', 'object');
        const textStyle = this.styleHandler.getCompleteStyle(node.style, 'node', 'text');
        
        const style = { ...objectStyle };

        // Add text style flags
        Object.entries(textStyle || {}).forEach(([flag, value]) => {
            if (value === true) {
                style[flag] = true;
            }
        });

        // Add size styles if specified
        if (node.height !== undefined) {
            style['minimum height'] = `${node.height}cm`;
        }
        if (node.width !== undefined) {
            style['minimum width'] = `${node.width}cm`;
        }

        // Add colors if specified
        if (node.fillcolor) {
            style['fill'] = this.getColor(node.fillcolor);
        }
        if (node.color) {
            style['draw'] = this.getColor(node.color);
        }

        return style;
    }

    tikzifyStyle(style) {
        return this.generateTikzOptions(style);
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
\\begin{tikzpicture}[
    >=Stealth  
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
        // Check for anchor directly on node
        if (node.anchor && typeof node.anchor === 'string') {
            return Direction.getVector(node.anchor);
        }

        // Get anchor from style system
        const anchor = this.styleHandler.getStyleAttribute(
            'node',
            node.style,
            'object.anchor',
            'center'  // default if not found in either style or base
        );

        return Direction.getVector(anchor);
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
        
        // Helper to apply text style
        const applyTextStyle = (text, category) => {
            const textStyle = this.styleHandler.getCompleteStyle(edge.style, 'edge', 'text', category);
            let result = text;
            Object.entries(textStyle || {}).forEach(([flag, value]) => {
                if (value === true) {
                    // Remove the extra backslash and use single backslash
                    const command = flag.startsWith('\\') ? flag.slice(1) : flag;
                    result = `\\${command}{${result}}`;  // Single backslash
                }
            });
            return result;
        };

        // Helper for position calculation
        const calculatePosition = (segmentIndex, defaultPosition) => {
            if (segmentIndex < 0) {
                segmentIndex = totalSegments + segmentIndex + 1;
            }
            return segmentIndex === segmentNumber ? defaultPosition : null;
        };

        // Start Label
        if (edge.start_label) {
            const segmentIndex = edge.start_label_segment ?? 1;
            const position = calculatePosition(segmentIndex, edge.start_label_position ?? 0.1);
            
            if (position !== null) {
                labels.push({
                    text: applyTextStyle(this.escapeLaTeX(edge.start_label), 'text_start'),
                    position,
                    justify: edge.label_justify || 'above'
                });
            }
        }

        // End Label
        if (edge.end_label) {
            const segmentIndex = edge.end_label_segment ?? totalSegments;
            const position = calculatePosition(segmentIndex, edge.end_label_position ?? 0.9);
            
            if (position !== null) {
                labels.push({
                    text: applyTextStyle(this.escapeLaTeX(edge.end_label), 'text_end'),
                    position,
                    justify: edge.label_justify || 'above'
                });
            }
        }

        // Main Label
        if (edge.label) {
            const defaultSegment = Math.ceil(totalSegments / 2);
            const segmentIndex = edge.label_segment ?? defaultSegment;
            const position = calculatePosition(
                segmentIndex,
                edge.label_position ?? (totalSegments % 2 === 1 ? 0.5 : 0.0)
            );
            
            if (position !== null) {
                labels.push({
                    text: applyTextStyle(this.escapeLaTeX(edge.label), 'text'),
                    position,
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

    getEdgeStyle(edge) {
        // Get the complete edge style
        const style = this.styleHandler.getCompleteStyle(edge.style, 'edge', 'object');
        
        // Override color if specified
        if (edge.color) {
            style['draw'] = this.getColor(edge.color);
        }

        // Add arrow style if needed
        if (edge.start_arrow || edge.end_arrow) {
            const arrowStyle = this.getArrowStyle(edge.start_arrow, edge.end_arrow);
            if (arrowStyle) {
                style['arrows'] = arrowStyle;
            }
        }

        return style;
    }

    getArrowStyle(startArrow, endArrow) {
        const formatArrowStyle = (arrowType) => {
            if (!arrowType) return '';
            // Remove shape=ArrowType from the style since it's redundant
            return `{${arrowType}[width=0.2cm, length=0.2cm]}`;
        };

        const start = formatArrowStyle(startArrow);
        const end = formatArrowStyle(endArrow);

        return start || end ? `${start}-${end}` : '';
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

    getScaleConfig(style) {
        // Default scale values if style is not provided
        const defaultScale = {
            position: { x: 1, y: 1 },
            node: {
                height: 1,
                width: 1
            }
        };

        // If no style provided, return defaults
        if (!style?.page?.scale) {
            return defaultScale;
        }

        // Extract values from style, maintaining structure from style-latex.json
        return {
            position: {
                x: style.page.scale.position?.x || defaultScale.position.x,
                y: style.page.scale.position?.y || defaultScale.position.y
            },
            node: {
                height: style.page.scale.size?.node?.h || defaultScale.node.height,
                width: style.page.scale.size?.node?.w || defaultScale.node.width
            }
        };
    }
}

module.exports = LatexRenderer; 