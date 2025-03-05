const fs = require('fs');
const yaml = require('js-yaml');
const NodeReader = require('./node-reader');

/**
 * Class to read node data from YAML files
 */
class NodeYamlReader {
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
            const documents = yaml.loadAll(content);
            
            // Process nodes
            const nodes = [];
            for (const doc of documents) {
                // Skip non-node documents
                if (!doc || doc.type !== 'node') {
                    continue;
                }
                
                const node = NodeReader.processNodeRecord(doc, scale, renderer);
                nodes.push(node);
            }
            
            if (nodes.length === 0) {
                console.warn(`No nodes found in YAML file ${yamlFile}`);
            }
            
            return nodes;
        } catch (error) {
            console.error(`Error reading YAML file ${yamlFile}:`, error);
            throw error;
        }
    }
}

module.exports = NodeYamlReader; 