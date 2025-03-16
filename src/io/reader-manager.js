const path = require('path');
const NodeReader = require('./readers/node-reader');
const EdgeReader = require('./readers/edge-reader');
const StyleReader = require('./readers/style-reader');
const Node = require('./models/node');

/**
 * Manager class to handle reading from multiple files in different formats
 */
class ReaderManager {
    /**
     * Create a new ReaderManager
     * @param {Object} styleHandler - Style handler for processing styles
     */
    constructor() {
 
        this.nodes = new Map();
        this.edges = [];
    }

    /**
     * Process style files (JSON or YAML)
     * @param {Array} styleFiles - Array of file paths to process
     * @returns {Object} - Processed style definitions
     */
    async processStyleFiles(styleFiles, styleHandler) {
        // Return empty object if no style files provided
        if (!styleFiles || styleFiles.length === 0) {
            console.info('No style files provided, using empty style set');
            return {};
        }
        
        // Process each file
        for (const file of styleFiles) {
            // Get file extension
            const fileExtension = path.extname(file).toLowerCase().replace('.', '');
            
            // Process based on file extension
            try {
                
                if (fileExtension === 'json') {
                    let stylesheet = await StyleReader.readFromJson(file);
                    styleHandler.mergeStylesheet(stylesheet);

                } else if (fileExtension === 'yaml' || fileExtension === 'yml') {
                    let styleDocuments = await StyleReader.readFromYaml(file);   
                    // Process the documents directly with the style handler
                    styleHandler.processYamlDocuments(styleDocuments);    
                } else {
                    console.warn(`Unsupported file format for styles: ${fileExtension}`);
                    continue;
                }
                
                // Merge the new styles with the consolidated styles
                
                    
            } catch (error) {
                console.error(`Error processing style file ${file}:`, error);
            }
        }
    }
    
    /**
     * Process multiple node files (CSV or YAML)
     * @param {Array} nodeFiles - Array of file paths to process
     * @param {Object} scale - Scale information for positions and sizes
     * @returns {Map} - Map of node objects (name -> node)
     */
    async processNodeFiles(nodeFiles) {
        // Return empty Map if no node files provided
        if (!nodeFiles || nodeFiles.length === 0) {
            console.info('No node files provided, using empty node set');
            return new Map();
        }

        // Process each file
        for (const file of nodeFiles) {
            // Get file extension
            const fileExtension = path.extname(file).toLowerCase().replace('.', '');
            

            // Process based on file extension
            let newNodes = [];
            if (fileExtension === 'csv') {
                newNodes = await NodeReader.readFromCsv(file);
            } else if (fileExtension === 'yaml' || fileExtension === 'yml') {
                newNodes = await NodeReader.readFromYaml(file);       
            } else {
                console.warn(`Unsupported file format for nodes: ${fileExtension}`);
                continue;
            }
                
            // Add nodes to map, merging duplicates with new properties taking priority
            for (const newNode of newNodes) {
                if (this.nodes.has(newNode.name)) {
                    const existingNode = this.nodes.get(newNode.name);
                    console.info(`Merging duplicate node: ${newNode.name}`);
                    
                    // Use Node.mergeNodes to merge the nodes
                    const mergedNode = Node.mergeNodes(existingNode, newNode);
                    
                    this.nodes.set(newNode.name, mergedNode);
                } else {
                    this.nodes.set(newNode.name, newNode);
                }
            }
        }
        
        return this.nodes;
    }
    
    /**
     * Process multiple edge files (CSV or YAML)
     * @param {Array} edgeFiles - Array of file paths to process
     * @param {Object} scale - Scale information for positions
     * @returns {Array} - Array of edge objects
     */
    async processEdgeFiles(edgeFiles, styleHandler) {
        // Return empty array if no edge files provided
        if (!edgeFiles || edgeFiles.length === 0) {
            console.info('No edge files provided, using empty edge set');
            return [];
        }
        
        // Return empty array if no nodes have been loaded
        if (this.nodes.size === 0) {
            console.warn('Cannot process edges: No nodes have been loaded');
            return [];
        }
        
        // Process each file
        for (const file of edgeFiles) {
            // Get file extension
            const fileExtension = path.extname(file).toLowerCase().replace('.', '');
            
            // Process based on file extension
            try {
                let records = [];
                if (fileExtension === 'csv') {
                    records = await EdgeReader.readFromCsv(file);
                } else if (fileExtension === 'yaml' || fileExtension === 'yml') {
                    records = await EdgeReader.readFromYaml(file);
                } else {
                    console.warn(`Unsupported file format for edges: ${fileExtension}`);
                    continue;
                }
                
                // Now process the records into edges
                const newEdges = records
                    .map(record => EdgeReader.processEdgeRecord(record, this.nodes, styleHandler.getPageScale()))
                    .filter(edge => edge !== null);
                
                // Add edges to array
                this.edges = [...this.edges, ...newEdges];
            } catch (error) {
                console.error(`Error processing edge file ${file}:`, error);
            }
        }
        
        return this.edges;
    }
    
    /**
     * Get all nodes
     * @returns {Map} - Map of node objects (name -> node)
     */
    getNodes() {
        return this.nodes;
    }
    
    /**
     * Get all edges
     * @returns {Array} - Array of edge objects
     */
    getEdges() {
        return this.edges;
    }
    
    /**
     * Get a specific node by name
     * @param {string} nodeName - Name of the node to get
     * @returns {Object|undefined} - Node object or undefined if not found
     */
    getNode(nodeName) {
        return this.nodes.get(nodeName);
    }
}

module.exports = ReaderManager; 