const fs = require('fs');
const CsvReader = require('./csv-reader');
const yaml = require('js-yaml');

class NodeReader {
    constructor(renderer) {
        this.renderer = renderer;
    }

    static async readFromCsv(nodeFile, scale, renderer) {
        const records = await CsvReader.readFile(nodeFile);
        return records.map(record => this.processNodeRecord(record, scale, renderer));
    }

        /**
     * Read nodes from a YAML file
     * @param {string} yamlFile - Path to the YAML file
     * @param {Object} scale - Scale information for positions and sizes
     * @param {Object} renderer - Renderer with style handling capabilities
     * @returns {Promise<Array>} - Array of processed node objects
     */
    static async readFromYaml(yamlFile, scale, renderer) {
        try {
            // Read YAML file
            const content = await fs.promises.readFile(yamlFile, 'utf8');
            const records = yaml.loadAll(content);
            
            // Filter for node documents and process them
            const nodes = records
                .filter(record => record && record.type === 'node')
                .map(record => NodeReader.processNodeRecord(record, scale, renderer));
            
            if (nodes.length === 0) {
                console.warn(`No nodes found in YAML file ${yamlFile}`);
            }
            
            return nodes;
        } catch (error) {
            console.error(`Error reading YAML file ${yamlFile}:`, error);
            throw error;
        }
    }
    
    static processNodeRecord(record, scale, renderer) {
        // Store unscaled position values

        const defaultHeight = 1;
        const defaultWidth = 1;

        const xUnscaled = record.x !== undefined && record.x !== '' ? 
            parseFloat(record.x) : 0;
        const yUnscaled = record.y !== undefined && record.y !== '' ? 
            parseFloat(record.y) : 0;

        // Apply position scaling
        const x = xUnscaled * scale.position.x;
        const y = yUnscaled * scale.position.y;

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
        const nodeScale = scale?.size || { w: 1, h: 1 };

        // Apply node size scaling with validated scale object
        const width = widthUnscaled * nodeScale.w;
        const height = heightUnscaled * nodeScale.h;

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