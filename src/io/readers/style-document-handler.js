/**
 * Handler for style-specific document processing
 * 
 * This class is responsible for the style-specific aspects of document processing,
 * particularly metadata handling and property extraction from style documents.
 */
class StyleDocumentHandler {
  /**
   * Style document metadata keys
   * @type {Array<string>}
   */
  static METADATA_KEYS = ['type', 'name', 'page'];
  
  /**
   * Get metadata keys for style documents
   * @returns {Array<string>} Array of metadata keys
   */
  static getMetadataKeys() {
    return this.METADATA_KEYS;
  }
  
  /**
   * Process metadata from a style document
   * 
   * @param {Object} doc - Source document
   * @param {Object} result - Target document to add metadata to
   */
  static processMetadata(doc, result) {
    // Copy metadata fields
    if (doc.type) result.type = doc.type;
    if (doc.name) result.name = doc.name;
    if (doc.page) result.page = doc.page;
  }
  
  /**
   * Process a property from a style document
   * 
   * @param {string} renderer - Default renderer to use if not specified
   * @param {string} key - Property key
   * @param {*} value - Property value
   * @param {Array} properties - Properties array to append to
   */
  static processProperty(renderer, key, value, properties) {
    const PropertyProcessor = require('./property-processor');
    
    // Process renderer tags if present
    if (this.hasTag(value, 'renderer')) {
      // Extract renderer name (remove leading underscore if present)
      const rendererName = key.startsWith('_') ? key.substring(1) : key;
      
      // Process renderer properties
      const rendererProps = [];
      this.processRenderer(rendererName, value, rendererProps);
      
      // Add to properties collection
      if (rendererProps.length > 0) {
        properties.push(...rendererProps);
      }
    } else if (typeof value === 'object' && value !== null) {
      // For non-renderer objects, process as common properties
      PropertyProcessor.processNestedObject(renderer, key, value, properties);
    } else if (value !== undefined) {
      // For simple values, add as property
      const DynamicProperty = require('../models/dynamic-property');
      properties.push(new DynamicProperty({
        renderer,
        namePath: key,
        namePathArray: [key],
        value
      }));
    }
  }
  
  /**
   * Extract style documents from a JSON document
   * 
   * @param {Object} jsonDoc - JSON document to extract from
   * @returns {Array<Object>} Array of extracted documents
   */
  static extractDocumentsFromJson(jsonDoc) {
    if (!jsonDoc || typeof jsonDoc !== 'object') return [];
    
    const results = [];
    
    // Extract page configuration
    if (jsonDoc.page && typeof jsonDoc.page === 'object') {
      results.push({
        type: 'page',
        ...jsonDoc.page
      });
    }
    
    // Extract styles
    if (jsonDoc.style && typeof jsonDoc.style === 'object') {
      Object.entries(jsonDoc.style).forEach(([styleName, styleData]) => {
        results.push({
          type: 'style',
          name: styleName,
          ...styleData
        });
      });
    }
    
    return results;
  }
  
  /**
   * Check if a value has a specific tag
   * 
   * @param {*} value - Value to check
   * @param {string} tagName - Tag name to check for
   * @returns {boolean} True if the value has the tag
   */
  static hasTag(value, tagName) {
    return value && 
           typeof value === 'object' && 
           value.__tag === tagName;
  }
  
  /**
   * Process a renderer section in a style document
   * 
   * @param {string} rendererName - Renderer name
   * @param {Object} rendererObj - Renderer object
   * @param {Array} properties - Properties array to append to
   */
  static processRenderer(rendererName, rendererObj, properties) {
    if (!rendererObj || typeof rendererObj !== 'object') return;
    
    // Process the renderer's data
    if (rendererObj.__data && typeof rendererObj.__data === 'object') {
      Object.entries(rendererObj.__data).forEach(([key, value]) => {
        // Skip processing nested renderers
        if (this.hasTag(value, 'renderer')) return;
        
        // Process flags specially
        if (this.hasTag(value, 'flag')) {
          const DynamicProperty = require('../models/dynamic-property');
          properties.push(new DynamicProperty({
            renderer: rendererName,
            namePath: key,
            namePathArray: [key],
            isFlag: true
          }));
        } 
        // Process clear specially 
        else if (this.hasTag(value, 'clear')) {
          const DynamicProperty = require('../models/dynamic-property');
          properties.push(new DynamicProperty({
            renderer: rendererName,
            namePath: key,
            namePathArray: [key],
            clear: true
          }));
        }
        // Process nested objects
        else if (typeof value === 'object' && value !== null) {
          const PropertyProcessor = require('./property-processor');
          PropertyProcessor.processNestedObject(rendererName, key, value, properties);
        }
        // Process simple values
        else if (value !== undefined) {
          const DynamicProperty = require('../models/dynamic-property');
          properties.push(new DynamicProperty({
            renderer: rendererName,
            namePath: key,
            namePathArray: [key],
            value
          }));
        }
      });
    }
  }
}

module.exports = StyleDocumentHandler;
