'use strict';
const PositionReader = require('./io/readers/position-reader');
const ReaderManager = require('./io/reader-manager');
const LatexRenderer = require('./renderers/latex-renderer');
const { 
    setPositionRelativeToNode, 
    setSizeRelativeToNodes,
    setPositionFromReference,
    setPositionFromAnchorPoint 
} = require('./io/readers/relative-node-processor');
//const { Node } = require('./io/models/node');
const fs = require('fs');
const LatexStyleHandler = require('./styles/latex-style-handler');
const path = require('path');
const { Direction } = require('./geometry/direction');
const { getNodeConnectionPoint } = require('./geometry/node-connection-point');
const EdgeReader = require('./io/readers/edge-reader');
        

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

            // Merge all node records after loading from all sources
            this.log('Merging all node records');
            const mergedRecords = this.readerManager.mergeNodeRecords();
            
            // Create Node objects from merged records
            this.log('Creating Node objects from merged records');
            this.readerManager.createNodesFromRecords(mergedRecords);

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
                // The xScaled,yScaled values will be set in applyScalingToAllNodes
                this.log(`Set unscaled position of node '${name}' to (${node.xUnscaled}, ${node.yUnscaled})`);
            } else {
                // Create new node with unscaled values
                node = {
                    name: name,
                    label: name,
                    // Don't set scaled xScaled,yScaled here - will be set in applyScalingToAllNodes
                    xUnscaled: pos.xUnscaled,
                    yUnscaled: pos.yUnscaled,
                    // Don't apply scaling to dimensions either
                    heightUnscaled: 1,
                    widthUnscaled: 1,
                    // These will be set in applyScalingToAllNodes
                    height: undefined,
                    width: undefined,
                    xScaled: undefined,
                    yScaled: undefined,
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

        // Single pass: handle both relative sizing and positioning
        for (const [nodeName, node] of nodes.entries()) {
            // First handle size relative to other nodes
            setSizeRelativeToNodes(node, nodes, scaleConfig, this.log);
            
            // Check for new relative positioning using x_of and y_of
            const hasNewRelativePos = node.x_of !== undefined || node.y_of !== undefined;
            const hasPositionOf = node.position_of !== undefined;
            
            this.log(`${nodeName}: hasNewRelativePos=${hasNewRelativePos}, x_of=${node.x_of}, y_of=${node.y_of}, position_of=${node.position_of}`);
            
            // Handle position_of property (new simpler approach)
            if (hasPositionOf) {
                this.log(`Using position_of for node ${nodeName}: ${node.position_of}`);
                
                // Find reference node
                const refNodeName = node.position_of.split('.')[0];
                const referenceNode = nodes.get(refNodeName);
                
                if (referenceNode) {
                    // Process position using the reference node
                    setPositionRelativeToNode(node, referenceNode, this.renderer.styleHandler);
                    this.log(`Positioned node '${nodeName}' based on position_of '${node.position_of}'`);
                }
            }
            // Then handle relative positioning if needed
            else if (hasNewRelativePos) {
                this.log(`Using new relative positioning for node ${nodeName}`);
                
                // Handle simple reference node positioning (x_of, y_of)
                if ((node.x_of && !node.x_of.includes('.')) || (node.y_of && !node.y_of.includes('.'))) {
                    this.log(`Using reference-based positioning for ${nodeName}`);
                    setPositionFromReference(node, nodes, scaleConfig, this.log);
                    this.log(`Positioned node '${nodeName}' with x_of/y_of reference`);
                }
                
                // Handle anchor point positioning (node.anchor)
                if ((node.x_of && node.x_of.includes('.')) || (node.y_of && node.y_of.includes('.'))) {
                    this.log(`Using anchor-based positioning for ${nodeName}`);
                    setPositionFromAnchorPoint(node, nodes, scaleConfig);
                    this.log(`Positioned node '${nodeName}' with reference anchor points`);
                }
            }
            // Legacy relative positioning - keep for backward compatibility
            else if (node.relative_to) {
                const referenceNodeName = node.relative_to;
                const referenceNode = nodes.get(referenceNodeName);
                
                // Process relative position using the reference node
                setPositionRelativeToNode(node, referenceNode, this.renderer.styleHandler);
                this.log(`Positioned relative node '${nodeName}' based on legacy reference '${referenceNodeName}'`);
            } else {
                // For non-relative nodes, use unscaled coords (or defaults)
                if (node.xUnscaled === undefined) {
                    node.xUnscaled = 0;
                }
                if (node.yUnscaled === undefined) {
                    node.yUnscaled = 0;
                }
   
                // Apply position scaling
                node.xScaled = node.xUnscaled * scaleConfig.position.x;
                node.yScaled = node.yUnscaled * scaleConfig.position.y;
            }
            
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
            
            this.log(`Scaled node '${nodeName}' to (${node.xScaled}, ${node.yScaled}) with dimensions ${node.width}x${node.height}`);
        }
    }
}

module.exports = DiagramBuilder;