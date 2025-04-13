const yaml = require('js-yaml');
const fs = require('fs');
const DynamicProperty = require('../models/dynamic-property');

/**
 * Reader for YAML files with custom tags for dynamic properties
 * 
 * This class handles parsing YAML with custom tags (!renderer, !group, !flag, !clear)
 * and transforming them into dynamic property objects.
 * 
 * The process works in two main steps:
 * 1. YAML Parsing: js-yaml parses the YAML and calls our custom tag constructors
 * 2. Dynamic Property Mapping: We traverse the resulting objects to extract properties
 */
class DynamicPropertyYamlReader {
  /**
   * Get custom YAML schema for dynamic properties
   * 
   * The js-yaml library uses schemas to define how to handle custom tags.
   * Each tag type needs:
   * - A kind (scalar, mapping, sequence) that tells js-yaml what data pattern it applies to
   * - A construct function that converts the raw parsed data into our intermediate object format
   * 
   * When js-yaml encounters a tag (like !renderer), it:
   * 1. Looks up the tag in our schema
   * 2. Parses the value based on the kind
   * 3. Calls the construct function with the parsed value
   * 4. Replaces the tagged node with the result of construct
   * 
   * Our pattern is to create objects with:
   * - __tag: The tag name (without !) for identification
   * - __data/value: The actual data (data for mappings, value for scalars)
   * 
   * Later processing code checks for these __tag markers to identify special handling.
   * 
   * @returns {yaml.Schema} Custom schema with dynamic property tags
   */
  static getSchema() {
    // Define custom tag types with explicit constructors that preserve tag info
    
    /**
     * !renderer tag: Identifies a renderer object containing dynamic properties
     * Example: common: !renderer
     *            property: value
     * 
     * This creates: { __tag: 'renderer', __data: { property: value } }
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
     * !group tag: Represents a property group (namespace)
     * Example: label: !group
     *            font: Arial
     * 
     * This creates: { __tag: 'group', __data: { font: 'Arial' } }
     */
    // const groupTag = new yaml.Type('!group', {
    //   kind: 'mapping',
    //   construct: function(data) {
    //     return { 
    //       __tag: 'group', 
    //       __data: data || {} 
    //     };
    //   }
    // });
    
    /**
     * !flag tag: Represents a flag property (a string with special handling)
     * Example: style: !flag bold
     * 
     * This creates: { __tag: 'flag', __value: 'bold' }
     */
    const flagTag = new yaml.Type('!flag', {
      kind: 'scalar',
      construct: function(data) {
        return { 
          __tag: 'flag', 
          __value: data 
        };
      }
    });
    
    /**
     * !clear tag (scalar form): Marks a property to clear children during merging
     * Example: margin: !clear 5
     * 
     * This creates: { __tag: 'clear', __value: 5, __clear: true }
     */
    const clearScalarTag = new yaml.Type('!clear', {
      kind: 'scalar',
      construct: function(data) {
        return { 
          __tag: 'clear', 
          __value: data,
          __clear: true
        };
      }
    });
    
    /**
     * !clear tag (mapping form): Same as scalar form but for mappings
     * Example: margin: !clear
     *            __value: 5
     *            unit: 'px'
     * 
     * This creates: 
     * - With __value: { __tag: 'clear', __value: 5, __clear: true }
     * - With other properties: { __tag: 'clear', __value: { unit: 'px' }, __clear: true }
     * 
     * The __value is extracted if present, otherwise the whole object becomes the value
     */
    const clearMappingTag = new yaml.Type('!clear', {
      kind: 'mapping',
      construct: function(data) {
        // If there's no data or it's not an object, return a simple value
        if (!data || typeof data !== 'object') {
          return { 
            __tag: 'clear', 
            __value: data,
            __clear: true 
          };
        }

        // If __value is specified, extract it and don't include the rest
        if ('__value' in data) {
          return { 
            __tag: 'clear', 
            __value: data.__value,
            __clear: true 
          };
        }
        
        // Otherwise use the whole object as the value
        return { 
          __tag: 'clear', 
          __value: data,
          __clear: true 
        };
      }
    });

    // Create schema by extending the default schema with our custom tags
    // This allows all standard YAML syntax plus our custom tags
    return yaml.DEFAULT_SCHEMA.extend([
      rendererTag, 
      // groupTag, // Removed group tag
      flagTag, 
      clearScalarTag, 
      clearMappingTag
    ]);
  }

