const path = require('path');
const NodeReader = require('./readers/node-reader');
const EdgeReader = require('./readers/edge-reader');
const NodeYamlReader = require('./readers/node-yaml-reader');
const EdgeYamlReader = require('./readers/edge-yaml-reader');
const StyleYamlReader = require('./readers/style-yaml-reader');
const PageYamlReader = require('./readers/page-yaml-reader');

/**
 * Manager class to handle reading from multiple files in different formats
 */
class ReaderManager {
    /**
     * Create a new ReaderManager
     * @param {Object} renderer - Renderer with style handling capabilities
     */
    constructor(renderer) {
        this.renderer = renderer;
        this.nodes = new Map();
        this.edges = [];
        this.pageConfig = null;
    }

    /**
     * Process multiple node files (CSV or YAML)
     * @param {Array} nodeFiles - Array of file paths to process
     * @param {Object} scale - Scale information for positions and sizes
     * @returns {Map} - Map of node objects (name -> node)
     */
    async processNodeFiles(nodeFiles, scale) {
        // Return empty Map if no node files provided
        if (!nodeFiles || nodeFiles.length === 0) {
            console.info('No node files provided, using empty node set');
            return new Map();
        }

        // Ensure scale is valid
        const safeScale = scale || { position: { x: 1, y: 1 }, size: { w: 1, h: 1 } };
        
        // Process each file
        for (const file of nodeFiles) {
            // Get file extension
            const fileExtension = path.extname(file).toLowerCase().replace('.', '');
            
            // Process based on file extension
            let newNodes = [];
            if (fileExtension === 'csv') {
                newNodes = await NodeReader.readFromCsv(file, safeScale, this.renderer);
            } else if (fileExtension === 'yaml' || fileExtension === 'yml') {
                newNodes = await NodeYamlReader.readFromYaml(file, safeScale, this.renderer, this.nodes);
                
                // Also process any style and page documents in the same YAML file
                await this.processStylesFromYaml(file);
                await this.processPageFromYaml(file);
            } else {
                console.warn(`Unsupported file format for nodes: ${fileExtension}`);
                continue;
            }
                
            // Add nodes to map, merging duplicates with new properties taking priority
            for (const newNode of newNodes) {
                if (this.nodes.has(newNode.name)) {
                    const existingNode = this.nodes.get(newNode.name);
                    console.info(`Merging duplicate node: ${newNode.name}`);
                    
                    // Merge node properties, with new node taking priority
                    const mergedNode = {
                        ...existingNode,
                        ...newNode
                    };
                    
                    // Special handling for tikz_object_attributes - concatenate if both exist
                    if (existingNode.tikz_object_attributes && newNode.tikz_object_attributes) {
                        mergedNode.tikz_object_attributes = `${existingNode.tikz_object_attributes}, ${newNode.tikz_object_attributes}`;
                    }
                    
                    this.nodes.set(newNode.name, mergedNode);
                } else {
                    this.nodes.set(newNode.name, newNode);
                }
            }
        }
        
        return this.nodes;
    }
    
    /**
     * Process styles from a YAML file
     * @param {string} yamlFile - Path to the YAML file
     * @returns {Object} - Processed style definitions
     */
    async processStylesFromYaml(yamlFile) {
        try {
            const styles = await StyleYamlReader.readFromYaml(yamlFile, this.renderer);
            
            if (styles && styles.style && Object.keys(styles.style).length > 0) {
                // If the renderer has a style handler, update its styles
                if (this.renderer && this.renderer.styleHandler) {
                    // Merge the new styles with existing styles
                    const existingStyles = this.renderer.styleHandler.styleSheet || {};
                    
                    if (!existingStyles.style) {
                        existingStyles.style = {};
                    }
                    
                    // Merge styles at top level
                    Object.assign(existingStyles.style, styles.style);
                    
                    // Update the style handler
                    this.renderer.styleHandler.styleSheet = existingStyles;
                }
                
                return styles;
            }
            
            return null;
        } catch (error) {
            console.error(`Error processing styles from YAML file ${yamlFile}:`, error);
            return null;
        }
    }
    
    /**
     * Process page configuration from a YAML file
     * @param {string} yamlFile - Path to the YAML file
     * @returns {Object} - Processed page configuration
     */
    async processPageFromYaml(yamlFile) {
        try {
            const pageConfig = await PageYamlReader.readFromYaml(yamlFile);
            
            if (pageConfig && Object.keys(pageConfig).length > 0) {
                // Store the page configuration
                this.pageConfig = pageConfig;
                
                // Update the renderer's scale if possible
                if (this.renderer && pageConfig.scale) {
                    // Only update if the renderer has a method to update scale
                    if (typeof this.renderer.updateScale === 'function') {
                        this.renderer.updateScale(pageConfig.scale);
                    }
                }
                
                return pageConfig;
            }
            
            return null;
        } catch (error) {
            console.error(`Error processing page configuration from YAML file ${yamlFile}:`, error);
            return null;
        }
    }

    /**
     * Process multiple edge files (CSV or YAML)
     * @param {Array} edgeFiles - Array of file paths to process
     * @param {Object} scale - Scale information for positions
     * @returns {Array} - Array of edge objects
     */
    async processEdgeFiles(edgeFiles, scale) {
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
        
        // Ensure scale is valid
        const safeScale = scale || { position: { x: 1, y: 1 }, size: { w: 1, h: 1 } };
        
        // Process each file
        for (const file of edgeFiles) {
            // Get file extension
            const fileExtension = path.extname(file).toLowerCase().replace('.', '');
            
            // Process based on file extension
            let newEdges = [];
            if (fileExtension === 'csv') {
                newEdges = await EdgeReader.readFromCsv(file, this.nodes, safeScale, this.renderer);
            } else if (fileExtension === 'yaml' || fileExtension === 'yml') {
                newEdges = await EdgeYamlReader.readFromYaml(file, safeScale, this.nodes, this.renderer);
                
                // Also process any style and page documents in the same YAML file
                // if they haven't been processed already by processNodeFiles
                if (!this.pageConfig) {
                    await this.processPageFromYaml(file);
                }
                await this.processStylesFromYaml(file);
            } else {
                console.warn(`Unsupported file format for edges: ${fileExtension}`);
                continue;
            }
            
            // Add edges to array, filtering out nulls
            this.edges = [...this.edges, ...newEdges.filter(edge => edge !== null)];
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
    
    /**
     * Get the page configuration
     * @returns {Object|null} - Page configuration or null if not defined
     */
    getPageConfig() {
        return this.pageConfig;
    }
}

module.exports = ReaderManager; 