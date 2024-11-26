'use strict';
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const NodeReader = require('./io/readers/node-reader');
const EdgeReader = require('./io/readers/edge-reader');
const PositionReader = require('./io/readers/position-reader');
const LatexRenderer = require('./renderers/latex');

class DiagramBuilder {
    constructor(options = {}) {
        this.verbose = options.verbose || false;

        // Define a custom logger
        this.log = this.verbose ? console.log.bind(console) : () => {};

        // Load style first
        this.style = this.loadStyle(options.stylePath);
        
        // Create renderer early
        this.renderer = new LatexRenderer(this.style, { 
            verbose: this.verbose 
        });

        this.nodes = new Map();
        this.importedNodes = [];
        this.importedEdges = [];
        this.nodePositions = new Map();
        this.invertY = options.invertY || false;
        
        // Extract scaling configurations
        this.scale = {
            position: {
                x: this.style.scale?.position?.x || 1,
                y: this.style.scale?.position?.y || 1
            },
            node: {
                width: this.style.scale?.size?.node?.w || 1,
                height: this.style.scale?.size?.node?.h || 1
            }
        };
    }

    loadStyle(stylePath) {
        const styleFile = stylePath || './style-latex.json';
        try {
            const styleText = fs.readFileSync(styleFile, 'utf8');
            const style = JSON.parse(styleText);
            this.log('Style loaded:', style);
            return style;
        } catch (error) {
            console.error(`Failed to load or parse style file at ${styleFile}:`, error.message);
            process.exit(1);
        }
    }

    async loadData(nodesPath, edgesPath, positionFile) {
        try {
            // Load nodes first
            this.importedNodes = await NodeReader.readFromCsv(nodesPath, this.scale, this.renderer);
            
            // Initialize nodes map
            this.importedNodes.forEach(node => {
                node.name = node.name || `Node_${Math.random().toString(36).substr(2, 5)}`;
                node.label = node.label || node.name;
                this.nodes.set(node.name, node);
            });

            // Load positions if provided
            if (positionFile) {
                await this.loadPositions(positionFile);
            } else {
                this.log('No position file specified; using positions from node file or default (0,0).');
            }

            // Load edges with the renderer for style interpretation
            this.importedEdges = await EdgeReader.readFromCsv(
                edgesPath, 
                this.nodes, 
                this.scale,
                this.renderer  // Pass the renderer instance
            );

            if (this.verbose) {
                console.log(`Successfully loaded ${this.importedNodes.length} nodes and ${this.importedEdges.length} edges with positions from ${positionFile}`);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    async renderDiagram(outputPath) {
        // Use the existing renderer instance
        await this.renderer.render(this.importedNodes, this.importedEdges, outputPath);
        if (this.verbose) {
            console.log(`Diagram rendered to ${outputPath}.pdf`);
        }
    }

    async loadPositions(positionFile) {
        this.log(`Loading positions from ${positionFile}`);
        const positions = await PositionReader.readFromCsv(positionFile);
        
        positions.forEach((pos, name) => {
            let node = this.nodes.get(name);
            let x = pos.xUnscaled * this.scale.position.x;
            let y = pos.yUnscaled * this.scale.position.y;
            
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
                    height: 1 * this.scale.node.height,
                    width: 1 * this.scale.node.width,
                    heightUnscaled: 1,
                    widthUnscaled: 1,
                    type: 'default',
                    anchor: null,
                    anchorVector: null
                };


                node.anchorVector = this.renderer.getNodeAnchor(node);

                this.nodes.set(name, node);
                this.importedNodes.push(node);
                this.log(`Created new node '${name}' at position (${node.x}, ${node.y})`);
            }
        });
    }
}

async function main() {
    const argv = minimist(process.argv.slice(2));

    if (!argv.n || !argv.e) {
        console.error('Usage: node src/index.js -n <nodes.csv> -e <edges.csv> [-m <positions.csv>] [-s <style.json>] [-o <output/diagram>] [--invert-y] [--verbose]');
        process.exit(1);
    }

    const builder = new DiagramBuilder({
        stylePath: argv.s,
        invertY: argv['invert-y'] || false,
        verbose: argv.verbose || false
    });

    try {
        await builder.loadData(argv.n,  argv.e, argv.m,);
        if (builder.verbose) {
            console.log(`Loaded ${builder.importedNodes.length} nodes and ${builder.importedEdges.length} edges`);
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