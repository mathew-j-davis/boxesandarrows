const fs = require('fs');
const CsvReader = require('./csv-reader');
const yaml = require('js-yaml');
const YamlReader = require('./yaml-reader');
const Node = require('../models/node');

class NodeReader {

    static async readFromCsv(nodeFile) {
        const records = await CsvReader.readFile(nodeFile);
        return records.map(record => this.processNodeRecord(record));
    }

    static async readRecordsFromCsv(nodeFile) {
        return await CsvReader.readFile(nodeFile);
    }

        /**
     * Read nodes from a YAML file
     * @param {string} yamlFile - Path to the YAML file
     * @returns {Promise<Array>} - Array of node records
     */
    static async readRecordsFromYaml(yamlFile) {
        return await YamlReader.readFile(yamlFile, { 
            filter: doc => doc && doc.type === 'node' 
        });
    }

    /**
     * Read nodes from a YAML file
     * @param {string} yamlFile - Path to the YAML file
     * @returns {Promise<Array>} - Array of processed node objects
     */
    static async readFromYaml(yamlFile) {
        const records = await YamlReader.readFile(yamlFile, { 
            filter: doc => doc && doc.type === 'node' 
        });
        return records.map(record => this.processNodeRecord(record));
    }
    
    static processNodeRecord(record) {
        // Store unscaled position values

        // const defaultHeight = 1;
        // const defaultWidth = 1;

        const xUnscaled = record.x !== undefined && record.x !== '' ? 
            parseFloat(record.x) : 0;
        const yUnscaled = record.y !== undefined && record.y !== '' ? 
            parseFloat(record.y) : 0;

        // Apply position scaling
        const x = null; // xUnscaled * scale.position.x;
        const y = null; //yUnscaled * scale.position.y;

        // Store unscaled size values with priority: CSV > Style > Default
        const widthUnscaled = 
            record.width !== undefined && record.width !== '' 
                ? parseFloat(record.width) 
                : (record.w !== undefined && record.w !== '' 
                    ? parseFloat(record.w) 
                    : undefined);
                    
        const heightUnscaled = 
            record.height !== undefined && record.height !== '' 
                ? parseFloat(record.height) 
                : (record.h !== undefined && record.h !== '' 
                    ? parseFloat(record.h) 
                    : undefined);
        


        // Validate scale object structure or use defaults
        //const nodeScale = scale?.size || { w: 1, h: 1 };

        // Apply node size scaling with validated scale object
        const width = null; //widthUnscaled * nodeScale.w;
        const height = null; //heightUnscaled * nodeScale.h;

        let nodeProperties = {
            name: record.name,

            label: record.label,
            hide_label: record.hide_label,
            label_above: record.label_above,
            label_below: record.label_below,
            relative_to: record.relative_to,
            relative_to_anchor: record.relative_to_anchor,
            relative_offset_x: record.relative_offset_x,
            relative_offset_y: record.relative_offset_y,
            anchor: record.anchor,
            anchorVector: null,
            shape: record.shape,
            x,
            y,
            xUnscaled,
            yUnscaled,

            width,
            height,
            widthUnscaled,
            heightUnscaled,
            type: record.type || 'default',
            style: record.style,
            tikz_object_attributes: record.tikz_object_attributes,
            //mergedStyle,  // Store processed style for rendering
            edge_color: record.edge_color,
            fillcolor: record.fillcolor,
            textcolor: record.textcolor,

            // Add relative sizing fields
            h_of: record.h_of,
            h_from: record.h_from,
            h_to: record.h_to,
            h_offset: record.h_offset ? parseFloat(record.h_offset) : 0,
            
            w_of: record.w_of,
            w_from: record.w_from,
            w_to: record.w_to,
            w_offset: record.w_offset ? parseFloat(record.w_offset) : 0,
            
            // Store the original record(s)
            records: [{ ...record }],
            
            // Initialize output storage
            latex_output: ''
        };

        return new Node(nodeProperties);
    }
}

module.exports = NodeReader; 