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
 */
class DynamicPropertyYamlReader {
  /**
   * Get custom YAML schema for dynamic properties
   * @returns {yaml.Schema} Custom schema with dynamic property tags
   */
  static getSchema() {
    // Define custom tag types - these will just add tag info to the objects
    const rendererTag = new yaml.Type('!renderer', {
      kind: 'mapping'
    });
    
    const groupTag = new yaml.Type('!group', {
      kind: 'mapping'
    });
    
    const stringTag = new yaml.Type('!string', {
      kind: 'scalar'
    });
    
    const floatTag = new yaml.Type('!float', {
      kind: 'scalar'
    });
    
    const boolTag = new yaml.Type('!bool', {
      kind: 'scalar'
    });
    
    const flagTag = new yaml.Type('!flag', {
      kind: 'scalar'
    });
    
    // Create schema with all our custom tags
    return yaml.DEFAULT_SCHEMA.extend([
      rendererTag, groupTag, stringTag, floatTag, boolTag, flagTag
    ]);
  }

  /**
   * Load dynamic properties from YAML content
   * @param {string} yamlContent - YAML content to parse
   * @returns {Array} Parsed dynamic properties
   */
  static loadDynamicProperties(yamlContent) {
    try {
      // Create our custom schema
      const schema = this.getSchema();
      
      // Parse the YAML with the schema to get an intermediate representation
      const docs = yaml.loadAll(yamlContent, { schema });
      
      // Transform the intermediate representation to dynamic properties
      const properties = [];
      for (const doc of docs) {
        if (!doc) continue;
        this.processDocument(doc, properties);
      }
      
      return properties;
    } catch (error) {
      console.error('Error parsing YAML:', error);
      return [];
    }
  }

  /**
   * Process a parsed YAML document
   * @param {Object} doc - YAML document
   * @param {Array} properties - Array to collect properties
   */
  static processDocument(doc, properties) {
    // Process each renderer in the document
    Object.entries(doc).forEach(([rendererName, rendererValue]) => {
      // For each renderer, start a tag path for tracking
      const tagPath = [];
      this.processRendererProperties(rendererName, rendererValue, tagPath, properties);
    });
  }

  /**
   * Determine whether an object has a YAML tag
   * @param {*} obj - Object to check
   * @param {string} tag - Tag to check for (without !)
   * @returns {boolean} - Whether the object has the tag
   */
  static hasTag(obj, tag) {
    return obj && 
           typeof obj === 'object' && 
           obj.tag === `!${tag}`;
  }

  /**
   * Process renderer properties
   * @param {string} renderer - Renderer name
   * @param {Object} rendererObj - Renderer object
   * @param {Array} tagPath - Current tag path
   * @param {Array} properties - Array to collect properties  
   */
  static processRendererProperties(renderer, rendererObj, tagPath, properties) {
    // Process each property in the renderer
    Object.entries(rendererObj).forEach(([key, value]) => {
      if (this.hasTag(value, 'group')) {
        // This is a tagged group - add to tag path and process
        const groupTagPath = [...tagPath, key];
        this.processGroupProperties(renderer, value, groupTagPath, properties);
      } else if (this.hasTag(value, 'string')) {
        // String property
        this.addTypedProperty(renderer, tagPath.join('.'), key, 'string', value, properties);
      } else if (this.hasTag(value, 'float')) {
        // Float property
        this.addTypedProperty(renderer, tagPath.join('.'), key, 'float', value, properties);
      } else if (this.hasTag(value, 'bool')) {
        // Boolean property
        this.addTypedProperty(renderer, tagPath.join('.'), key, 'bool', value, properties);
      } else if (this.hasTag(value, 'flag')) {
        // Flag property
        this.addFlagProperty(renderer, tagPath.join('.'), key, value, properties);
      } else if (typeof value === 'object' && value !== null) {
        // Untagged object/mapping - treat as nested property in name
        this.processNestedProperty(renderer, tagPath.join('.'), key, value, properties);
      } else {
        // Basic value
        this.addUntaggedProperty(renderer, tagPath.join('.'), key, value, properties);
      }
    });
  }

  /**
   * Process a group and its properties
   * @param {string} renderer - Renderer name
   * @param {Object} groupObj - Group object
   * @param {Array} tagPath - Current tag path
   * @param {Array} properties - Array to collect properties
   */
  static processGroupProperties(renderer, groupObj, tagPath, properties) {
    // Process each property in the group
    Object.entries(groupObj).forEach(([key, value]) => {
      if (this.hasTag(value, 'group')) {
        // Nested group - add to tag path and process
        const nestedTagPath = [...tagPath, key];
        this.processGroupProperties(renderer, value, nestedTagPath, properties);
      } else if (this.hasTag(value, 'string')) {
        // String property
        this.addTypedProperty(renderer, tagPath.join('.'), key, 'string', value, properties);
      } else if (this.hasTag(value, 'float')) {
        // Float property
        this.addTypedProperty(renderer, tagPath.join('.'), key, 'float', value, properties);
      } else if (this.hasTag(value, 'bool')) {
        // Boolean property
        this.addTypedProperty(renderer, tagPath.join('.'), key, 'bool', value, properties);
      } else if (this.hasTag(value, 'flag')) {
        // Flag property
        this.addFlagProperty(renderer, tagPath.join('.'), key, value, properties);
      } else if (typeof value === 'object' && value !== null) {
        // Untagged object - process as nested properties with name path
        this.processNestedProperty(renderer, tagPath.join('.'), key, value, properties);
      } else {
        // Basic value
        this.addUntaggedProperty(renderer, tagPath.join('.'), key, value, properties);
      }
    });
  }

