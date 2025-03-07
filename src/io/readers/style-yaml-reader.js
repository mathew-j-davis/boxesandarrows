const fs = require('fs');
const yaml = require('js-yaml');

/**
 * Class to read style data from YAML files
 */
class StyleYamlReader {
    /**
     * Read styles from a YAML file
     * @param {string} yamlFile - Path to the YAML file
     * @param {Object} renderer - Renderer with style handling capabilities
     * @returns {Promise<Object>} - Object containing processed styles
     */
    static async readFromYaml(yamlFile, renderer) {
        try {
            // Read YAML file
            const content = await fs.promises.readFile(yamlFile, 'utf8');
            const documents = yaml.loadAll(content);
            
            // Process styles
            const styles = {};
            
            for (const doc of documents) {
                // Skip non-style documents
                if (!doc || doc.type !== 'style') {
                    continue;
                }
                
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
        if (doc.tikz_object_attributes) {
            // Process the attributes string into a style object
            const processedAttributes = renderer.styleHandler.processAttributes(doc.tikz_object_attributes);
            
            // Create a style entry with the processed attributes
            if (!styles.style) {
                styles.style = {};
            }
            
            styles.style[styleName] = {
                node: {
                    object: {
                        tikz: processedAttributes.tikz || {}
                    }
                },
                edge: {
                    object: {
                        tikz: processedAttributes.tikz || {}
                    }
                }
            };
            
            return;
        }
        
        // Handle full style definition
        if (doc.node || doc.edge) {
            if (!styles.style) {
                styles.style = {};
            }
            
            styles.style[styleName] = {};
            
            if (doc.node) {
                styles.style[styleName].node = doc.node;
            }
            
            if (doc.edge) {
                styles.style[styleName].edge = doc.edge;
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
        
        return output;
    }
}

module.exports = StyleYamlReader; 