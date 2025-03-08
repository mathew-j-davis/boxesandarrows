'use strict';
const PositionReader = require('./io/readers/position-reader');
const ReaderManager = require('./io/reader-manager');
const LatexRenderer = require('./renderers/latex-renderer');
const { processRelativeNode } = require('./io/readers/relative-node-processor');


class DiagramBuilder {
    constructor(options = {}) {
        this.verbose = options.verbose || false;
        this.grid = options.grid || null;
        this.rendererType = options.renderer;
        this.log = this.verbose ? console.log.bind(console) : () => {};
        
        // Store all options
        this.options = options;

        // Create renderer based on type and pass the configuration
        this.renderer = this.createRenderer(this.rendererType, options);

        // Initialize the reader manager with style and page handlers
        this.readerManager = new ReaderManager();
        
        this.nodePositions = new Map();

    }

    createRenderer(type, options) {
        
        switch (type.toLowerCase()) {

            case 'text':
                // For future implementation
                // const TextRenderer = require('./renderers/text');
                // return new TextRenderer(options);
                console.warn('Text renderer not yet implemented');
                throw new Error('Text renderer not yet implemented');

            case 'latex':
                return new LatexRenderer(options);

            default:
                console.warn(`Unknown renderer type: ${type}, falling back to LaTeX`);
                throw new Error(`Unknown renderer type: ${type}`);

        }
    }

    async renderDiagram(outputPath) {
        // Just use the already instantiated renderer
        const result = await this.renderer.render(
            Array.from(this.readerManager.getNodes().values()),
            this.readerManager.getEdges(),
            outputPath,
            { grid: this.grid }
        );
        
        return result;
    }