  /**
   * Process a nested untagged property
   * @param {string} renderer - Renderer name
   * @param {string} groupPath - Current group path 
   * @param {string} propName - Property name
   * @param {Object} value - Property value
   * @param {Array} properties - Array to collect properties
   */
  static processNestedProperty(renderer, groupPath, propName, value, properties) {
    if (typeof value !== 'object' || value === null) {
      // Not an object, just add as a property
      this.addUntaggedProperty(renderer, groupPath, propName, value, properties);
      return;
    }

    // Process each property in the nested object
    Object.entries(value).forEach(([key, nestedValue]) => {
      const nestedName = `${propName}.${key}`;
      
      if (typeof nestedValue === 'object' && nestedValue !== null && !nestedValue.tag) {
        // Further nesting
        this.processNestedProperty(renderer, groupPath, nestedName, nestedValue, properties);
      } else if (nestedValue && nestedValue.tag) {
        // Tagged value
        if (nestedValue.tag === '!string') {
          this.addTypedProperty(renderer, groupPath, nestedName, 'string', nestedValue, properties);
        } else if (nestedValue.tag === '!float') {
          this.addTypedProperty(renderer, groupPath, nestedName, 'float', nestedValue, properties);
        } else if (nestedValue.tag === '!bool') {
          this.addTypedProperty(renderer, groupPath, nestedName, 'bool', nestedValue, properties);
        } else if (nestedValue.tag === '!flag') {
          this.addFlagProperty(renderer, groupPath, nestedName, nestedValue, properties);
        } else if (nestedValue.tag === '!group') {
          // Group tag inside untagged object - not expected, but handle it
          const newGroupPath = groupPath ? `${groupPath}.${propName}` : propName;
          this.processGroupProperties(renderer, nestedValue, [newGroupPath, key], properties);
        }
      } else {
        // Basic value
        this.addUntaggedProperty(renderer, groupPath, nestedName, nestedValue, properties);
      }
    });
  }
  
  /**
   * Add a typed property
   * @param {string} renderer - Renderer name
   * @param {string} group - Group path
   * @param {string} name - Property name
   * @param {string} type - Property type (string, float, bool)
   * @param {*} value - Property value
   * @param {Array} properties - Array to collect properties
   */
  static addTypedProperty(renderer, group, name, type, value, properties) {
    let dataType = 'string';
    let processedValue = value;
    
    switch (type) {
      case 'string':
        dataType = 'string';
        break;
      case 'float':
        dataType = 'float';
        processedValue = typeof value === 'string' ? parseFloat(value) : value;
        break;
      case 'bool':
        dataType = 'boolean';
        if (typeof value === 'string') {
          processedValue = value.toLowerCase() === 'true';
        } else {
          processedValue = Boolean(value);
        }
        break;
    }
    
    this.addProperty(renderer, group, name, dataType, false, processedValue, properties);
  }
  
  /**
   * Add a flag property
   * @param {string} renderer - Renderer name
   * @param {string} group - Group path
   * @param {string} name - Property name
   * @param {*} value - Property value
   * @param {Array} properties - Array to collect properties
   */
  static addFlagProperty(renderer, group, name, value, properties) {
    // Handle flag property (value could be null, empty string, or a value)
    this.addProperty(renderer, group, name, 'string', true, value, properties);
  }
  
  /**
   * Add a property to the properties array
   * @param {string} renderer - Renderer name
   * @param {string} group - Group path
   * @param {string} name - Property name
   * @param {string} dataType - Data type
   * @param {boolean} isFlag - Whether this is a flag property
   * @param {*} value - Property value
   * @param {Array} properties - Array to collect properties
   */
  static addProperty(renderer, group, name, dataType, isFlag, value, properties) {
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
    
    // Auto-detect type
    if (typeof value === 'number') {
      dataType = Number.isInteger(value) ? 'integer' : 'float';
    } else if (typeof value === 'boolean') {
      dataType = 'boolean';
    }
    
    this.addProperty(renderer, group, name, dataType, false, value, properties);
  }

  /**
   * Read dynamic properties from a YAML file
   * @param {string} file - Path to YAML file
   * @returns {Promise<Array>} - Promise resolving to array of dynamic properties
   */
  static async readFile(file) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      return this.loadDynamicProperties(content);
    } catch (error) {
      console.error('Error reading file:', error);
      return [];
    }
  }
}

module.exports = DynamicPropertyYamlReader;
