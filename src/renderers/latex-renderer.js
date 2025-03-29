const Renderer = require('./renderer');
const { Point2D } = require('../geometry/basic-points');
const { Direction } = require('../geometry/direction');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const LatexStyleHandler = require('../styles/latex-style-handler');
const { BoundingBox } = require('../geometry/bounding-box');
const { canConvertPositionToCoordinates } = require('../io/readers/relative-node-processor');
const { Position, PositionType } = require('../geometry/position');

class LatexRenderer extends Renderer {
    constructor(options = {}) {
        super(options);
        

        this.log = this.verbose ? console.log.bind(console) : () => {};

        // Initialize the style handler
        this.styleHandler = new LatexStyleHandler(options);
        
        
        // Store document paths with correct paths
        this.headerTemplatePath = options.headerTemplate || 
                                 path.join(__dirname, '../templates/latex_header_template.txt');
        this.footerTemplatePath = options.footerTemplate || 
                                 path.join(__dirname, '../templates/latex_footer_template.txt');
        
        // Optional content file paths
        this.definitionsPath = options.definitionsPath || null;
        this.preBoilerplatePath = options.preBoilerplatePath || null;
        this.postBoilerplatePath = options.postBoilerplatePath || null;
        
        // Load templates
        this.headerTemplate = this.loadTemplate(this.headerTemplatePath);
        this.footerTemplate = this.loadTemplate(this.footerTemplatePath);
        
        // Load additional content
        this.definitionsContent = this.loadContentFile(this.definitionsPath);
        this.preBoilerplateContent = this.loadContentFile(this.preBoilerplatePath);
        this.postBoilerplateContent = this.loadContentFile(this.postBoilerplatePath);
        
        this.initializeState(options);
        
    }

    initializeState(options = {}) {
        this.useColor = options.useColor ?? true;
        this.content = [];
        this.usedColors = new Map();
        this.verbose = options.verbose || false;
        this.log = this.verbose ? console.log.bind(console) : () => {};
        
        this.bounds = {
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity
        };
    }