    async loadData(stylePaths, nodePaths, edgePaths, positionFile, mixedYamlFile) {
        try {

            const styleFiles = Array.isArray(stylePaths) ? stylePaths : (stylePaths ? [stylePaths] : []);
            if(styleFiles.length > 0) {
                this.log(`Processing styles from ${styleFiles.length} dedicated style files`);
                await this.readerManager.processStyleFiles(styleFiles, this.renderer.styleHandler);
            }

            // Process edges from mixed YAML file if provided
            if (mixedYamlFile) {
                this.log(`Processing styles from mixed YAML file: ${mixedYamlFile}`);
                await this.readerManager.processStyleFiles([mixedYamlFile], this.renderer.styleHandler);
            }

            // Handle node files (CSV or YAML)
            const nodeFiles = Array.isArray(nodePaths) ? nodePaths : (nodePaths ? [nodePaths] : []);

            if (nodeFiles.length > 0) {
                this.log(`Processing nodes from ${nodeFiles.length} dedicated node files`);
                await this.readerManager.processNodeFiles(nodeFiles);
            }
            
            // Process nodes from mixed YAML file if provided
            if (mixedYamlFile) {
                this.log(`Processing nodes from mixed YAML file: ${mixedYamlFile}`);
                await this.readerManager.processNodeFiles([mixedYamlFile]);
            }
            
            // Load and apply position data
            if (positionFile) {
                await this.loadPositions(positionFile);
            } else {
                this.log('No position file specified; using positions from node files or default (0,0).');
            }

            this.positionAndScaleAllNodes();

            // Now that all nodes are loaded, positioned and scaled, process edges

            // Handle edge files (CSV or YAML)
            const edgeFiles = Array.isArray(edgePaths) ? edgePaths : (edgePaths ? [edgePaths] : []);
            if (edgeFiles.length > 0) {
                this.log(`Processing edges from ${edgeFiles.length} dedicated edge files`);
                await this.readerManager.processEdgeFiles(edgeFiles, this.renderer.styleHandler);
            }
            
            // Process edges from mixed YAML file if provided
            if (mixedYamlFile) {
                this.log(`Processing edges from mixed YAML file: ${mixedYamlFile}`);
                await this.readerManager.processEdgeFiles([mixedYamlFile], this.renderer.styleHandler);
            }

        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    async loadPositions(positionFile) {
        this.log(`Loading positions from ${positionFile}`);
        const positions = await PositionReader.readFromCsv(positionFile);
        const nodes = this.readerManager.getNodes();
        
        positions.forEach((pos, name) => {
            let node = nodes.get(name);
            
            if (node) {
                // Store unscaled position (no scaling applied here anymore)
                node.xUnscaled = pos.xUnscaled;
                node.yUnscaled = pos.yUnscaled;
                // The x,y values will be set in applyScalingToAllNodes
                this.log(`Set unscaled position of node '${name}' to (${node.xUnscaled}, ${node.yUnscaled})`);
            } else {
                // Create new node with unscaled values
                node = {
                    name: name,
                    label: name,
                    // Don't set scaled x,y here - will be set in applyScalingToAllNodes
                    xUnscaled: pos.xUnscaled,
                    yUnscaled: pos.yUnscaled,
                    // Don't apply scaling to dimensions either
                    heightUnscaled: 1,
                    widthUnscaled: 1,
                    // These will be set in applyScalingToAllNodes
                    height: undefined,
                    width: undefined,
                    x: undefined,
                    y: undefined,
                    type: 'default',
                    anchor: null,
                    anchorVector: null
                };

                nodes.set(name, node);
                this.log(`Created new node '${name}' with unscaled position (${node.xUnscaled}, ${node.yUnscaled})`);
            }
        });
    }

    // Method for positioning and scaling all nodes
    positionAndScaleAllNodes() {
        const nodes = this.readerManager.getNodes();
        const scaleConfig = this.renderer.styleHandler.getPageScale();
        
        // Single pass through all nodes in the order they appear
        for (const [nodeName, node] of nodes.entries()) {
            // First handle relative positioning if needed
            if (node.relative) {
                const referenceNodeName = node.relative_to;
                const referenceNode = nodes.get(referenceNodeName);
                
                /*
                                const node = processRelativeNode(
                    doc, 
                    nodesMap, 
                    scale, 
                    renderer, 
                    NodeReader.processNodeRecord
                );
                */

                if (referenceNode) {
                    // Process relative position using the reference node
                    processRelativeNode(node, referenceNode);
                    this.log(`Positioned relative node '${nodeName}' based on reference '${referenceNodeName}'`);
                } else {
                    console.warn(`Warning: Cannot position node '${nodeName}' - reference node '${referenceNodeName}' not found`);
                    // Set default position for nodes with missing references
                    node.x = 0;
                    node.y = 0;
                }
            } else {
                // For non-relative nodes, use unscaled coords (or defaults)
                if (node.xUnscaled === undefined) {
                    node.xUnscaled = node.x !== undefined ? node.x : 0;
                }
                if (node.yUnscaled === undefined) {
                    node.yUnscaled = node.y !== undefined ? node.y : 0;
                }
                
                // Apply position scaling
                node.x = node.xUnscaled * scaleConfig.position.x;
                node.y = node.yUnscaled * scaleConfig.position.y;
            }
            
            // Apply dimension scaling to all nodes (relative or not)
            if (node.widthUnscaled === undefined) {
                node.widthUnscaled = node.width !== undefined ? node.width : 1;
            }
            if (node.heightUnscaled === undefined) {
                node.heightUnscaled = node.height !== undefined ? node.height : 1;
            }
            
            // Apply scaling to dimensions
            node.width = node.widthUnscaled * scaleConfig.size.w;
            node.height = node.heightUnscaled * scaleConfig.size.h;
            
            // Recalculate anchor vector with scaled dimensions
            node.anchorVector = this.renderer.getNodeAnchor(node);
            
            this.log(`Scaled node '${nodeName}' to (${node.x}, ${node.y}) with dimensions ${node.width}x${node.height}`);
        }
    }
}

module.exports = DiagramBuilder;