const fs = require('fs');
const CsvReader = require('./csv-reader');
const yaml = require('js-yaml');
const YamlReader = require('./yaml-reader');
const { Node } = require('../models/node');

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
        const xUnscaled = record.x !== undefined && record.x !== '' ? 
            parseFloat(record.x) : 0;
        const yUnscaled = record.y !== undefined && record.y !== '' ? 
            parseFloat(record.y) : 0;

        // Apply position scaling - initialize as undefined for proper scaling later
        const xScaled = undefined; 
        const yScaled = undefined;

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
        
        // Initialize as undefined for proper scaling later
        const widthScaled = undefined;
        const heightScaled = undefined;

        let nodeProperties = {
            name: record.name,
            label: record.label,
            hide_label: record.hide_label,
            label_above: record.label_above,
            label_below: record.label_below,
            position_of: record.position_of,
            anchor: record.anchor,
            anchorVector: null,
            shape: record.shape,
            xScaled,
            yScaled,
            xUnscaled,
            yUnscaled,
            widthScaled,
            heightScaled,
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
            
            // Add new relative positioning fields
            x_of: record.x_of,
            y_of: record.y_of,
            x_of_offset: record.x_of_offset !== undefined ? parseFloat(record.x_of_offset) : undefined,
            y_of_offset: record.y_of_offset !== undefined ? parseFloat(record.y_of_offset) : undefined,
            
            // Store the original record(s)
            records: [{ ...record }],
            
            // Initialize output storage
            latex_output: ''
        };

        return new Node(nodeProperties);
    }
}

module.exports = NodeReader; 