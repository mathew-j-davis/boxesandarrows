'use strict';
const PositionReader = require('./io/readers/position-reader');
const ReaderManager = require('./io/reader-manager');
const LatexRenderer = require('./renderers/latex-renderer');
const { Node } = require('./io/models/node');
const fs = require('fs');
const LatexStyleHandler = require('./styles/latex-style-handler');
const path = require('path');
const { Direction } = require('./geometry/direction');
const { getNodeConnectionPoint } = require('./geometry/node-connection-point');
const EdgeReader = require('./io/readers/edge-reader');
const { Position, PositionType } = require('./geometry/position');
const Dimensions = require('./geometry/dimensions');
//const StyleCollection = require('./io/style-collection');
const DynamicProperty = require('./io/models/dynamic-property');

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
            // Process style files
            const styleFiles = Array.isArray(stylePaths) ? stylePaths : (stylePaths ? [stylePaths] : []);
            let allStyleRecords = [];
            
            if(styleFiles.length > 0) {
                this.log(`Processing styles from ${styleFiles.length} dedicated style files`);
                allStyleRecords = await this.readerManager.processStyleFiles(styleFiles, this.renderer.styleHandler);
            }

            // Process edges from mixed YAML file if provided
            if (mixedYamlFile) {
                this.log(`Processing styles from mixed YAML file: ${mixedYamlFile}`);
                const mixedStyleRecords = await this.readerManager.processStyleFiles([mixedYamlFile], this.renderer.styleHandler);
                
                // Add mixed style records to all style records
                allStyleRecords = [...allStyleRecords, ...mixedStyleRecords];
            }
            
            this.renderer.styleHandler.loadPageAndStyles(allStyleRecords) 

            // // Apply all collected styles to the style handler
            // for (const styleRecord of allStyleRecords) {
            //     this.renderer.styleHandler.mergeStylesheet(styleRecord);
            // }


            // for (const rec of allStyleRecords) {
            //   if (rec.style) {
            //     for (const [name, data] of Object.entries(rec.style)) {
            //       const rawProps = data._dynamicProperties || data.dynamicProperties || [];
            //       this.renderer.styleHandler.addStyleProperties(rawProps, name);
            //     }
            //   }
            // }

            // for (const rec of allStyleRecords) {
            //     if (rec.style) {
            //       for (const [name, data] of Object.entries(rec.style)) {
            //         const rawProps = data._dynamicProperties || data.dynamicProperties || [];
            //         this.renderer.styleHandler.addStyleProperties(rawProps, name);
            //       }
            //     }
            
            //     if (rec.page) {
            //       for (const [name, data] of Object.entries(rec.page)) {
            //         const rawProps = data._dynamicProperties || data.dynamicProperties || [];
            //         this.renderer.styleHandler.addPageProperties(rawProps, name);
            //       }
            //     }
            // }



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
            
            // Create nodes from the merged records
            this.log('Creating nodes from merged records');
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
            this.log(`Error loading data: ${error.message}`);
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
                // Store unscaled position
                node.x = pos.xUnscaled;
                node.y = pos.yUnscaled;

                // The position object values will be set in applyScalingToAllNodes
                this.log(`Set unscaled position of node '${name}' to (${node.x}, ${node.y})`);
            } else {
                // Create new node with position values
                node = {
                    name: name,
                    label: name,
                    x: pos.xUnscaled,
                    y: pos.yUnscaled,
                    // Don't apply scaling to dimensions
                    height: 1,
                    width: 1,
                    // These will be set in applyScalingToAllNodes
                    heightScaled: undefined,
                    widthScaled: undefined,
                    type: 'default',
                    anchor: null,
                    anchorVector: null
                };

                nodes.set(name, node);
                this.log(`Created new node '${name}' with position (${node.x}, ${node.y})`);
            }
        });
    }

    // Method for positioning and scaling all nodes
    positionAndScaleAllNodes() {
        const nodes = this.readerManager.getNodes();
        const scaleConfig = this.renderer.styleHandler.getPageScale();

        // Single pass: handle both relative sizing and positioning
        for (const [nodeName, node] of nodes.entries()) {
            
            const position = Position.calculatePositionAndScale(nodes, node.x, node.y, node.at, node.position_of, node.x_of, node.y_of, undefined, undefined, node.x_offset, node.y_offset, scaleConfig)
            
            node["position"] = position;

            node["dimensions"] = Dimensions.calculateDimensionsAndScale(nodes, node.width, node.height, node.w_of, node.h_of, node.w_from, node.h_from, node.w_to, node.h_to, node.w_offset, node.h_offset, scaleConfig);


            // Recalculate anchor vector with scaled dimensions
            node.anchorVector = this.renderer.getNodeAnchor(node);
            
            this.log(`Scaled node '${nodeName}' to (${node?.position?.xScaled}, ${node?.position?.yScaled}) with dimensions ${node.dimensions.widthScaled}x${node.dimensions.heightScaled}`);
        }
    }
}

module.exports = DiagramBuilder;