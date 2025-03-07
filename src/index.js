'use strict';
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const PositionReader = require('./io/readers/position-reader');
const ReaderManager = require('./io/reader-manager');
const LatexRenderer = require('./renderers/latex');
const ConfigurationManager = require('./configuration-manager');

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

            // STEP 3: Now that all nodes are loaded and positioned, process edges
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
            let x = pos.xUnscaled * this.configManager.getScaleConfig().position.x;
            let y = pos.yUnscaled * this.configManager.getScaleConfig().position.y;
            
            if (node) {
                node.xUnscaled = pos.xUnscaled;
                node.yUnscaled = pos.yUnscaled;
                node.x = x;
                node.y = y;
                this.log(`Updated position of node '${name}' to (${node.x}, ${node.y})`);
            } else {
                node = {
                    name: name,
                    label: name,
                    x: x,
                    y: y,
                    xUnscaled: pos.xUnscaled,
                    yUnscaled: pos.yUnscaled,
                    height: 1 * this.scale.size.h,
                    width: 1 * this.scale.size.w,
                    heightUnscaled: 1,
                    widthUnscaled: 1,
                    type: 'default',
                    anchor: null,
                    anchorVector: null
                };

                node.anchorVector = this.renderer.getNodeAnchor(node);

                nodes.set(name, node);
                this.log(`Created new node '${name}' at position (${node.x}, ${node.y})`);
            }
        });
    }
}

async function main() {
    const argv = minimist(process.argv.slice(2));

    // No longer require node and edge files - they're optional now
    if (argv.help || argv.h) {
        console.log('Usage: node src/index.js [-n <nodes.csv,nodes.yaml>] [-e <edges.csv,edges.yaml>] [-y <mixed.yaml>] [-m <positions.csv>] [-s <style.json>] [-o <output/diagram>] [-g <grid_spacing>] [--invert-y] [--verbose]');
        console.log('  -n, --nodes      Comma-separated list of node files (CSV or YAML)');
        console.log('  -e, --edges      Comma-separated list of edge files (CSV or YAML)');
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