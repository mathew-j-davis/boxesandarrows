const fs = require('fs').promises;
const yaml = require('js-yaml');
const PropertyProcessor = require('./property-processor');
const StyleDocumentHandler = require('./style-document-handler');
const DynamicProperty = require('../models/dynamic-property');

/**
 * Reader for properties from YAML and JSON files
 * 
 * This class handles parsing and processing of property documents in
 * both YAML and JSON formats, delegating document-specific processing
 * to appropriate handlers.
 */
class PropertyReader {
  /**
   * Get custom YAML schema for properties
   * 
   * The schema defines how to handle custom tags in YAML.
   * Each tag type has a kind (scalar, mapping, sequence) and
   * a construct function that converts the parsed data.
   * 
   * @returns {yaml.Schema} Custom schema with property tags
   */
  static getSchema() {
    // Define custom tag types with explicit constructors that preserve tag info
    
    /**
     * !renderer tag: Identifies a renderer object containing properties
     */
    const rendererTag = new yaml.Type('!renderer', {
      kind: 'mapping',
      construct: function(data) {
        return { 
          __tag: 'renderer',
          __data: data || {}
        };
      }
    });
    
    /**
     * !flag tag: Sets a property flag
     */
    const flagTag = new yaml.Type('!flag', {
      kind: 'scalar',
      construct: function(data) {
        return { 
          __tag: 'flag'
        };
      }
    });
    
    /**
     * !clear tag (scalar form): Marks a property for clearing
     */
    const clearScalarTag = new yaml.Type('!clear', {
      kind: 'scalar',
      construct: function(data) {
        return { 
          __tag: 'clear'
        };
      }
    });
    
    /**
     * !clear tag (mapping form): Same as scalar form but for mappings
     */
    const clearMappingTag = new yaml.Type('!clear', {
      kind: 'mapping',
      construct: function(data) {
        return { 
          __tag: 'clear'
        };
      }
    });

    // Create schema by extending the default schema with our custom tags
    return yaml.DEFAULT_SCHEMA.extend([
      rendererTag, 
      flagTag, 
      clearScalarTag, 
      clearMappingTag
    ]);
  }

  /**
   * Load raw YAML documents without transformation
   * 
   * @param {string} yamlContent - YAML content to parse
   * @param {Object} options - Options for loading
   * @returns {Array} Array of parsed YAML documents
   */
  static loadRawYamlDocuments(yamlContent, options = {}) {
    // Create our custom schema
    const schema = this.getSchema();
    
    // Parse the YAML with the schema
    // loadAll returns all documents in a multi-document YAML string (separated by ---)
    let docs = yaml.loadAll(yamlContent, { schema });
    
    // Apply filter if provided
    if (options.filter && typeof options.filter === 'function') {
      docs = docs.filter(options.filter);
    }
    
    return docs;
  }
  
  /**
   * Read and transform YAML documents from content
   * 
   * @param {string} yamlContent - YAML content to parse
   * @param {Object} options - Options for loading and transforming
   * @param {Function} options.filter - Filter function for documents
   * @param {Object} options.handler - Document handler for transformation
   * @returns {Array} Array of transformed documents
   */
  static loadFromYaml(yamlContent, options = {}) {
    try {
      // Load raw YAML documents
      const docs = this.loadRawYamlDocuments(yamlContent, options);
      
      // Transform each document using the provided handler or default to StyleDocumentHandler
      const handler = options.handler || StyleDocumentHandler;
      const transformedDocs = docs.map(doc => 
        PropertyProcessor.transformDocument(doc, handler)
      );
      
      return transformedDocs;
    } catch (error) {
      console.error('Error parsing YAML:', error);
      return [];
    }
  }
  
  /**
   * Read and transform JSON documents from content
   * 
   * @param {string} jsonContent - JSON content to parse 
   * @param {Object} options - Options for parsing and transforming
   * @param {Object} options.handler - Document handler for transformation
   * @returns {Array} Array of transformed documents
   */
  static loadFromJson(jsonContent, options = {}) {
    try {
      // Parse JSON content
      let jsonDoc = JSON.parse(jsonContent);
      
      // Ensure it's properly structured
      if (!jsonDoc.style && !jsonDoc.page) {
        jsonDoc = { style: jsonDoc };
      }
      
      // Extract documents using the provided handler or default to StyleDocumentHandler
      const handler = options.handler || StyleDocumentHandler;
      const extractedDocs = handler.extractDocumentsFromJson(jsonDoc);
      
      // Transform each document
      return extractedDocs.map(doc => 
        PropertyProcessor.transformDocument(doc, handler)
      );
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return [];
    }
  }
  
  /**
   * Read a YAML file and return transformed documents
   * 
   * @param {string} yamlFile - Path to the YAML file
   * @param {Object} options - Options for loading and transforming
   * @returns {Promise<Array>} Promise resolving to transformed documents
   */
  static async readYamlFile(yamlFile, options = {}) {
    try {
      const content = await fs.readFile(yamlFile, 'utf8');
      return this.loadFromYaml(content, options);
    } catch (error) {
      console.error(`Error reading YAML file ${yamlFile}:`, error);
      return [];
    }
  }
  
  /**
   * Read a JSON file and return transformed documents
   * 
   * @param {string} jsonFile - Path to the JSON file
   * @param {Object} options - Options for parsing and transforming
   * @returns {Promise<Array>} Promise resolving to transformed documents
   */
  static async readJsonFile(jsonFile, options = {}) {
    try {
      const content = await fs.readFile(jsonFile, 'utf8');
      return this.loadFromJson(content, options);
    } catch (error) {
      console.error(`Error reading JSON file ${jsonFile}:`, error);
      return [];
    }
  }
}

module.exports = PropertyReader;
