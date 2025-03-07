const fs = require('fs');
const yaml = require('js-yaml');

/**
 * Class to read page configuration from YAML files
 */
class PageYamlReader {
    /**
     * Read page configuration from a YAML file
     * @param {string} yamlFile - Path to the YAML file
     * @returns {Promise<Object>} - Object containing processed page configuration
     */
    static async readFromYaml(yamlFile) {
        try {
            // Read YAML file
            const content = await fs.promises.readFile(yamlFile, 'utf8');
            const documents = yaml.loadAll(content);
            
            // Process page configuration
            const pageConfig = {
                scale: {},
                margin: {}
            };
            
            for (const doc of documents) {
                // Skip non-page documents
                if (!doc || doc.type !== 'page') {
                    continue;
                }
                
                try {
                    // Process the page document
                    this.processPageDocument(doc, pageConfig);
                } catch (error) {
                    console.error(`Error processing page configuration: ${error.message}`);
                }
            }
            
            return pageConfig;
        } catch (error) {
            console.error(`Error reading YAML file ${yamlFile}:`, error);
            throw error;
        }
    }
    
    /**
     * Process a page configuration document
     * @param {Object} doc - Page document object
     * @param {Object} pageConfig - Page configuration to update
     */
    static processPageDocument(doc, pageConfig) {
        // Process page scale
        if (doc.scale) {
            // Process position scale
            if (doc.scale.position) {
                if (!pageConfig.scale.position) {
                    pageConfig.scale.position = {};
                }
                
                if (doc.scale.position.x !== undefined) {
                    pageConfig.scale.position.x = parseFloat(doc.scale.position.x);
                }
                
                if (doc.scale.position.y !== undefined) {
                    pageConfig.scale.position.y = parseFloat(doc.scale.position.y);
                }
            }
            
            // Process size scale
            if (doc.scale.size) {
                if (!pageConfig.scale.size) {
                    pageConfig.scale.size = {};
                }
                
                if (doc.scale.size.w !== undefined) {
                    pageConfig.scale.size.w = parseFloat(doc.scale.size.w);
                }
                
                if (doc.scale.size.h !== undefined) {
                    pageConfig.scale.size.h = parseFloat(doc.scale.size.h);
                }
            }
        }
        
        // Process page margin
        if (doc.margin) {
            if (doc.margin.w !== undefined) {
                pageConfig.margin.w = parseFloat(doc.margin.w);
            }
            
            if (doc.margin.h !== undefined) {
                pageConfig.margin.h = parseFloat(doc.margin.h);
            }
        }
        
        // Process grid
        if (doc.grid !== undefined) {
            pageConfig.grid = parseFloat(doc.grid);
        }
    }
}

module.exports = PageYamlReader; 