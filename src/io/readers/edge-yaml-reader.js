const fs = require('fs');
const yaml = require('js-yaml');
const EdgeReader = require('./edge-reader');

/**
 * Class to read edge data from YAML files
 */
class EdgeYamlReader {
    /**
     * Read edges from a YAML file
     * @param {string} yamlFile - Path to the YAML file
     * @param {Object} scale - Scale information for positions
     * @param {Object} nodes - Map of node objects (name -> node)
     * @param {Object} renderer - Renderer with style handling capabilities
     * @returns {Promise<Array>} - Array of processed edge objects
     */
    static async readFromYaml(yamlFile, scale, nodes, renderer) {
        try {
            // Read YAML file
            const content = await fs.promises.readFile(yamlFile, 'utf8');
            const documents = yaml.loadAll(content);
            
            // Process edges
            const edges = [];
            for (const doc of documents) {
                // Skip non-edge documents
                if (!doc || doc.type !== 'edge') {
                    continue;
                }
                
                try {
                    const edge = EdgeReader.processEdgeRecord(doc, nodes, scale, renderer);
                    edges.push(edge);
                } catch (error) {
                    console.error(`Error processing edge: ${error.message}`);
                }
            }
            
            if (edges.length === 0) {
                console.warn(`No edges found in YAML file ${yamlFile}`);
            }
            
            return edges;
        } catch (error) {
            console.error(`Error reading YAML file ${yamlFile}:`, error);
            throw error;
        }
    }
}

module.exports = EdgeYamlReader; 