  /**
   * Load dynamic properties from YAML content
   * 
   * This is a two-step process:
   * 1. Use js-yaml's loadAll to parse the YAML documents with our custom schema
   * 2. Transform each document to extract and organize dynamic properties
   * 
   * @param {string} yamlContent - YAML content to parse
   * @returns {Object} Parsed YAML with transformed renderer objects
   */
  static loadFromYaml(yamlContent) {
    try {
      // Create our custom schema
      const schema = this.getSchema();
      
      // Parse the YAML with the schema
      // loadAll returns all documents in a multi-document YAML string (separated by ---)
      const docs = yaml.loadAll(yamlContent, { schema });
      
      // Transform the documents
      const transformedDocs = docs.map(doc => this.transformDocument(doc));
      
      // If only one document, return it directly
      if (transformedDocs.length === 1) {
        return transformedDocs[0];
      }
      
      // Otherwise return the array of documents
      return transformedDocs;
    } catch (error) {
      console.error('Error parsing YAML:', error);
      return null;
    }
  }
  
  /**
   * Transform a parsed YAML document
   * 
   * This method:
   * 1. Identifies !renderer tags at the top level
   * 2. Processes them to extract dynamic properties
   * 3. Collects these properties into a _dynamicProperties array
   * 4. Keeps the rest of the document unchanged
   * 
   * @param {Object} doc - YAML document
   * @returns {Object} Transformed document
   */
  static transformDocument(doc) {
    if (!doc || typeof doc !== 'object') return doc;
    
    const result = {};
    const allProperties = [];
    
    // Process each property in the document
    Object.entries(doc).forEach(([key, value]) => {
      // Only process renderer tags at the top level
      if (this.hasTag(value, 'renderer')) {
        // This is a renderer - transform it
        const properties = [];
        this.processRenderer(key, value, properties);
        
        // Add all properties to our collection
        if (properties.length > 0) {
          allProperties.push(...properties);
        }
      } else {
        // For nested objects, recursively check and remove any renderer tags
        if (typeof value === 'object' && value !== null) {
          result[key] = this.removeNestedRenderers(value);
        } else {
          // Not a renderer - keep as is
          result[key] = value;
        }
      }
    });
    
    // If we already have _dynamicProperties, append to it, otherwise create it
    if (result._dynamicProperties && Array.isArray(result._dynamicProperties)) {
      result._dynamicProperties.push(...allProperties);
    } else {
      result._dynamicProperties = allProperties;
    }
    
    return result;
  }

