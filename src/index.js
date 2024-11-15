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

        this.nodes = new Map();
        this.importedNodes = [];
        this.importedEdges = [];
        this.nodePositions = new Map();
        this.style = this.loadStyle(options.stylePath);
        this.invertY = options.invertY || false;
        this.scale = this.style.scale || { x: 1, y: 1, h: 1, w: 1 };
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

    async loadData(nodeFile, positionFile, edgeFile) {
        try {
            const [nodes, edges] = await Promise.all([
                NodeReader.readFromCsv(nodeFile),
                EdgeReader.readFromCsv(edgeFile)
            ]);

            this.importedNodes = nodes;
            this.importedEdges = edges;

            // Collect all y-values to find maxY if needed
            let allYValues = [];

            // Initialize nodes
            this.importedNodes.forEach(node => {
                node.name = node.name || `Node_${Math.random().toString(36).substr(2, 5)}`;

                // Apply scaling to positions
                node.x = (node.x !== undefined) ? node.x * this.scale.x : 0;
                node.y = (node.y !== undefined) ? node.y * this.scale.y : 0;

                // Collect y-values before potential inversion
                allYValues.push(node.y);

                // Apply scaling to dimensions
                node.h = (node.h !== undefined) ? node.h * this.scale.h : undefined;
                node.w = (node.w !== undefined) ? node.w * this.scale.w : undefined;

                node.label = node.label || node.name;
                this.nodes.set(node.name, node);
            });

            // Read positions from the position file and process nodes
            if (positionFile) {
                this.log(`Loading positions from ${positionFile}`);
                const positions = await PositionReader.readFromCsv(positionFile);
                positions.forEach((pos, name) => {
                    let node = this.nodes.get(name);
                    let x = pos[0] * this.scale.x; // Apply scaling to positions
                    let y = pos[1] * this.scale.y;
                    allYValues.push(y);
                    if (node) {
                        node.x = x;
                        node.y = y;
                        this.log(`Updated position of node '${name}' to (${node.x}, ${node.y})`);
                    } else {
                        node = {
                            name: name,
                            label: name,
                            x: x,
                            y: y,
                            h: undefined,
                            w: undefined,
                            type: 'default' // Assign a default type or adjust as needed
                        };
                        this.nodes.set(name, node);
                        this.importedNodes.push(node);
                        this.log(`Created new node '${name}' at position (${node.x}, ${node.y})`);
                    }
                });
            } else {
                this.log('No position file specified; using positions from node file or default (0,0).');
            }

            // Invert y-coordinates if invertY is true
            if (this.invertY) {
                const maxY = Math.max(...allYValues);
                this.importedNodes.forEach(node => {
                    node.y = maxY - node.y;
                    this.log(`Inverted y-position of node '${node.name}' to (${node.x}, ${node.y})`);
                });
            }

        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    async renderDiagram(outputPath) {
        const renderer = new LatexRenderer(this.style, { verbose: this.verbose });

        // Add nodes and edges to the renderer
        this.importedNodes.forEach(node => renderer.renderNode(node));
        this.importedEdges.forEach(edge => {
            const fromNode = this.nodes.get(edge.from_name);
            const toNode = this.nodes.get(edge.to_name);
            renderer.renderEdge(edge, fromNode, toNode);
        });

        // Save the LaTeX content to a .tex file
        const texFilePath = `${outputPath}.tex`;
        const latexContent = renderer.getLatexContent();
        fs.writeFileSync(texFilePath, latexContent, 'utf8');
        this.log(`LaTeX source saved to ${texFilePath}`);

        // Compile the .tex file to a .pdf file
        await renderer.compileToPdf(texFilePath);
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
        await builder.loadData(argv.n, argv.m, argv.e);
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