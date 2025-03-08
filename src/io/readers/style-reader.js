const fs = require('fs');
const yaml = require('js-yaml');
const YamlReader = require('./yaml-reader');

class StyleReader {
    /**
     * Read styles from a JSON file
     * @param {string} jsonFile - Path to the JSON file
     * @param {Object} renderer - Renderer with style handling capabilities
     * @returns {Promise<Object>} - Style object loaded from JSON
     */
    static async readFromJson(jsonFile, renderer) {
        try {
            const content = await fs.promises.readFile(jsonFile, 'utf8');
            const styleData = JSON.parse(content);
            
            // If the JSON is already properly structured, return it as is
            if (styleData.style || styleData.page) {
                return styleData;
            }
            
            // Otherwise, wrap it in the expected structure
            return { style: styleData };
        } catch (error) {
            console.error(`Error reading JSON file ${jsonFile}:`, error);
            throw error;
        }
    }

    /**
     * Read styles from a YAML file
     * @param {string} yamlFile - Path to the YAML file
     * @param {Object} renderer - Renderer with style handling capabilities
     * @returns {Promise<Object>} - Style object loaded from YAML
     */
    static async readFromYaml(yamlFile, renderer) {
        try {
            // Use YamlReader to get documents with 'style' type
            const documents = await YamlReader.readFile(yamlFile, { 
                filter: doc => doc && doc.type === 'style' 
            });
            
            // Process styles
            const styles = {};
            
            for (const doc of documents) {
                try {
                    // Process the style document
                    this.processStyleDocument(doc, styles, renderer);
                } catch (error) {
                    console.error(`Error processing style: ${error.message}`);
                }
            }
            
            return styles;
        } catch (error) {
            console.error(`Error reading YAML file ${yamlFile}:`, error);
            throw error;
        }
    }
    
    /**
     * Process a style document
     * @param {Object} doc - Style document object
     * @param {Object} styles - Styles collection to update
     * @param {Object} renderer - Renderer with style handling capabilities
     */
    static processStyleDocument(doc, styles, renderer) {
        const styleName = doc.name;
        
        if (!styleName) {
            console.warn('Style document missing name, skipping');
            return;
        }
        
        // Handle simple style with tikz_object_attributes
        if (doc.tikz_object_attributes && renderer?.styleHandler) {
            // Process the attributes string into a style object
            const processedAttributes = renderer.styleHandler.processAttributes(doc.tikz_object_attributes);
            
            // Create a style entry with the processed attributes
            if (!styles.style) {
                styles.style = {};
            }
            
            if (!styles.style[styleName]) {
                styles.style[styleName] = {};
            }
            
            // Apply to both node and edge objects with tikz attributes
            styles.style[styleName].node = styles.style[styleName].node || {};
            styles.style[styleName].node.object = styles.style[styleName].node.object || {};
            styles.style[styleName].node.object.tikz = this.deepMerge(
                styles.style[styleName].node.object.tikz || {},
                processedAttributes.tikz || {}
            );
            
            styles.style[styleName].edge = styles.style[styleName].edge || {};
            styles.style[styleName].edge.object = styles.style[styleName].edge.object || {};
            styles.style[styleName].edge.object.tikz = this.deepMerge(
                styles.style[styleName].edge.object.tikz || {},
                processedAttributes.tikz || {}
            );
        }
        
        // Handle full style definition
        if (doc.node || doc.edge) {
            if (!styles.style) {
                styles.style = {};
            }
            
            if (!styles.style[styleName]) {
                styles.style[styleName] = {};
            }
            
            if (doc.node) {
                styles.style[styleName].node = this.deepMerge(
                    styles.style[styleName].node || {},
                    doc.node
                );
            }
            
            if (doc.edge) {
                styles.style[styleName].edge = this.deepMerge(
                    styles.style[styleName].edge || {},
                    doc.edge
                );
            }
        }
        
        // Handle category-specific styles
        const category = doc.category;
        if (category && (doc.object || doc.text)) {
            if (!styles.style) {
                styles.style = {};
            }
            
            if (!styles.style[styleName]) {
                styles.style[styleName] = {};
            }
            
            if (!styles.style[styleName][category]) {
                styles.style[styleName][category] = {};
            }
            
            if (doc.object) {
                styles.style[styleName][category].object = this.deepMerge(
                    styles.style[styleName][category].object || {},
                    doc.object
                );
            }
            
            if (doc.text) {
                styles.style[styleName][category].text = this.deepMerge(
                    styles.style[styleName][category].text || {},
                    doc.text
                );
            }
        }
    }
    
    /**
     * Deep merge of objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} - Merged object
     */
    static deepMerge(target, source) {
        if (!source) return target;
        
        const output = Object.assign({}, target);
        
        if (source) {
            Object.keys(source).forEach(key => {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    if (!target[key] || typeof target[key] !== 'object') {
                        output[key] = source[key];
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }
        
        return output;
    }
}

module.exports = StyleReader;
