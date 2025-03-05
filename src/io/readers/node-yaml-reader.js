const fs = require('fs');
const yaml = require('js-yaml');
const NodeReader = require('./node-reader');
const { processRelativeNode } = require('./relative-node-processor');

/**
 * Class to read node data from YAML files
 */
class NodeYamlReader {
    /**
     * Read nodes from a YAML file
     * @param {string} yamlFile - Path to the YAML file
     * @param {Object} scale - Scale information for positions and sizes
     * @param {Object} renderer - Renderer with style handling capabilities
     * @param {Map} existingNodes - Optional map of existing nodes for relative positioning
     * @returns {Promise<Array>} - Array of processed node objects
     */
    static async readFromYaml(yamlFile, scale, renderer, existingNodes = null) {
        try {
            // Read YAML file
            const content = await fs.promises.readFile(yamlFile, 'utf8');
            const documents = yaml.loadAll(content);
            
            // Process nodes
            const nodes = [];
            const nodesMap = existingNodes || new Map();
            
            // First pass: Process absolute positioned nodes
            for (const doc of documents) {
                // Skip non-node documents
                if (!doc || doc.type !== 'node') {
                    continue;
                }
                
                // Skip relative positioned nodes in first pass
                if (doc.relative_to) {
                    continue;
                }
                
                const node = NodeReader.processNodeRecord(doc, scale, renderer);
                nodes.push(node);
                nodesMap.set(node.name, node);
            }
            
            // Second pass: Process relative positioned nodes
            for (const doc of documents) {
                // Skip non-node documents
                if (!doc || doc.type !== 'node') {
                    continue;
                }
                
                // Process only relative positioned nodes in second pass
                if (!doc.relative_to) {
                    continue;
                }
                
                const node = processRelativeNode(
                    doc, 
                    nodesMap, 
                    scale, 
                    renderer, 
                    NodeReader.processNodeRecord
                );
                
                nodes.push(node);
                nodesMap.set(node.name, node);
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