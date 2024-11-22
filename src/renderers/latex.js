const Renderer = require('./base');
const { Point2D, Direction, Box } = require('../geometry/basic-points');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class LatexRenderer extends Renderer {
    constructor(style, options = {}) {
        super(style);
        this.style = style || {};
        //this.scale = options.scale || 1;
        this.useColor = options.useColor ?? true;

        this.content = [];
        this.usedColors = new Map(); // Keep track of used colors and their names

        // Load the default edge style
        this.defaultNodeStyle = style.node?.default || {};
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

    renderEdge(edge) {
        // Build style options dynamically from default edge styles
        const styleOptions = new Map();
        
        // 1. Apply default edge styles
        Object.entries(this.defaultEdgeStyle).forEach(([key, value]) => {
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

        // Track actual segments (excluding control points)
        
        let actualSegments = [];
        let drawCommand = `\\draw[${styleStr}] (${edge.start.x},${edge.start.y})`;
    
        //const startAnchor = this.getNodeAnchor(fromNodeId, edge.start_direction);
        


        /*
        if (!edge.waypoints || edge.waypoints.length === 0) {
            const endAnchor = this.getNodeAnchor(toNodeId, edge.end_direction);
            drawCommand = `\\draw[${styleStr}] ${startAnchor} -- ${endAnchor}`;
            actualSegments.push({ start: startAnchor, end: endAnchor });
        } 
        */
       
        //const startAnchor = this.getNodeAnchor(fromNodeId, edge.start_direction);
        //const endAnchor = this.getNodeAnchor(toNodeId, edge.end_direction);

        // Replace with:
        const startPoint = `(${edge.start.x},${edge.start.y})`;
        const endPoint = `(${edge.end.x},${edge.end.y})`;

        if (!edge.waypoints || edge.waypoints.length === 0) {
            drawCommand += ` -- (${edge.end.x},${edge.end.y})`;
            actualSegments.push({ start: edge.start, end: edge.end });
        }
        else {
            let lastRealPoint = edge.start;
            let currentSegment = [];
    
            // Process all waypoints
            for (const wp of edge.waypoints) {
                if (wp.isControl) {
                    currentSegment.push(wp);
                } else {
                    // We found a real point, draw the segment
                    if (currentSegment.length === 0) {
                        // Direct line
                        drawCommand += ` -- (${wp.x},${wp.y})`;
                    } else if (currentSegment.length === 1) {
                        // Quadratic bezier - convert to cubic
                        // const control = currentSegment[0];
                        // const c1x = lastRealPoint.x + (2/3) * (control.x - lastRealPoint.x);
                        // const c1y = lastRealPoint.y + (2/3) * (control.y - lastRealPoint.y);
                        // const c2x = wp.x + (2/3) * (control.x - wp.x);
                        // const c2y = wp.y + (2/3) * (control.y - wp.y);
                        //drawCommand += ` .. controls (${c1x},${c1y}) and (${c2x},${c2y}) .. (${wp.x},${wp.y})`;
                        drawCommand += ` .. controls (${c1x},${c1y}) .. (${wp.x},${wp.y})`;
                    } else if (currentSegment.length === 2) {
                        // Cubic bezier
                        const [c1, c2] = currentSegment;
                        drawCommand += ` .. controls (${c1.x},${c1.y}) and (${c2.x},${c2.y}) .. (${wp.x},${wp.y})`;
                    }
                    
                    actualSegments.push({ start: lastRealPoint, end: wp });
                    lastRealPoint = wp;
                    currentSegment = []; // Reset for next segment
                }
            }
    
            // Draw final segment to end point
            drawCommand += ` -- (${edge.end.x},${edge.end.y})`;
            actualSegments.push({ start: lastRealPoint, end: edge.end });
        }
    
        // Handle labels with correct segment counting
        const labels = this.getLabelsForSegment(edge, 1, actualSegments.length);
        if (labels.length > 0) {
            labels.forEach(label => {
                drawCommand += ` node[${label.justify}, pos=${label.position}] {${this.escapeLaTeX(label.text)}}`;
            });
        }
    
        drawCommand += ';';
        this.content.push(drawCommand);
    // }





    //     if (!edge.waypoints || edge.waypoints.length === 0) {
    //         drawCommand = `\\draw[${styleStr}] ${startPoint} -- ${endPoint}`;
    //         actualSegments.push({ start: startPoint, end: endPoint });

    //     } else {
    //         drawCommand = `\\draw[${styleStr}] ${startPoint}`;
    //         let lastRealPoint = edge.start;

    //         for (let i = 0; i < edge.waypoints.length; i++) {


    //             const wp = edge.waypoints[i];
    //             const nextWp = edge.waypoints[i + 1];
                
    //             if (wp.isControl && nextWp && !nextWp.isControl) {
    //                 // Bezier curve segment
    //                 const point = `(${nextWp.x},${nextWp.y})`;
    //                 drawCommand += ` .. controls (${wp.x},${wp.y}) .. ${point}`;
    //                 actualSegments.push({ start: lastPoint, end: point });
    //                 lastPoint = point;
    //                 i++; // Skip the next point
    //             } else if (!wp.isControl) {
    //                 // Straight line segment
    //                 const point = `(${wp.x},${wp.y})`;
    //                 drawCommand += ` -- ${point}`;

    //                 actualSegments.push({ start: lastRealPoint, end: wp });
    //                 lastRealPoint = wp;
    //             }
    //         }
            

    //         const endPoint = `(${edge.end.x},${edge.end.y})`;
    //         drawCommand += ` -- ${endPoint}`;
    //         actualSegments.push({ start: lastPoint, end: endPoint });

    //         // const endAnchor = this.getNodeAnchor(toNodeId, edge.end_direction);
    //         // drawCommand += ` -- ${endAnchor}`;
    //         // actualSegments.push({ start: lastPoint, end: endAnchor });
    //     }

    //     // Handle labels with correct segment counting
    //     const labels = this.getLabelsForSegment(edge, 1, actualSegments.length);
    //     if (labels.length > 0) {
    //         labels.forEach(label => {
    //             drawCommand += ` node[${label.justify}, pos=${label.position}] {${this.escapeLaTeX(label.text)}}`;
    //         });
    //     }

    //     drawCommand += ';';
    //     this.content.push(drawCommand);
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
        // const nodeStyles = this.style.node || {};
        // const defaultStyle = nodeStyles.default || {};
        //const typeStyle = nodeStyles[node.type] || {};
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

        return { ...this.defaultNodeStyle,  ...sizeStyle, ...colorStyle, ...node.style };
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

        const preamble = `
\\documentclass{standalone}
\\usepackage{tikz}
\\usepackage{helvet}  
\\usepackage{sansmathfonts}  
\\renewcommand{\\familydefault}{\\sfdefault}  
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

        // Start Label
        if (edge.start_label) {
            const segmentIndex = edge.start_label_segment !== undefined ? 
                parseInt(edge.start_label_segment) : 1;
            const position = calculatePosition(segmentIndex, 
                edge.start_label_position !== undefined ? 
                    parseFloat(edge.start_label_position) : 0.1);
            
            if (position !== null) {
                labels.push({
                    text: edge.start_label,
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
                    text: edge.end_label,
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
                    text: edge.label,
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
}

module.exports = LatexRenderer; 