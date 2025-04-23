const path = require('path');
const NodeReader = require('./readers/node-reader');
const EdgeReader = require('./readers/edge-reader');
const StyleReader = require('./readers/style-reader');
const { Node } = require('./models/node');

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
        // New collection for storing all node records without merging
        this.allNodeRecords = [];
    }

    /**
     * Process style files (JSON or YAML)
     * @param {Array} styleFiles - Array of file paths to process
     * @param {Object} styleHandler - Style handler for processing styles
     * @returns {Array} - Combined collection of style records
     */
    async processStyleFiles(styleFiles, styleHandler) {
        // Return empty array if no style files provided
        if (!styleFiles || styleFiles.length === 0) {
            console.info('No style files provided, using empty style set');
            return [];
        }
        
        // Initialize result array to collect all style records
        const result = [];
        
        // Process each file
        for (const file of styleFiles) {
            // Get file extension
            const fileExtension = path.extname(file).toLowerCase().replace('.', '');
            
            // Process based on file extension
            try {
                if (fileExtension === 'json') {
                    let pageAndStyleDocuments = await StyleReader.readFromJson(file);
                    const jsonStyles = styleHandler.processYamlDocuments(pageAndStyleDocuments);
                    // Add to result array
                    result.push(...jsonStyles);
                } else if (fileExtension === 'yaml' || fileExtension === 'yml') {
                    let styleDocuments = await StyleReader.readFromYaml(file);   
                    // Process the documents with the style handler
                    const yamlStyles = styleHandler.processYamlDocuments(styleDocuments);
                    // Add to result array
                    result.push(...yamlStyles);
                } else {
                    console.warn(`Unsupported file format for styles: ${fileExtension}`);
                    continue;
                }
            } catch (error) {
                console.error(`Error processing style file ${file}:`, error);
            }
        }
        
        return result;
    }
    
    /**
     * Process multiple node files (CSV or YAML) and store without merging
     * @param {Array} nodeFiles - Array of file paths to process
     * @returns {Array} - Array of all node records (without merging)
     */
    async processNodeFiles(nodeFiles) {
        // Return empty array if no node files provided
        if (!nodeFiles || nodeFiles.length === 0) {
            console.info('No node files provided, using empty node set');
            this.allNodeRecords = [];
            return [];
        }

        // Process each file
        for (const file of nodeFiles) {
            // Get file extension
            const fileExtension = path.extname(file).toLowerCase().replace('.', '');
            
            // Process based on file extension
            let records = [];
            if (fileExtension === 'csv') {
                records = await NodeReader.readRecordsFromCsv(file);
            } else if (fileExtension === 'yaml' || fileExtension === 'yml') {
                records = await NodeReader.readRecordsFromYaml(file);       
            } else {
                console.warn(`Unsupported file format for nodes: ${fileExtension}`);
                continue;
            }
                
            // Add all records to the collection without merging
            this.allNodeRecords = [...this.allNodeRecords, ...records];
        }
        
        return this.allNodeRecords;
    }
    
    /**
     * Merge all collected node records and update the nodes map
     * @returns {Map} - Map of merged node records (name -> record)
     */
    mergeNodeRecords() {
        // Map to store merged records
        const mergedRecords = new Map();
        
        // Process all collected node records
        for (const record of this.allNodeRecords) {
            const nodeName = record.name;
            
            if (mergedRecords.has(nodeName)) {
                const existingRecord = mergedRecords.get(nodeName);
                console.info(`Merging duplicate node record: ${nodeName}`);
                
                // Merge records (later records overwrite earlier ones)
                for (const [key, value] of Object.entries(record)) {
                    // Skip empty or undefined values
                    if (value === undefined || value === '') {
                        continue;
                    }
                    
                    // Special handling for tikz_object_attributes to combine them
                    if (key === 'tikz_object_attributes' && existingRecord[key]) {
                        existingRecord[key] = `${existingRecord[key]}, ${value}`;
                    } else {
                        // For all other properties, newer value overwrites
                        existingRecord[key] = value;
                    }
                }
            } else {
                // Create a new record
                mergedRecords.set(nodeName, { ...record });
            }
        }
        
        return mergedRecords;
    }
    
    /**
     * Create Node objects from merged records
     * @param {Map} mergedRecords - Map of merged node records
     * @returns {Map} - Map of Node objects
     */
    createNodesFromRecords(mergedRecords) {
        // Clear the existing nodes map to start fresh
        this.nodes.clear();
        
        // First create all Node objects to ensure references exist
        for (const [nodeName, record] of mergedRecords.entries()) {
            // Use NodeReader to properly process the record with all unscaled dimensions
            const node = NodeReader.processNodeRecord(record);
            this.nodes.set(nodeName, node);
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
            //console.warn('Cannot process edges: No nodes have been loaded');
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