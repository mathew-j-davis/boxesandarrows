#!/usr/bin/env node
/**
 * Convert YAML diagram to CSV + Style JSON format
 * Usage: node yaml-to-csv-converter.js <input.yaml> <output-prefix>
 */

const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

function convertYamlToCsv(inputFile, outputPrefix) {
    console.log(`Converting ${inputFile} to CSV format...`);

    // Read YAML file
    const yamlContent = fs.readFileSync(inputFile, 'utf8');
    const documents = yaml.loadAll(yamlContent);

    const nodes = [];
    const edges = [];
    let pageConfig = null;
    let svgDefinitions = '';
    let svgStyles = '';

    // Parse all YAML documents
    for (const item of documents) {
        if (!item) continue;

        if (item.type === 'page') {
            pageConfig = item;
            svgDefinitions = item.svg_definitions || '';
            svgStyles = item.svg_styles || '';
        } else if (item.type === 'node') {
            nodes.push(item);
        } else if (item.type === 'edge') {
            edges.push(item);
        }
    }

    console.log(`Found ${nodes.length} nodes, ${edges.length} edges`);

    // Convert nodes to CSV
    const nodeHeaders = ['name', 'label', 'shape', 'x', 'y', 'w', 'h', 'anchor',
                         'x_of', 'y_of', 'position_of', 'x_offset', 'y_offset',
                         'w_of', 'h_of', 'w_offset', 'h_offset',
                         'hide_label', 'label_above', 'label_below',
                         'css_class', 'fill_color', 'edge_color', 'text_color',
                         'font_size', 'font_weight', 'font_family'];

    const nodeCsvRows = [nodeHeaders.join(',')];

    for (const node of nodes) {
        const row = nodeHeaders.map(header => {
            const value = node[header];
            if (value === undefined || value === null) return '';
            // Escape and quote values that contain commas or newlines
            const strValue = String(value);
            if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
                return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
        });
        nodeCsvRows.push(row.join(','));
    }

    // Convert edges to CSV
    const edgeHeaders = ['from', 'to', 'label', 'start_anchor', 'end_anchor',
                         'start_arrow', 'end_arrow', 'path_type', 'style',
                         'waypoints'];

    const edgeCsvRows = [edgeHeaders.join(',')];

    for (const edge of edges) {
        // Serialize waypoints as JSON string if present
        if (edge.waypoints && Array.isArray(edge.waypoints)) {
            edge.waypoints = JSON.stringify(edge.waypoints);
        }

        const row = edgeHeaders.map(header => {
            const value = edge[header];
            if (value === undefined || value === null) return '';
            const strValue = String(value);
            if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
                return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
        });
        edgeCsvRows.push(row.join(','));
    }

    // Create style JSON
    const styleJson = {
        page: {
            background: pageConfig?.background || 'white',
            scale: pageConfig?.scale || {
                position: { x: 20, y: 20 },
                size: { w: 20, h: 20 }
            },
            margin: pageConfig?.margin || { w: 1, h: 1 }
        },
        svg_definitions: svgDefinitions,
        svg_styles: svgStyles,
        style: {
            base: {
                node: {
                    object: {
                        svg: {
                            shape: "rectangle",
                            fill: "#ffffff",
                            stroke: "#000000",
                            "stroke-width": 1
                        }
                    }
                },
                edge: {
                    object: {
                        svg: {
                            stroke: "#000000",
                            "stroke-width": 1
                        }
                    }
                }
            }
        }
    };

    // Write output files
    const nodesCsvPath = `${outputPrefix}-nodes.csv`;
    const edgesCsvPath = `${outputPrefix}-edges.csv`;
    const styleJsonPath = `${outputPrefix}-style.json`;

    fs.writeFileSync(nodesCsvPath, nodeCsvRows.join('\n'), 'utf8');
    console.log(`✓ Wrote nodes to ${nodesCsvPath}`);

    fs.writeFileSync(edgesCsvPath, edgeCsvRows.join('\n'), 'utf8');
    console.log(`✓ Wrote edges to ${edgesCsvPath}`);

    fs.writeFileSync(styleJsonPath, JSON.stringify(styleJson, null, 2), 'utf8');
    console.log(`✓ Wrote style to ${styleJsonPath}`);

    console.log('\nTo render the diagram, use:');
    console.log(`node src/index.js -n ${nodesCsvPath} -e ${edgesCsvPath} -s ${styleJsonPath} -r svg -o <output>`);
}

// Main
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: node yaml-to-csv-converter.js <input.yaml> <output-prefix>');
        console.log('Example: node yaml-to-csv-converter.js diagram.yaml output/diagram');
        process.exit(1);
    }

    const [inputFile, outputPrefix] = args;

    if (!fs.existsSync(inputFile)) {
        console.error(`Error: Input file not found: ${inputFile}`);
        process.exit(1);
    }

    convertYamlToCsv(inputFile, outputPrefix);
}

module.exports = { convertYamlToCsv };