    async render(nodes, edges, outputPath, options = {}) {
        // Reset all state to initial values
        this.initializeState({ 
            verbose: this.verbose, 
            useColor: this.useColor 
        });

        // Ensure we have arrays, even if empty
        const safeNodes = Array.isArray(nodes) ? nodes : [];
        const safeEdges = Array.isArray(edges) ? edges : [];

        // Initialize latex_output property on nodes and edges
        safeNodes.forEach(node => {
            node.render['latex'] = '';
        });
        
        safeEdges.forEach(edge => {
            edge.latex_output = '';
        });

        // Render all nodes (store output in node.latex_output)
        safeNodes.forEach(node => this.renderNode(node));

        // Render all edges (store output in edge.latex_output)
        safeEdges.forEach(edge => this.renderEdge(edge));
        
        // Collect rendered content from nodes and edges
        this.collectRenderedContent(safeNodes, safeEdges);

        // If no content, set default bounding box for an empty diagram
        if (safeNodes.length === 0 && safeEdges.length === 0) {
            this.log('No nodes or edges provided, creating empty diagram');
            this.bounds = {
                minX: 0,
                minY: 0,
                maxX: 10,
                maxY: 10
            };
        }

        // Draw grid if specified (add before content so it's behind everything)
        if (options.grid && typeof options.grid === 'number') {
            // Store content temporarily
            //const contentBackup = [...this.content];
            // Clear content to add grid first
            //this.content = [];

            // Draw grid with specified spacing as overlay
            this.drawGrid(options.grid);
            
            // Add original content back so grid is behind everything
            //this.content.push(...contentBackup);
        }

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

        let pos;
        let hasPositionShift = false;
        
        if (node.position) {

            if (node.position.positionType === PositionType.NAMED) {
                pos = node.position.at;
                hasPositionShift = (node?.position?.xAtNodeAnchorOffsetScaled || node?.position?.yAtNodeAnchorOffsetScaled);
            } 
            else {
                pos = `(${node.position.xScaled},${node.position.yScaled})`;
            }
        } 
        
        this.updateNodeBounds(node);
        
        // Initialize TikZ attributes object - this will hold all the styling
        const tikzAttributes = {};
        
        // 1. Start with base style from style handler (if it exists)
        const style = this.styleHandler.getCompleteStyle(node.style, 'node', 'object');
        if (style && style.tikz) {
            // Copy base style attributes
            Object.assign(tikzAttributes, style.tikz);
        }
        
        // 2. Apply mandatory node attributes (important: these override the base style)
        tikzAttributes['minimum width'] = `${node.widthScaled}cm`;
        tikzAttributes['minimum height'] = `${node.heightScaled}cm`;
        
        // 3. Apply node-specific attributes from CSV
        if (node.shape) {
            tikzAttributes['shape'] = node.shape;
        }
        
        // Apply anchor if specified
        if (node.anchor) {
            const standardizedAnchor = Direction.standardiseBasicDirectionName(node.anchor);
            if (standardizedAnchor) {
                tikzAttributes['anchor'] = standardizedAnchor;
            }
        }
        
        // Apply colors if specified
        if (node.fillcolor) {
            tikzAttributes['fill'] = this.styleHandler.registerColor(node.fillcolor);
        }
        if (node.edge_color) {
            tikzAttributes['draw'] = this.styleHandler.registerColor(node.edge_color);
        }
        if (node.textcolor) {
            tikzAttributes['text'] = this.styleHandler.registerColor(node.textcolor);
        }
        
        // 4. Process raw TikZ attributes if present (these get highest priority)
        if (node.tikz_object_attributes) {
            const processedAttributes = this.styleHandler.processAttributes(node.tikz_object_attributes);
            if (processedAttributes.tikz) {
                Object.assign(tikzAttributes, processedAttributes.tikz);
            }
        }
        
        // NEW STEP: Process all hex colors in tikzAttributes
        for (const [key, value] of Object.entries(tikzAttributes)) {
            if (typeof value === 'string' && value.startsWith('#')) {
                tikzAttributes[key] = this.styleHandler.registerColor(value);
            }
        }
        
        // 5. Generate TikZ style string from our attributes
        let styleStr = this.generateTikzOptions(tikzAttributes);
        
        // 6. Generate the node output
        // Generate unique node ID
        const nodeId = `${node.name.replace(/\W/g, '_')}`;
        
        let output = '';
        // Check if the node should not display a label
        if (node.hide_label === true) {
            output += `\\node[${styleStr}] (${nodeId}) at ${pos} {};`;
        } else {
            // Get text style and apply formatting
            let labelText = node.label || node.name;
            
            // Convert newlines to LaTeX line breaks (without leading space)
            labelText = labelText.replace(/\n/g, '\\\\');
            
            // Collapse multiple consecutive LaTeX linebreaks into a single one
            labelText = labelText.replace(/\\\\(\s*\\\\)+/g, '\\\\');
            
            // Get text style properties
            const textStyle = this.styleHandler.getCompleteStyle(node.style, 'node', 'text');
            
            // Apply LaTeX formatting
            labelText = this.styleHandler.applyLatexFormatting(labelText, textStyle);
            
            // Add textcolor if specified
            if (node.textcolor) {
                labelText = `\\textcolor{${this.getColor(node.textcolor)}}{${labelText}}`;
            }
            
            // Build adjustbox parameters
            let adjustboxParams = `max width=${node.widthScaled}cm, max height=${node.heightScaled}cm`;
            
            // Add custom adjustbox attributes from style if available
            if (textStyle && textStyle.adjustbox && Object.keys(textStyle.adjustbox).length > 0) {
                for (const [key, value] of Object.entries(textStyle.adjustbox)) {
                    adjustboxParams += `, ${key}=${value}`;
                }
            }
            
            // Add adjustbox
            const labelWithAdjustbox = `{\\adjustbox{${adjustboxParams}}{${labelText}}}`;
            
            // Handle external labels
            if (node.label_above) {
                styleStr += (styleStr.length > 0 ? ',' : '') + `label=above:{${this.escapeLaTeX(node.label_above)}}`;
            }
            if (node.label_below) {
                styleStr += (styleStr.length > 0 ? ',' : '') + `label=below:{${this.escapeLaTeX(node.label_below)}}`;
            }
            
            // Handle position_of with offsets
            if (hasPositionShift) {

                const xShift = node.position.xAtNodeAnchorOffsetScaled || '';
                const yShift = node.position.yAtNodeAnchorOffsetScaled || '';
                
                // Combine shifts with a comma if both are present
                const shifts = [xShift, yShift].filter(Boolean).join(', ');
                
                output += `\\node[${styleStr}] (${nodeId}) at ${pos} [${shifts}] ${labelWithAdjustbox};`;
            } else {
                output += `\\node[${styleStr}] (${nodeId}) at ${pos} ${labelWithAdjustbox};`;
            }
        }
        
        // Store output in node.latex_output instead of pushing to this.content
        node.render['latex'] = output;
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
        const styleStr = this.styleHandler.tikzifyStyle(styleOptions);

        // Build the draw command - simplified starting point
        let drawCommand = `\\draw[${styleStr}]`;

        // Add start point based on whether it's adjusted or not
        drawCommand += ` ${this.getPositionReferenceNotation(edge.from_name, edge.start_anchor, edge.startAdjusted, edge.start.x, edge.start.y)}`;

        // Track actual segments (excluding control points)
        let segmentIndex = 0;

        // Calculate total number of real segments
        const realPointsInWaypoints = edge.waypoints
            ? edge.waypoints.filter(wp => !wp.isControl)
            : [];

        const totalSegments = realPointsInWaypoints.length + 1; // +1 for the final segment to end point

        this.log('Edge waypoints:', edge.waypoints);
        this.log('Real points in waypoints:', realPointsInWaypoints);
        this.log('Total segments:', totalSegments);

        this.log('draw command', drawCommand);

        let currentSegmentTail = '';

        if (edge.waypoints.length === 0) {
            // Special handling when using 'to' path type, as it requires different label syntax
            if (edge.path_type === 'to') {
                // When using 'to', node labels must be inside the 'to' operation
                const labels = this.getLabelsForSegment(edge, 1, totalSegments);
                if (labels.length > 0) {
                    // For 'to' paths, add labels within the to operation
                    drawCommand += ` ${edge.from_name ? this.getPositionReferenceNotation(edge.from_name, edge.start_anchor, edge.startAdjusted, edge.start.x, edge.start.y) : ''} to`;
                    
                    // Add each label as a node within the 'to' operation
                    labels.forEach(label => {
                        drawCommand += ` node[${label.justify}] {${label.text}}`;
                    });
                    
                    // Complete the 'to' operation with the destination
                    drawCommand += ` ${this.getPositionReferenceNotation(edge.to_name, edge.end_anchor, edge.endAdjusted, edge.end.x, edge.end.y)}`;
                } else {
                    // If no labels, just use the simple to syntax
                    drawCommand += ` ${edge.path_type} ${this.getPositionReferenceNotation(edge.to_name, edge.end_anchor, edge.endAdjusted, edge.end.x, edge.end.y)}`;
                }
            } else {
                // For other path types (like '--'), we can use the standard approach
                drawCommand += ` ${edge.path_type} ${this.getPositionReferenceNotation(edge.to_name, edge.end_anchor, edge.endAdjusted, edge.end.x, edge.end.y)}`;
                
                const labels = this.getLabelsForSegment(edge, 1, totalSegments);
                if (labels.length > 0) {
                    labels.forEach(label => {
                        drawCommand += ` node[${label.justify}, pos=${label.position}] {${label.text}}`;
                    });
                }
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
                    this.log('draw command', drawCommand);
                }
            }

            // did waypoint processing leave an open segment?
            if (currentSegmentTail.length > 0) {
                // Add end point
                drawCommand += currentSegmentTail + ` .. ${this.getPositionReferenceNotation(edge.to_name, edge.end_anchor, edge.endAdjusted, edge.end.x, edge.end.y)}`;
            } else {
                // Add end point
                drawCommand += ` -- ${this.getPositionReferenceNotation(edge.to_name, edge.end_anchor, edge.endAdjusted, edge.end.x, edge.end.y)}`;
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
        this.log('draw command', drawCommand);
        // Store output in edge.latex_output instead of pushing to this.content
        edge.latex_output = drawCommand;
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

    // calculateControlPoint(node, direction, controlLength) {
    //     if (!direction || !controlLength) {
    //         return new Point2D(node.xScaled, node.yScaled);
    //     }

    //     const directionVector = Direction.getVector(direction);
    //     return new Point2D(
    //         node.xScaled + (directionVector.x * controlLength),
    //         node.yScaled + (directionVector.y * controlLength)
    //     );
    // }

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
        const labelStyle = this.styleHandler.getCompleteStyle(node.style, 'node', 'label');
        
        const style = { ...objectStyle || {} };

        // Add text style flags
        Object.entries(labelStyle || {}).forEach(([flag, value]) => {
            if (value === true) {
                style[flag] = true;
            }
        });

        // Add size styles if specified
        if (node.heightScaled !== undefined) {
            style['minimum height'] = `${node.heightScaled}cm`;
        }
        if (node.widthScaled !== undefined) {
            style['minimum width'] = `${node.widthScaled}cm`;
        }

        // Add colors if specified
        if (node.fillcolor) {
            style['fill'] = this.styleHandler.registerColor(node.fillcolor);
        }
        if (node.edge_color) {
            style['draw'] = this.styleHandler.registerColor(node.edge_color);
        }

        // Process raw TikZ attributes if present
        if (node.attributes) {
            const attrStyle = this.styleHandler.processAttributes(node.attributes);
            Object.assign(style, attrStyle || {});
        }

        return style;
    }

    tikzifyStyle(style) {
        return this.generateTikzOptions(style);
    }

    getLatexContent() {
        // Get color definitions from the style handler
        const colorDefinitions = this.styleHandler.getColorDefinitions().join('\n');

        // Calculate bounding box after all nodes and edges have been rendered
        const boxMinX = this.bounds.minX - this.styleHandler.getPageMargin().w;
        const boxMinY = this.bounds.minY - this.styleHandler.getPageMargin().h;
        const boxMaxX = this.bounds.maxX + this.styleHandler.getPageMargin().w;
        const boxMaxY = this.bounds.maxY + this.styleHandler.getPageMargin().h;

        // Replace placeholders in header template
        let header = this.headerTemplate
            .replace(/{{COLOR_DEFINITIONS}}/g, colorDefinitions)
            .replace(/{{BOX_MIN_X}}/g, boxMinX)
            .replace(/{{BOX_MIN_Y}}/g, boxMinY)
            .replace(/{{BOX_MAX_X}}/g, boxMaxX)
            .replace(/{{BOX_MAX_Y}}/g, boxMaxY)
            .replace(/{{INCLUDE_DEFINITIONS}}/g, this.definitionsContent)
            .replace(/{{INCLUDE_PRE_BOILERPLATE}}/g, this.preBoilerplateContent);

        // If no bounding box placeholder in template, add it before the tikzpicture ends
        if (!header.includes('\\useasboundingbox')) {
            const tikzPictureIndex = header.indexOf('\\begin{tikzpicture}');
            if (tikzPictureIndex !== -1) {
                const insertPosition = tikzPictureIndex + '\\begin{tikzpicture}'.length;
                header = header.slice(0, insertPosition) + 
                         `\n\\useasboundingbox (${boxMinX},${boxMinY}) rectangle (${boxMaxX},${boxMaxY});` + 
                         header.slice(insertPosition);
            }
        }

        const body = this.content.join('\n');
        
        // Use footer template and replace the post boilerplate tag
        const footer = this.footerTemplate.replace(/{{INCLUDE_POST_BOILERPLATE}}/g, this.postBoilerplateContent);
        
        return `${header}\n${body}\n${footer}`;
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
                    this.log('LaTeX stdout:', stdout);
                    if (stderr) console.error('LaTeX stderr:', stderr);
                }
    
                if (error) {
                    console.error('LaTeX compilation error:', error);
                    reject(error);
                } else {
                    if (verbose) {
                        this.log('pdflatex output:', stdout);
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

    // // Helper method to check if direction is a compass point
    // isCompassDirection(direction) {
    //     const compassDirections = [
    //         'north', 'south', 'east', 'west',
    //         'north east', 'north west', 'south east', 'south west',
    //         'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'
    //     ];
    //     return compassDirections.includes(direction.toLowerCase());
    // }

    // // Helper method to translate shorthand directions to TikZ anchors
    // translateDirection(direction) {
    //     const directionMap = {
    //         n: 'north',
    //         s: 'south',
    //         e: 'east',
    //         w: 'west',
    //         ne: 'north east',
    //         nw: 'north west',
    //         se: 'south east',
    //         sw: 'south west'
    //     };
    //     return directionMap[direction.toLowerCase()] || direction.toLowerCase();
    // }

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
        
        // Helper to get position for segment
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
                const labelStyle = this.styleHandler.getCompleteStyle(edge.style, 'edge', 'label_start');
                
                // Convert newlines to LaTeX line breaks (without leading space)
                const processedLabel = edge.start_label.replace(/\n/g, '\\\\');
                
                // Collapse multiple consecutive LaTeX linebreaks
                const cleanedLabel = processedLabel.replace(/\\\\(\s*\\\\)+/g, '\\\\');
                
                labels.push({
                    text: this.styleHandler.applyLatexFormatting(this.escapeLaTeX(cleanedLabel), labelStyle),
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
                const labelStyle = this.styleHandler.getCompleteStyle(edge.style, 'edge', 'label_end');
                
                // Convert newlines to LaTeX line breaks (without leading space)
                const processedLabel = edge.end_label.replace(/\n/g, '\\\\');
                
                // Collapse multiple consecutive LaTeX linebreaks
                const cleanedLabel = processedLabel.replace(/\\\\(\s*\\\\)+/g, '\\\\');
                
                labels.push({
                    text: this.styleHandler.applyLatexFormatting(this.escapeLaTeX(cleanedLabel), labelStyle),
                    position,
                    justify: edge.label_justify || 'above'
                });
            }
        }

        // Main Label
        if (edge.label) {
            const defaultSegment = Math.ceil(totalSegments / 2);
            const segmentIndex = edge.label_segment ?? defaultSegment;

            let lp = 0.5;
            const edgeLabelStyle = this.styleHandler.getCompleteStyle(edge.style, 'edge', 'label');

            // Check if we have a position value in the style
            if (totalSegments == 1 && edgeLabelStyle?.tikz?.pos) {
                lp = edge.label_position ?? edgeLabelStyle.tikz.pos;
            } else {
                lp = calculatePosition(
                    segmentIndex,
                    edge.label_position ?? (totalSegments % 2 === 1 ? 0.5 : 0.0)
                );
            }

            const position = lp;
            
            if (position !== null) {
                // Convert newlines to LaTeX line breaks (without leading space)
                const processedLabel = edge.label.replace(/\n/g, '\\\\');
                
                // Collapse multiple consecutive LaTeX linebreaks
                const cleanedLabel = processedLabel.replace(/\\\\(\s*\\\\)+/g, '\\\\');
                
                labels.push({
                    text: this.styleHandler.applyLatexFormatting(this.escapeLaTeX(cleanedLabel), edgeLabelStyle),
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
        
        // Process all hex colors in the tikz attributes
        if (style.tikz) {
            for (const key in style.tikz) {
                const value = style.tikz[key];
                if (typeof value === 'string' && value.startsWith('#')) {
                    style.tikz[key] = this.styleHandler.registerColor(value);
                }
            }
        }
        
        // Override color if specified
        if (edge.color && style.tikz) {
            style.tikz['draw'] = this.styleHandler.registerColor(edge.color);
        }

        // Add arrow style if needed
        if ((edge.start_arrow || edge.end_arrow) && style.tikz) {
            const arrowStyle = this.getArrowStyle(edge.start_arrow, edge.end_arrow);
            if (arrowStyle) {
                style.tikz['arrows'] = arrowStyle;
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
        // Create a bounding box from the node, which handles anchors correctly
        const boxResult = BoundingBox.fromNode(node);
        
        // If we couldn't create a bounding box, try to update bounds directly from node coordinates
        if (!boxResult.success) {
            // Fallback to using node's coordinates directly
            this.updateBounds(node?.position?.xScaled || 0, node?.position?.yScaled);
            return;
        }
        
        const boundingBox = boxResult.boundingBox;
            
        // Update bounds for all corners of the node
        this.updateBounds(boundingBox.left, boundingBox.bottom);
        this.updateBounds(boundingBox.right, boundingBox.bottom);
        this.updateBounds(boundingBox.left, boundingBox.top);
        this.updateBounds(boundingBox.right, boundingBox.top);
    }

    // Load template from file or use default
    loadTemplate(templatePath, defaultTemplate) {
        try {
            if (fs.existsSync(templatePath)) {
                return fs.readFileSync(templatePath, 'utf8');
            }
            console.warn(`Template file not found: ${templatePath}, using default template.`);
            return defaultTemplate;
        } catch (error) {
            console.error(`Error loading template: ${error.message}`);
            return defaultTemplate;
        }
    }

    // Add this new helper method to the LatexRenderer class
    getNodeReferenceNotation(nodeName, direction) {
        // Handle the case when direction is missing or empty
        if (!direction) {
            return `(${nodeName})`;
        }
        return `(${nodeName}.${direction})`;
    }

    // Add this new helper method
    getPositionReferenceNotation(nodeName, direction, useCoordinates, x, y) {
        if (useCoordinates) {
            // Use exact coordinates
            return `(${x},${y})`;
        } else {
            // Use node reference notation
            return this.getNodeReferenceNotation(nodeName, direction);
        }
    }

    // New method to load content files
    loadContentFile(filePath) {
        if (!filePath) return '';
        
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            }
            console.warn(`Content file not found: ${filePath}, using empty content.`);
            return '';
        } catch (error) {
            console.error(`Error loading content file: ${error.message}`);
            return '';
        }
    }

    // Add method to draw a grid with labels
    drawGrid(gridSpacing) {
        if (!gridSpacing || gridSpacing <= 0) return;

        // Get scale config
        const scale = this.styleHandler.getPageScale();
        
        // gridSpacing is in unscaled coordinates, so convert to scaled
        const scaledGridSpacingX = gridSpacing * scale.position.x;
        const scaledGridSpacingY = gridSpacing * scale.position.y;

        // Find the grid bounds based on the diagram bounds
        // Use the calculated bounds from the diagram content
        const minX = Math.floor(this.bounds.minX / scaledGridSpacingX) * scaledGridSpacingX;
        const maxX = Math.ceil(this.bounds.maxX / scaledGridSpacingX) * scaledGridSpacingX;
        const minY = Math.floor(this.bounds.minY / scaledGridSpacingY) * scaledGridSpacingY;
        const maxY = Math.ceil(this.bounds.maxY / scaledGridSpacingY) * scaledGridSpacingY;

        // Grid style
        const gridStyle = 'dashed,gray,opacity=0.5';
        
        // Generate vertical grid lines with labels
        for (let x = minX; x <= maxX; x += scaledGridSpacingX) {
            // Draw vertical line
            this.content.push(`\\draw[${gridStyle}] (${x},${minY}) -- (${x},${maxY});`);
            
            // Calculate unscaled coordinate for label
            const unscaledX = x / scale.position.x;
            // Round to 2 decimal places to avoid floating point issues
            const formattedX = Math.round(unscaledX * 100) / 100;
            
            // Add label at the bottom with unscaled value
            this.content.push(`\\node[below] at (${x},${minY}) {${formattedX}};`);
        }
        
        // Generate horizontal grid lines with labels
        for (let y = minY; y <= maxY; y += scaledGridSpacingY) {
            // Draw horizontal line
            this.content.push(`\\draw[${gridStyle}] (${minX},${y}) -- (${maxX},${y});`);
            
            // Calculate unscaled coordinate for label
            const unscaledY = y / scale.position.y;
            // Round to 2 decimal places to avoid floating point issues
            const formattedY = Math.round(unscaledY * 100) / 100;
            
            // Add label on the left with unscaled value
            this.content.push(`\\node[left] at (${minX},${y}) {${formattedY}};`);
        }
    }

    collectRenderedContent(nodes, edges) {
        // Clear existing content array
        this.content = [];
        
        // Add node outputs to content array
        for (const node of nodes) {
            if (node?.render['latex']) {
                this.content.push(node.render['latex']);
            }
        }
        
        // Add edge outputs to content array
        for (const edge of edges) {
            if (edge.latex_output) {
                this.content.push(edge.latex_output);
            }
        }
    }
}

module.exports = LatexRenderer; 