  /**
   * Remove any nested renderer tags from an object
   * 
   * This ensures that only top-level renderers are processed
   * by recursively traversing an object and converting any !renderer
   * tags to empty objects (effectively removing them).
   * 
   * @param {Object} obj - Object to clean
   * @returns {Object} Object with nested renderer tags removed
   */
  static removeNestedRenderers(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    // If it's an array, process each element
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeNestedRenderers(item));
    }
    
    // If this is a renderer tag, return an empty object (ignoring it)
    if (this.hasTag(obj, 'renderer')) {
      return {};
    }
    
    // For other objects, process each property
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
      // Recursively process nested objects
      if (typeof value === 'object' && value !== null) {
        result[key] = this.removeNestedRenderers(value);
      } else {
        result[key] = value;
      }
    });
    
    return result;
  }

  /**
   * Check if an object has our custom tag
   * 
   * This method looks for the __tag property we add in our
   * custom tag construct functions and checks if it matches
   * the specified tag name.
   * 
   * @param {*} obj - Object to check
   * @param {string} tagName - Tag name without !
   * @returns {boolean} - Whether the object has the tag
   */
  static hasTag(obj, tagName) {
    return obj && 
           typeof obj === 'object' && 
           obj.__tag === tagName;
  }

  /**
   * Process a renderer
   * 
   * This is the entry point for processing a !renderer tagged object.
   * It extracts the properties defined within the renderer.
   * 
   * @param {string} renderer - Renderer name
   * @param {Object} rendererObj - Renderer object
   * @param {Array} properties - Array to collect properties
   */
  static processRenderer(renderer, rendererObj, properties) {
    // Only process objects with renderer tag
    if (!this.hasTag(rendererObj, 'renderer')) return;
    
    // Process each property in the renderer
    const rendererData = rendererObj.__data;
    this.processProperties(renderer, rendererData, properties);
  }

  /**
   * Process properties at a given level
   * 
   * This method is called recursively to process properties within
   * a renderer or group. It handles different tags (!group, !flag)
   * and nested objects.
   * 
   * @param {string} renderer - Renderer name
   * @param {Object} propsObj - Properties object
   * @param {Array} properties - Array to collect properties
   */
  static processProperties(renderer, propsObj, properties) {
    if (!propsObj || typeof propsObj !== 'object') return;
    
    Object.entries(propsObj).forEach(([key, value]) => {
      if (this.hasTag(value, 'flag')) {
        // This is a flag property - groupPath is empty
        this.addProperty(renderer, key, 'string', value.__value, true, properties);
      } else if (this.hasTag(value, 'clear')) {
        // This is a clear property - groupPath is empty
        const clear = value.__clear; // Should be true

        // Process the value based on its type
        if (value.__value === undefined || value.__value === null) {
          // No value or null value - add with clear flag
          this.addProperty(renderer, key, 'string', null, false, properties, clear);
        } else if (typeof value.__value === 'object' && !Array.isArray(value.__value)) {
          // Value is an object - create the parent property with clear flag
          this.addProperty(renderer, key, 'string', null, false, properties, clear);
          
          // Then process the object properties as nested
          this.processNestedObject(renderer, key, value.__value, properties);
        } else {
          // Simple scalar value - add with clear flag
          this.addUntaggedProperty(renderer, key, value.__value, properties, clear);
        }
      } else if (typeof value === 'object' && value !== null && !this.hasTag(value, 'renderer')) {
        // This is a nested object (no !group needed)
        // Process it to create dotted property names
        this.processNestedObject(renderer, key, value, properties);
      } else if (!this.hasTag(value, 'renderer')) {
        // This is a simple value (ignore renderer tags) - groupPath is empty
        this.addUntaggedProperty(renderer, key, value, properties);
      }
    });
  }
  
  /**
   * Process a nested object (without !group tag)
   * 
   * When we encounter an untagged object, we treat it as a
   * hierarchical property with dotted notation. For example:
   * font: { size: 12 } becomes font.size: 12
   * 
   * @param {string} renderer - Renderer name
   * @param {string} baseName - Base name for this object
   * @param {Object} obj - Object to process
   * @param {Array} properties - Array to collect properties
   */
  static processNestedObject(renderer, baseName, obj, properties) {
    // For an object value that's not tagged as a group, we create dotted property names
    Object.entries(obj).forEach(([key, value]) => {
      const propName = `${baseName}.${key}`;
      
      if (this.hasTag(value, 'flag')) {
        // Flag property
        this.addProperty(renderer, propName, 'string', value.__value, true, properties);
      } else if (this.hasTag(value, 'clear')) {
        // This is a clear property
        const clear = value.__clear; // Should be true

        // Process the value based on its type
        if (value.__value === undefined || value.__value === null) {
          // No value or null value - just add with the clear flag
          this.addProperty(renderer, propName, 'string', null, false, properties, clear);
        } else if (typeof value.__value === 'object' && !Array.isArray(value.__value)) {
          // Value is an object - create the parent property with clear flag
          this.addProperty(renderer, propName, 'string', null, false, properties, clear);
          
          // Then process the object properties as nested
          this.processNestedObject(renderer, propName, value.__value, properties);
        } else {
          // Simple scalar value - add with the clear flag
          this.addUntaggedProperty(renderer, propName, value.__value, properties, clear);
        }
      } else if (typeof value === 'object' && value !== null && !value.__tag) {
        // Further nested object
        this.processNestedObject(renderer, propName, value, properties);
      } else if (!this.hasTag(value, 'renderer')) {
        // Basic value (ignore renderer tags)
        this.addUntaggedProperty(renderer, propName, value, properties);
      }
    });
  }
  
  /**
   * Add a property to the properties array
   * 
   * Creates a new DynamicProperty instance and adds it to the properties array.
   * 
   * @param {string} renderer - Renderer name
   * @param {string} namePath - Property name path
   * @param {string} dataType - Data type
   * @param {*} value - Property value
   * @param {boolean} isFlag - Whether this is a flag property
   * @param {Array} properties - Array to collect properties
   * @param {boolean} clear - Whether to clear child properties when this property is set
   */
  static addProperty(renderer, namePath, dataType, value, isFlag, properties, clear = false) {
    properties.push(new DynamicProperty({
      renderer,
      namePath,
      dataType,
      value,
      isFlag,
      clear
    }));
  }

  /**
   * Add an untagged property with auto-detected type
   * 
   * For properties without explicit type tags (!flag), we
   * auto-detect the type based on JavaScript's typeof operator.
   * 
   * @param {string} renderer - Renderer name
   * @param {string} name - Property name
   * @param {*} value - Property value
   * @param {Array} properties - Array to collect properties
   * @param {boolean} clear - Whether to clear child properties when this property is set
   */
  static addUntaggedProperty(renderer, name, value, properties, clear = false) {
    let dataType = 'string';
    let isFlag = false;
    
    // Auto-detect type based on JavaScript type
    if (typeof value === 'number') {
      dataType = Number.isInteger(value) ? 'integer' : 'float';
    } else if (typeof value === 'boolean') {
      dataType = 'boolean';
    }
    
    this.addProperty(renderer, name, dataType, value, isFlag, properties, clear);
  }

  /**
   * Read and parse YAML from a file
   * 
   * Convenience method to read a file and parse its YAML content.
   * 
   * @param {string} file - Path to YAML file
   * @returns {Promise<Object>} - Promise resolving to parsed YAML with transformed renderer objects
   */
  // static async readFile(file) {
  //   try {
  //     const content = fs.readFileSync(file, 'utf8');
  //     return this.loadFromYaml(content);
  //   } catch (error) {
  //     console.error('Error reading file:', error);
  //     return null;
  //   }
  // }


      /**
     * Read a YAML file and return the parsed documents
     * @param {string} yamlFile - Path to the YAML file
     * @param {Object} options - Options for processing (optional)
     * @param {Function} options.filter - Optional filter function to apply to documents
     * @returns {Promise<Array>} - Array of parsed YAML documents
     */
      static async readFile(yamlFile, options = {}) {
        try {
            const content = await fs.promises.readFile(yamlFile, 'utf8');
            const documents = yaml.loadAll(content);
            
            // Apply filter if provided
            if (options.filter && typeof options.filter === 'function') {
                return documents.filter(options.filter);
            }
            
            return documents;
        } catch (error) {
            console.error(`Error reading YAML file ${yamlFile}:`, error);
            throw error;
        }
    }

  /**
   * Legacy method to maintain backward compatibility
   * 
   * Similar to loadFromYaml but returns just the array of dynamic properties
   * instead of the full document structure.
   * 
   * @param {string} yamlContent - YAML content to parse
   * @returns {Array} Array of dynamic properties
   */
  static loadDynamicProperties(yamlContent) {
    try {
      // Create our custom schema
      const schema = this.getSchema();
      
      // Parse the YAML with the schema
      const docs = yaml.loadAll(yamlContent, { schema });
      
      // Extract properties from all renderers
      const properties = [];
      for (const doc of docs) {
        if (!doc) continue;
        
        // Process each renderer in the document
        Object.entries(doc).forEach(([rendererName, rendererValue]) => {
          if (this.hasTag(rendererValue, 'renderer')) {
            this.processRenderer(rendererName, rendererValue, properties);
          }
        });
      }
      
      return properties;
    } catch (error) {
      console.error('Error parsing YAML:', error);
      return [];
    }
  }
}

module.exports = DynamicPropertyYamlReader;