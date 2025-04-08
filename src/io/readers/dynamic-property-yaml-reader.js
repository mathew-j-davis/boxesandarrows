const yaml = require('js-yaml');
const fs = require('fs');

/**
 * Dynamic Property Class
 */
function DynamicProperty(renderer, group, name, dataType, value, isFlag = false) {
  this.renderer = renderer;
  this.group = group;
  this.groupPathArray = group ? group.split('.') : [];
  this.name = name;
  this.namePathArray = name ? name.split('.') : [];
  this.dataType = dataType;
  this.isFlag = isFlag;
  this.value = value;
}

/**
 * Reader for YAML files with custom tags for dynamic properties
 * Simplified version that only uses !renderer, !group, and !flag tags
 * !renderer tags must be at the top level of the document
 */
class DynamicPropertyYamlReader {
  /**
   * Get custom YAML schema for dynamic properties
   * @returns {yaml.Schema} Custom schema with dynamic property tags
   */
  static getSchema() {
    // Define custom tag types with explicit constructors that preserve tag info
    const rendererTag = new yaml.Type('!renderer', {
      kind: 'mapping',
      construct: function(data) {
        return { 
          __tag: 'renderer', 
          data: data || {} 
        };
      }
    });
    
    const groupTag = new yaml.Type('!group', {
      kind: 'mapping',
      construct: function(data) {
        return { 
          __tag: 'group', 
          data: data || {} 
        };
      }
    });
    
    const flagTag = new yaml.Type('!flag', {
      kind: 'scalar',
      construct: function(data) {
        return { 
          __tag: 'flag', 
          value: data 
        };
      }
    });
    
    // Create schema with our custom tags
    return yaml.DEFAULT_SCHEMA.extend([
      rendererTag, groupTag, flagTag
    ]);
  }

  /**
   * Load dynamic properties from YAML content
   * @param {string} yamlContent - YAML content to parse
   * @returns {Object} Parsed YAML with transformed renderer objects
   */
  static loadFromYaml(yamlContent) {
    try {
      // Create our custom schema
      const schema = this.getSchema();
      
      // Parse the YAML with the schema
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
   * !renderer tags are only processed if they are at the top level
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
   * This ensures that only top-level renderers are processed
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
   * @param {string} renderer - Renderer name
   * @param {Object} rendererObj - Renderer object
   * @param {Array} properties - Array to collect properties
   */
  static processRenderer(renderer, rendererObj, properties) {
    // Only process objects with renderer tag
    if (!this.hasTag(rendererObj, 'renderer')) return;
    
    // Process each property in the renderer
    const rendererData = rendererObj.data;
    this.processProperties(renderer, rendererData, "", properties);
  }

  /**
   * Process properties at a given level
   * @param {string} renderer - Renderer name
   * @param {Object} propsObj - Properties object
   * @param {string} groupPath - Current group path
   * @param {Array} properties - Array to collect properties
   */
  static processProperties(renderer, propsObj, groupPath, properties) {
    if (!propsObj || typeof propsObj !== 'object') return;
    
    Object.entries(propsObj).forEach(([key, value]) => {
      if (this.hasTag(value, 'group')) {
        // This is a group - process its properties with updated group path
        const childGroupPath = groupPath ? `${groupPath}.${key}` : key;
        this.processProperties(renderer, value.data, childGroupPath, properties);
      } else if (this.hasTag(value, 'flag')) {
        // This is a flag property
        this.addProperty(renderer, groupPath, key, 'string', value.value, true, properties);
      } else if (typeof value === 'object' && value !== null && !this.hasTag(value, 'renderer')) {
        // This could be a nested object (without tag) or another type
        // Ignore any nested renderer tags
        this.processNestedObject(renderer, groupPath, key, value, properties);
      } else if (!this.hasTag(value, 'renderer')) {
        // This is a simple value (ignore renderer tags)
        this.addUntaggedProperty(renderer, groupPath, key, value, properties);
      }
    });
  }

  /**
   * Process a nested object (without !group tag)
   * @param {string} renderer - Renderer name
   * @param {string} groupPath - Current group path
   * @param {string} baseName - Base name for this object
   * @param {Object} obj - Object to process
   * @param {Array} properties - Array to collect properties
   */
  static processNestedObject(renderer, groupPath, baseName, obj, properties) {
    // For an object value that's not tagged as a group, we create dotted property names
    Object.entries(obj).forEach(([key, value]) => {
      const propName = `${baseName}.${key}`;
      
      if (this.hasTag(value, 'flag')) {
        // Flag property
        this.addProperty(renderer, groupPath, propName, 'string', value.value, true, properties);
      } else if (typeof value === 'object' && value !== null && !value.__tag) {
        // Further nested object
        this.processNestedObject(renderer, groupPath, propName, value, properties);
      } else if (!this.hasTag(value, 'renderer')) {
        // Basic value (ignore renderer tags)
        this.addUntaggedProperty(renderer, groupPath, propName, value, properties);
      }
    });
  }

  /**
   * Add a property to the properties array
   * @param {string} renderer - Renderer name
   * @param {string} group - Group path
   * @param {string} name - Property name
   * @param {string} dataType - Data type
   * @param {*} value - Property value
   * @param {boolean} isFlag - Whether this is a flag property
   * @param {Array} properties - Array to collect properties
   */
  static addProperty(renderer, group, name, dataType, value, isFlag, properties) {
    properties.push(new DynamicProperty(
      renderer,
      group,
      name,
      dataType,
      value,
      isFlag
    ));
  }

  /**
   * Add an untagged property with auto-detected type
   * @param {string} renderer - Renderer name
   * @param {string} group - Group path
   * @param {string} name - Property name
   * @param {*} value - Property value
   * @param {Array} properties - Array to collect properties
   */
  static addUntaggedProperty(renderer, group, name, value, properties) {
    let dataType = 'string';
    let isFlag = false;
    
    // Auto-detect type based on JavaScript type
    if (typeof value === 'number') {
      dataType = Number.isInteger(value) ? 'integer' : 'float';
    } else if (typeof value === 'boolean') {
      dataType = 'boolean';
    }
    
    this.addProperty(renderer, group, name, dataType, value, isFlag, properties);
  }

  /**
   * Read and parse YAML from a file
   * @param {string} file - Path to YAML file
   * @returns {Promise<Object>} - Promise resolving to parsed YAML with transformed renderer objects
   */
  static async readFile(file) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      return this.loadFromYaml(content);
    } catch (error) {
      console.error('Error reading file:', error);
      return null;
    }
  }

  /**
   * Legacy method to maintain backward compatibility
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