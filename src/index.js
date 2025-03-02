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
        this.log = this.verbose ? console.log.bind(console) : () => {};
        
        // Store all options
        this.options = options;

        // Create renderer based on type
        const rendererType = options.renderer || 'latex';
        this.renderer = this.createRenderer(rendererType, options);

        // Load style if provided
        this.style = options.stylePath ? this.renderer.loadStyle(options.stylePath) : {};

        // Let renderer define its scaling requirements
        this.scale = this.renderer.getScaleConfig(this.style);

        this.nodes = new Map();
        this.importedNodes = [];
        this.importedEdges = [];
        this.nodePositions = new Map();
        this.invertY = options.invertY || false;
    }

    createRenderer(type, options) {
        switch (type.toLowerCase()) {
            case 'latex':
                return new LatexRenderer({
                    ...options,
                    stylePath: options.stylePath
                });
            default:
                throw new Error(`Unknown renderer type: ${type}`);
        }
    }

    async renderDiagram(outputPath) {
        // Let renderer handle the full output path
        //const fullPath = this.renderer.getOutputPath(outputPath);
        
        // Pass rendering options including grid parameter if set
        const renderOptions = {};
        if (this.options && this.options.grid) {
            // Grid spacing is in unscaled coordinates
            // The renderer will handle drawing the grid at scaled positions
            // but with unscaled coordinate labels
            renderOptions.grid = parseFloat(this.options.grid);
        }
        
        await this.renderer.render(this.importedNodes, this.importedEdges, outputPath, renderOptions);
        
        if (this.verbose) {
            console.log(`Diagram rendered to ${outputPath}`);
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
                    height: 1 * this.scale.size.h,
                    width: 1 * this.scale.size.w,
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
        console.error('Usage: node src/index.js -n <nodes.csv> -e <edges.csv> [-m <positions.csv>] [-s <style.json>] [-o <output/diagram>] [-g <grid_spacing>] [--invert-y] [--verbose]');
        process.exit(1);
    }

    const builder = new DiagramBuilder({
        stylePath: argv.s,
        invertY: argv['invert-y'] || false,
        verbose: argv.verbose || false,
        grid: argv.g // Pass grid parameter
    });

    try {
        await builder.loadData(argv.n, argv.e, argv.m);
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