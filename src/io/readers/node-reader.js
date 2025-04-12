const fs = require('fs');
const CsvReader = require('./csv-reader');
const yaml = require('js-yaml');
const YamlReader = require('./yaml-reader');
const { Node } = require('../models/node');
const ValueParser = require('./value-parser');
const { Position, PositionType } = require('../../geometry/position');
const Dimensions = require('../../geometry/dimensions');
const DynamicPropertyParser = require('./dynamic-property-parser');
const DynamicPropertyYamlReader = require('./dynamic-property-yaml-reader');

class NodeReader {

    static async readFromCsv(nodeFile) {
        const records = await CsvReader.readFile(nodeFile);
        return records.map(record => this.processNodeRecord(record));
    }

    static async readRecordsFromCsv(nodeFile) {
        const records = await CsvReader.readFile(nodeFile);
        
        // Process each record for dynamic properties
        return records.map(record => {
            const dynamicProps = [];
            
            // Scan for dynamic property patterns (keys starting with underscore)
            for (const [key, value] of Object.entries(record)) {
                if (key.startsWith('_') && DynamicPropertyParser.isDynamicProperty(key)) {
                    const property = DynamicPropertyParser.parse(key, value);
                    dynamicProps.push(property);
                }
            }
            
            // Add dynamic properties to record if any were found
            if (dynamicProps.length > 0) {
                return {
                    ...record,
                    _dynamicProperties: dynamicProps
                };
            }
            
            return record;
        });
    }

        /**
     * Read nodes from a YAML file
     * @param {string} yamlFile - Path to the YAML file
     * @returns {Promise<Array>} - Array of node records
     */
    static async readRecordsFromYaml(yamlFile) {
        // return await YamlReader.readFile(yamlFile, { 
        //     filter: doc => doc && doc.type === 'node' 
        // });
        return await DynamicPropertyYamlReader.readFile(yamlFile, { 
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
        const x = record.x !== undefined && record.x !== '' ? 
            parseFloat(record.x) : undefined;
        const y = record.y !== undefined && record.y !== '' ? 
            parseFloat(record.y) : undefined;

        // Store unscaled size values with priority: CSV > Style > Default
        const width = 
            record.width !== undefined && record.width !== '' 
                ? parseFloat(record.width) 
                : (record.w !== undefined && record.w !== '' 
                    ? parseFloat(record.w) 
                    : undefined);
                    
        const height = 
            record.height !== undefined && record.height !== '' 
                ? parseFloat(record.height) 
                : (record.h !== undefined && record.h !== '' 
                    ? parseFloat(record.h) 
                    : undefined);
        

        const x_offset = record.x_offset !== undefined ? parseFloat(record.x_offset) : undefined;
        const y_offset = record.y_offset !== undefined ? parseFloat(record.y_offset) : undefined;
        
        const h_offset = record.h_offset ? parseFloat(record.h_offset) : 0;
        const w_offset = record.w_offset ? parseFloat(record.w_offset) : 0;

        const render = new Map();
        const records = [{ ...record }];

        let nodeProperties = {
            name: ValueParser.parse(record.name, 'string'),
            label: ValueParser.parse(record.label, 'string'),
            hide_label: ValueParser.parse(record.hide_label, 'boolean'),
            label_above: ValueParser.parse(record.label_above, 'string'),
            label_below: ValueParser.parse(record.label_below, 'string'),
            position_of: ValueParser.parse(record.position_of, 'string'),
            anchor: ValueParser.parse(record.anchor, 'string'),
            anchorVector: null,
            at: ValueParser.parse(record.at, 'string'),
            shape: ValueParser.parse(record.shape, 'string'),
            x,
            y,
            width: width,
            height: height,
            style: ValueParser.parse(record.style, 'string'),
            tikz_object_attributes: ValueParser.parse(record.tikz_object_attributes, 'string'),
            edge_color: ValueParser.parse(record.edge_color, 'string'),
            fillcolor: ValueParser.parse(record.fillcolor, 'string'),
            textcolor: ValueParser.parse(record.textcolor, 'string'),

            // Add relative sizing fields
            h_of: ValueParser.parse(record.h_of, 'string'),
            h_from: ValueParser.parse(record.h_from, 'string'),
            h_to: ValueParser.parse(record.h_to, 'string'),
            h_offset: h_offset,

            w_of: ValueParser.parse(record.w_of, 'string'),
            w_from: ValueParser.parse(record.w_from, 'string'),     
            w_to: ValueParser.parse(record.w_to, 'string'),
            w_offset: w_offset,

            // Add new relative positioning fields
            x_of: ValueParser.parse(record.x_of, 'string'),
            y_of: ValueParser.parse(record.y_of, 'string'),
            x_offset: x_offset,
            y_offset: y_offset,
            
            records,
            render,

            // Initialize position object
            position: new Position({
                xUnscaled: 0,
                yUnscaled: 0,
                xScaled: 0,
                yScaled: 0,
                positionType: PositionType.COORDINATES
            }),
            
            // initialize dimensions
            dimensions: new Dimensions({
                widthUnscaled: width,
                heightUnscaled: height,
                width: width,
                height: height,
            })
        };

        // Add any additional properties from the record that aren't already in nodeProperties
        const processedKeys = new Set(['x', 'y', 'width', 'height', 'w', 'h', 'type']);

        for (const key in record) {
            if (!(key in nodeProperties) && !processedKeys.has(key)) {
                nodeProperties[key] = record[key];
            }
        }

        // Add dynamic properties to nodeProperties
        if (record._dynamicProperties) {
            nodeProperties._dynamicProperties = record._dynamicProperties;
        }

        return new Node(nodeProperties);
    }
}

module.exports = NodeReader; 