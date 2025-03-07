'use strict';
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const PositionReader = require('./io/readers/position-reader');
const ReaderManager = require('./io/reader-manager');
const LatexRenderer = require('./renderers/latex');
const ConfigurationManager = require('./configuration-manager');
const { processRelativeNode } = require('./io/readers/relative-node-processor');

class DiagramBuilder {
    constructor(options = {}) {
        this.verbose = options.verbose || false;
        this.log = this.verbose ? console.log.bind(console) : () => {};
        
        // Store all options
        this.options = options;

        // Initialize the configuration manager
        this.configManager = new ConfigurationManager({
            verbose: this.verbose
        });

        // Load configuration from style file if provided
        if (options.stylePath) {
            this.configManager.loadConfigFromFile(options.stylePath);
        }

        // Create renderer based on type and pass the configuration
        const rendererType = options.renderer || 'latex';
        this.renderer = this.createRenderer(rendererType, options);

        // Initialize the reader manager and pass the scale configuration
        this.readerManager = new ReaderManager(
            this.renderer, 
            this.configManager.getScaleConfig()
        );
        
        this.nodePositions = new Map();
        this.invertY = options.invertY || false;
    }

    createRenderer(type, options) {
        switch (type.toLowerCase()) {
            case 'latex':
                return new LatexRenderer({
                    ...options,
                    stylePath: options.stylePath,
                    pageConfig: this.configManager.getPageConfig()
                });
            default:
                throw new Error(`Unknown renderer type: ${type}`);
        }
    }

    async renderDiagram(outputPath) {
        // Pass rendering options including grid parameter if set on command line
        const renderOptions = {};
        if (this.options && this.options.grid) {
            // Grid spacing is in unscaled coordinates
            // The renderer will handle drawing the grid at scaled positions
            // but with unscaled coordinate labels
            renderOptions.grid = parseFloat(this.options.grid);
        }
        
        const nodes = Array.from(this.readerManager.getNodes().values());
        const edges = this.readerManager.getEdges();
        
        await this.renderer.render(nodes, edges, outputPath, renderOptions);
    }

    async loadData(nodePaths, edgePaths, positionFile, mixedYamlFile) {
        try {
            // STEP 1: Process all nodes first
            this.log('=== STEP 1: Loading all nodes ===');
            
            // Handle node files (CSV or YAML)
            const nodeFiles = Array.isArray(nodePaths) ? nodePaths : (nodePaths ? [nodePaths] : []);
            if (nodeFiles.length > 0) {
                this.log(`Processing nodes from ${nodeFiles.length} dedicated node files`);
                await this.readerManager.processNodeFiles(nodeFiles, this.scale);
            }
            
            // Process nodes from mixed YAML file if provided
            if (mixedYamlFile) {
                this.log(`Processing nodes from mixed YAML file: ${mixedYamlFile}`);
                await this.readerManager.processNodeFiles([mixedYamlFile], this.scale);
            }
            
            // STEP 2: Load and apply position data
            this.log('=== STEP 2: Loading and applying position data ===');
            if (positionFile) {
                await this.loadPositions(positionFile);
            } else {
                this.log('No position file specified; using positions from node files or default (0,0).');
            }

            // NEW STEP: Scale all node positions uniformly
            this.log('=== POSITION AND SCALE ALL NODES ===');

            this.positionAndScaleAllNodes();

            // STEP 3: Now that all nodes are loaded, positioned and scaled, process edges
            this.log('=== STEP 3: Processing all edges ===');
            
            // Handle edge files (CSV or YAML)
            const edgeFiles = Array.isArray(edgePaths) ? edgePaths : (edgePaths ? [edgePaths] : []);
            if (edgeFiles.length > 0) {
                this.log(`Processing edges from ${edgeFiles.length} dedicated edge files`);
                await this.readerManager.processEdgeFiles(edgeFiles, this.scale);
            }
            
            // Process edges from mixed YAML file if provided
            if (mixedYamlFile) {
                this.log(`Processing edges from mixed YAML file: ${mixedYamlFile}`);
                await this.readerManager.processEdgeFiles([mixedYamlFile], this.scale);
            }

            if (this.verbose) {
                const nodeCount = this.readerManager.getNodes().size;
                const edgeCount = this.readerManager.getEdges().length;
                console.log(`Successfully loaded ${nodeCount} nodes and ${edgeCount} edges`);
                if (positionFile) {
                    console.log(`Position data loaded from ${positionFile}`);
                }
                if (mixedYamlFile) {
                    console.log(`Mixed data loaded from ${mixedYamlFile}`);
                }
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
        const scaleConfig = this.configManager.getScaleConfig();
        
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

async function main() {
    const argv = minimist(process.argv.slice(2));

    // No longer require node and edge files - they're optional now
    if (argv.help || argv.h) {
        console.log('Usage: node src/index.js [-n <nodes.csv,nodes.yaml>] [-e <edges.csv,edges.yaml>] [-y <mixed.yaml>] [-m <positions.csv>] [-s <style.json>] [-o <output/diagram>] [-g <grid_spacing>] [--invert-y] [--verbose]');
        console.log('  -n, --nodes      Comma-separated list of node files (CSV) or equivalent data in YAML');
        console.log('  -e, --edges      Comma-separated list of edge files (CSV) or equivalent data in YAML');
        console.log('  -y, --yaml       Mixed YAML file containing both nodes and edges (edges processed after nodes and position map)');
        console.log('  -m, --map        Position map file (CSV)');
        console.log('  -s, --style      Style file (JSON)');
        console.log('  -o, --output     Output file path (default: output/diagram)');
        console.log('  -g, --grid       Grid spacing (optional)');
        console.log('  --invert-y       Invert Y coordinates');
        console.log('  --verbose        Show verbose output');
        console.log('  -h, --help       Show this help message');
        process.exit(0);
    }

    const builder = new DiagramBuilder({
        stylePath: argv.s,
        invertY: argv['invert-y'] || false,
        verbose: argv.verbose || false,
        grid: argv.g // Pass grid parameter
    });

    try {
        // Parse comma-separated lists of node and edge files
        const nodeFiles = argv.n ? argv.n.split(',') : [];
        const edgeFiles = argv.e ? argv.e.split(',') : [];
        const mixedYamlFile = argv.y || null;
        
        await builder.loadData(nodeFiles, edgeFiles, argv.m, mixedYamlFile);
        if (builder.verbose) {
            const nodeCount = builder.readerManager.getNodes().size;
            const edgeCount = builder.readerManager.getEdges().length;
            console.log(`Loaded ${nodeCount} nodes and ${edgeCount} edges`);
        }

        const outputPath = argv.o || 'output/diagram';
        await builder.renderDiagram(outputPath);
        console.log(`Diagram rendered to ${outputPath}.pdf`);
    } catch (error) {
        console.error('Failed to build diagram:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = DiagramBuilder; 