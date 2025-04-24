/**
 * Core processor for managing properties across different document types
 * 
 * This class handles the universal aspects of property processing,
 * particularly the _dynamicProperties array that appears across all
 * document types (styles, nodes, edges, etc.)
 */
class PropertyProcessor {
  /**
   * The key used for properties in documents
   * @type {string}
   */
  static PROPERTIES_KEY = '_dynamicProperties';

  /**
   * Process properties from a document
   * 
   * This method:
   * 1. Extracts the properties array from the document
   * 2. Validates each property
   * 3. Adds valid properties to the allProperties array
   * 
   * @param {Object} doc - Document to process
   * @param {Array} allProperties - Existing properties array to append to
   * @returns {Array} Updated properties array
   */
  static processProperties(doc, allProperties = []) {
    if (!Array.isArray(doc[this.PROPERTIES_KEY])) {
      return allProperties;
    }

    // Validate each property
    doc[this.PROPERTIES_KEY].forEach(existingProp => {
      try {
        const { property, errors } = DynamicProperty.createValidated(existingProp);
        
        if (property) {
          allProperties.push(property);
        } else {
          console.warn(`Skipping invalid property: ${JSON.stringify(existingProp)}, Errors: ${errors.join(', ')}`);
        }
      } catch (error) {
        console.warn(`Error processing property: ${JSON.stringify(existingProp)}, Error: ${error.message}`);
      }
    });

    return allProperties;
  }

  /**
   * Process non-metadata properties from a document
   * 
   * @param {Object} doc - Document to process
   * @param {Array} allProperties - Properties array to append to
   * @param {Array} excludeKeys - Keys to exclude from processing
   * @param {Object} handler - Document-specific handler
   */
  static processRemainingProperties(doc, allProperties, excludeKeys = [], handler = null) {
    Object.entries(doc).forEach(([key, value]) => {
      // Skip excluded keys
      if (excludeKeys.includes(key)) {
        return;
      }
      
      // Use handler if available
      if (handler && typeof handler.processProperty === 'function') {
        handler.processProperty('common', key, value, allProperties);
      } else {
        // Default processing
        this.defaultPropertyProcessing(key, value, allProperties);
      }
    });
  }

  /**
   * Default processing for properties without a handler
   * 
   * @param {string} key - Property key
   * @param {*} value - Property value
   * @param {Array} properties - Properties array to append to
   */
  static defaultPropertyProcessing(key, value, properties) {
    if (typeof value === 'object' && value !== null) {
      // Create a temporary object with this property for nested objects
      const nestedProps = [];
      this.processNestedObject('common', key, value, nestedProps);
      
      if (nestedProps.length > 0) {
        properties.push(...nestedProps);
      }
    } else if (value !== undefined) {
      // Add simple value as a property
      const DynamicProperty = require('../models/dynamic-property');
      properties.push(new DynamicProperty({
        renderer: 'common',
        namePath: key,
        namePathArray: [key],
        value: value
      }));
    }
  }

  /**
   * Process a nested object into properties
   * 
   * @param {string} renderer - Renderer name
   * @param {string} parentKey - Parent key
   * @param {Object} obj - Object to process
   * @param {Array} properties - Properties array to append to
   */
  static processNestedObject(renderer, parentKey, obj, properties) {
    if (!obj || typeof obj !== 'object') return;
    
    Object.entries(obj).forEach(([key, value]) => {
      const fullPath = `${parentKey}.${key}`;
      
      if (typeof value === 'object' && value !== null) {
        this.processNestedObject(renderer, fullPath, value, properties);
      } else if (value !== undefined) {
        const DynamicProperty = require('../models/dynamic-property');
        properties.push(new DynamicProperty({
          renderer,
          namePath: fullPath,
          namePathArray: fullPath.split('.'),
          value
        }));
      }
    });
  }

  /**
   * Transform a document using a document handler
   * 
   * @param {Object} doc - Document to transform
   * @param {Object} documentHandler - Handler for document-specific processing
   * @returns {Object} Transformed document
   */
  static transformDocument(doc, documentHandler) {
    if (!doc || typeof doc !== 'object') return doc;
    
    const result = {};
    let allProperties = [];
    
    // Process properties (universal)
    allProperties = this.processProperties(doc, allProperties);
    
    // Document-specific metadata handling
    if (documentHandler && typeof documentHandler.processMetadata === 'function') {
      documentHandler.processMetadata(doc, result);
    }
    
    // Process remaining properties with handler-specific exclusions
    const excludeKeys = [
      this.PROPERTIES_KEY,
      ...(documentHandler?.getMetadataKeys() || [])
    ];
    
    this.processRemainingProperties(doc, allProperties, excludeKeys, documentHandler);
    
    // Add properties to result
    if (allProperties.length > 0) {
      result[this.PROPERTIES_KEY] = allProperties;
    }
    
    return result;
  }
}

module.exports = PropertyProcessor;
