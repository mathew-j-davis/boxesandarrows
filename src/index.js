'use strict';
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const PositionReader = require('./io/readers/position-reader');
const ReaderManager = require('./io/reader-manager');
const LatexRenderer = require('./renderers/latex');
const LatexPageHandler = require('./styles/latex-page-handler');
const { processRelativeNode } = require('./io/readers/relative-node-processor');

class DiagramBuilder {
    constructor(options = {}) {
        this.verbose = options.verbose || false;
        this.grid = options.grid || null;
        this.rendererType = options.renderer;
        this.log = this.verbose ? console.log.bind(console) : () => {};
        
        // Store all options
        this.options = options;

        // Initialize the latex page handler 
        this.latexPageHandler = new LatexPageHandler({
            verbose: this.verbose
        });

        // Standardize on 'styleFile' for the file path
        if (options.styleFile) {
            const styleFile = options.styleFile;
            this.latexPageHandler.loadConfigFromFile(styleFile);
        }

        // Create renderer based on type and pass the configuration
        this.renderer = this.createRenderer(this.rendererType, options);

        // Initialize the reader manager and pass the scale configuration
        this.readerManager = new ReaderManager(
            this.renderer, 
            this.latexPageHandler.getScaleConfig()
        );
        
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

    async loadData(nodePaths, edgePaths, positionFile, mixedYamlFile) {
        try {


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
            
            // Load and apply position data
            if (positionFile) {
                await this.loadPositions(positionFile);
            } else {
                this.log('No position file specified; using positions from node files or default (0,0).');
            }

            this.positionAndScaleAllNodes();

            // STEP 3: Now that all nodes are loaded, positioned and scaled, process edges

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
        const scaleConfig = this.latexPageHandler.getScaleConfig();
        
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
    // Command line argument parsing
    const args = process.argv.slice(2);
    const options = {
        nodeFiles: [],
        edgeFiles: [],
        yamlFiles: [],
        mapFile: null,
        styleFile: null,
        outputFile: 'output/diagram',
        grid: null,
        verbose: false
    };

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '-n':
            case '--nodes':
                if (i + 1 < args.length) {
                    options.nodeFiles = args[++i].split(',').map(f => f.trim());
                }
                break;
            
            case '-e':
            case '--edges':
                if (i + 1 < args.length) {
                    options.edgeFiles = args[++i].split(',').map(f => f.trim());
                }
                break;
                
            case '-y':
            case '--yaml':
                if (i + 1 < args.length) {
                    options.yamlFiles = args[++i].split(',').map(f => f.trim());
                }
                break;
                
            case '-m':
            case '--map':
                if (i + 1 < args.length) {
                    options.mapFile = args[++i];
                }
                break;
                
            case '-s':
            case '--style':
                if (i + 1 < args.length) {
                    options.styleFile = args[++i];
                }
                break;
                
            case '-o':
            case '--output':
                if (i + 1 < args.length) {
                    options.outputFile = args[++i];
                }
                break;
                
            case '-g':
            case '--grid':
                if (i + 1 < args.length) {
                    options.grid = parseFloat(args[++i]);
                }
                break;
                                
            case '--verbose':
                options.verbose = true;
                break;
                
            case '-r':
            case '--renderer':
                if (i + 1 < args.length) {
                    options.renderer = args[++i];
                }
                break;
                
            case '-h':
            case '--help':
                showHelp();
                process.exit(0);
                break;
                
        }
    }

    // Validate that we have at least one source of node data
    if (
        (!options.nodeFiles || options.nodeFiles.length === 0) && 
        (!options.yamlFiles || options.yamlFiles.length === 0) && 
        !options.mapFile
    ) {
        console.error('Error: At least one node file (-n), mixed YAML file (-y), or position map (-m) must be provided.');
        showHelp();
        process.exit(1);
    }

    function showHelp() {
        console.log('Usage: node src/index.js [-n <nodes.csv,nodes.yaml>] [-e <edges.csv,edges.yaml>] [-y <mixed.yaml>] [-m <positions.csv>] [-s <style.json>] [-o <output/diagram>] [-g <grid_spacing>] [--verbose]');
        console.log('  -n, --nodes      Comma-separated list of node files (CSV) or equivalent data in YAML');
        console.log('  -e, --edges      Comma-separated list of edge files (CSV) or equivalent data in YAML');
        console.log('  -y, --yaml       Mixed YAML file containing both nodes and edges (edges processed after nodes and position map)');
        console.log('  -m, --map        Position map file (CSV)');
        console.log('  -s, --style      Style file (JSON)');
        console.log('  -o, --output     Output file path (default: output/diagram)');
        console.log('  -g, --grid       Grid spacing (optional)');
        console.log('  --verbose        Show verbose output');
        console.log('  -r, --renderer   Output renderer type (latex, text) [default: latex]');
        console.log('  -h, --help       Show this help message');
    }

    const diagramBuilder = new DiagramBuilder({
        grid: options.grid,
        verbose: options.verbose,
        renderer: options.renderer || 'latex',
        styleFile: options.styleFile
    });

    try {
        // Parse comma-separated lists of node and edge files
        const nodeFiles = options.nodeFiles;
        const edgeFiles = options.edgeFiles;
        const mixedYamlFile = options.yamlFiles[0] || null;
        
        await diagramBuilder.loadData(nodeFiles, edgeFiles, options.mapFile, mixedYamlFile);
        if (diagramBuilder.verbose) {
            const nodeCount = diagramBuilder.readerManager.getNodes().size;
            const edgeCount = diagramBuilder.readerManager.getEdges().length;
            console.log(`Loaded ${nodeCount} nodes and ${edgeCount} edges`);
        }

        const outputPath = options.outputFile || 'output/diagram';
        await diagramBuilder.renderDiagram(outputPath);
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