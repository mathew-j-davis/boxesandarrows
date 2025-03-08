const fs = require('fs');
const CsvReader = require('./csv-reader');
const yaml = require('js-yaml');
const YamlReader = require('./yaml-reader');

class NodeReader {

    static async readFromCsv(nodeFile) {
        const records = await CsvReader.readFile(nodeFile);
        return records.map(record => this.processNodeRecord(record));
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

        const defaultHeight = 1;
        const defaultWidth = 1;

        const xUnscaled = record.x !== undefined && record.x !== '' ? 
            parseFloat(record.x) : 0;
        const yUnscaled = record.y !== undefined && record.y !== '' ? 
            parseFloat(record.y) : 0;

        // Apply position scaling
        const x = null; // xUnscaled * scale.position.x;
        const y = null; //yUnscaled * scale.position.y;

        /*
        // Get style defaults if available
        const styleDefaults = renderer.styleHandler?.getCompleteStyle(record.style, 'node', 'object') || {};
        
        // Process TikZ attributes if present
        let tikzAttributes = {};
        if (record.tikz_object_attributes) {
            const processedAttributes = renderer.styleHandler.processAttributes(record.tikz_object_attributes);
            tikzAttributes = processedAttributes.tikz || {};
        }
        
        // Process color attributes if present
        if (record.color || record.fillcolor || record.textcolor) {
            if (record.color) tikzAttributes.draw = record.color;
            if (record.fillcolor) tikzAttributes.fill = record.fillcolor;
            if (record.textcolor) tikzAttributes.text = record.textcolor;
        }
        
        // Merge styles with attributes taking precedence
        const mergedStyle = {
            ...styleDefaults,
            tikz: {
                ...styleDefaults.tikz,
                ...tikzAttributes
            }
        };
        
        // Parse style dimensions if they exist (removing 'cm' suffix)
        const defaultWidth = mergedStyle?.['minimum width']
            ? parseFloat(mergedStyle['minimum width'].replace('cm', '')) 
            : 1;
        const defaultHeight = mergedStyle?.['minimum height']
            ? parseFloat(mergedStyle['minimum height'].replace('cm', ''))
            : 1;
*/
        // Store unscaled size values with priority: CSV > Style > Default
        const widthUnscaled = 
            record.width !== undefined && record.width !== '' 
                ? parseFloat(record.width) 
                : (record.w !== undefined && record.w !== '' 
                    ? parseFloat(record.w) 
                    : defaultWidth);
                    
        const heightUnscaled = 
            record.height !== undefined && record.height !== '' 
                ? parseFloat(record.height) 
                : (record.h !== undefined && record.h !== '' 
                    ? parseFloat(record.h) 
                    : defaultHeight);
        


        // Validate scale object structure or use defaults
        //const nodeScale = scale?.size || { w: 1, h: 1 };

        // Apply node size scaling with validated scale object
        const width = null; //widthUnscaled * nodeScale.w;
        const height = null; //heightUnscaled * nodeScale.h;

        let node = {
            name: record.name,

            label: record.hide_label ? null : record.label || record.name,
            label_above: record.label_above,
            label_below: record.label_below,
            relative_to: record.relative_to,
            relative_to_anchor: record.relative_to_anchor,
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
            color: record.color,
            fillcolor: record.fillcolor,
            textcolor: record.textcolor

        };


        return node;
    }
}

module.exports = NodeReader; 