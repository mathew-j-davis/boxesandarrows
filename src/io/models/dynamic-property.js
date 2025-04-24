const ValueParser = require('../readers/value-parser');

/**
 * Class representing a dynamic property
 */
class DynamicProperty {

  /**
   * Create a new dynamic property
   * @param {Object} options - Configuration options
   * @param {string} [options.renderer='common'] - The renderer name
   * //@param {string} [options.groupPath=''] - The group path
   * @param {string} [options.namePath=''] - The property name path
   * @param {string} [options.dataType='string'] - The data type
   * @param {*} [options.value=null] - The property value
   * @param {boolean} [options.isFlag=false] - Whether this is a flag property
   * @param {boolean} [options.clear=false] - Whether to clear child properties when this property is set
   */
  constructor(options = {}) {
    const defaults = {
      renderer: 'common',
      //groupPath: '',
      namePath: '',
      dataType: 'string',
      value: null,
      isFlag: false,
      clear: false
    };

    /*TODO validate properties on creation*/

    const config = { ...defaults, ...options };
    
    this.renderer = config.renderer;
    this.namePath = config.namePath;
    
    // Parse the namePath to determine which parts are names and which are indices
    this.namePathArray = [];
    this.namePathTypes = []; // 'name' or 'index'
    
    if (config.namePath) {
      const parts = config.namePath.split('.');
      parts.forEach(part => {
        this.namePathArray.push(part);
        // Check if the part is a numeric index
        if (/^\d+$/.test(part)) {
          this.namePathTypes.push('index');
        } else {
          this.namePathTypes.push('name');
        }
      });
    }
    
    this.dataType = config.dataType;
    this.isFlag = config.isFlag;
    this.value = config.value;
    this.clear = config.clear;
    
    // Allow for any additional properties from options
    Object.keys(config).forEach(key => {
      if (!(key in defaults)) {
        this[key] = config[key];
      }
    });
  }

  /**
   * Create a validated DynamicProperty from options
   * 
   * This factory method validates input data before creating a DynamicProperty.
   * It ensures proper typing, format validation, and constraint enforcement.
   * 
   * @param {Object} options - Property options
   * @returns {Object} An object with { property, errors } where property is the DynamicProperty instance or null if validation failed
   */
  static createValidated(options = {}) {
    const errors = [];
    const validatedOptions = { ...options };
    
    // 1. Validate renderer
    if (options.renderer === undefined || options.renderer === null) {
      validatedOptions.renderer = 'common';
    } else if (typeof options.renderer !== 'string') {
      errors.push('Renderer must be a string');
    }
    
    // 2. Validate namePath
    if (!options.namePath) {
      errors.push('namePath is required and cannot be empty');
    } else if (typeof options.namePath !== 'string') {
      errors.push('namePath must be a string');
    } else {
      // Check for namePath format issues
      if (options.namePath.includes('..')) {
        errors.push('namePath cannot contain double dots (..)');
      }
      
      if (options.namePath.startsWith('.') || options.namePath.endsWith('.')) {
        errors.push('namePath cannot start or end with a dot');
      }
      
      // Validate each path segment
      const segments = options.namePath.split('.');
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (segment === '') {
          errors.push(`namePath segment at position ${i} cannot be empty`);
        } else if (/^\s|\s$/.test(segment)) {
          errors.push(`namePath segment "${segment}" at position ${i} cannot have leading or trailing spaces`);
        } else if (/^\d+$/.test(segment)) {
          // This is a valid index segment (only contains digits)
        } else if (!/^[_a-zA-Z][a-zA-Z\d\s_\-]*$/.test(segment)) {
          errors.push(`Invalid namePath segment "${segment}" at position ${i}. If a name segment is not only numbers, it must start with a letter or underscore followed by letters, numbers, spaces, or underscores`);
        }
      }
    }


    // 4. Special handling for clear properties
    if (options.clear === true) {
      // If clear is true, ignore value, isFlag and dataType
      validatedOptions.value = null;
      validatedOptions.isFlag = false;
      validatedOptions.dataType = 'string';
    } else {
      // 5. Validate and process dataType
      if (options.dataType && typeof options.dataType !== 'string') {
        errors.push('dataType must be a string');
      }
      
      // 6. Validate and process value
      if (options.value === undefined) {
        validatedOptions.value = undefined;
        validatedOptions.dataType = 'undefined';
      } else if (options.value === null) {
        validatedOptions.value = null;
        validatedOptions.dataType = 'null';
      } else if (options.dataType) {
        // Parse value according to specified dataType
        try {
          validatedOptions.value = ValueParser.parse(options.value, options.dataType);
        } catch (error) {
          errors.push(`Failed to parse value as ${options.dataType}: ${error.message}`);
        }
      } else {
        // Infer dataType from value
        const valueType = typeof options.value;
        switch (valueType) {
          case 'string':
          case 'number':
          case 'boolean':
            validatedOptions.dataType = valueType;
            break;
          case 'object':
            errors.push('Value cannot be an object');
            break;
          default:
            errors.push(`Unsupported value type: ${valueType}`);
        }
      }
      
      // 6. Validate isFlag
      if (options.isFlag !== undefined && typeof options.isFlag !== 'boolean') {
        errors.push('isFlag must be a boolean');
      }
    }
    
    // Return early if validation failed
    if (errors.length > 0) {
      return { property: null, errors };
    }
    
    // Create and return the property
    return { 
      property: new DynamicProperty(validatedOptions), 
      errors: [] 
    };
  }

  /**
   * Create a property key string for this dynamic property
   * @returns {string} The property key string in the format _renderer:groupPath:type:namePath
   */
  toPropertyKey() {
    const type = this.isFlag ? 'flag' : this.dataType;
    return `_${this.renderer}:${this.groupPath}:${type}:${this.namePath}`;
  }

  /**
   * Get the fully qualified path for this property
   * @returns {string} The fully qualified path
   */
  getFullPath() {
    return this.namePath;
  }
  
  /**
   * Check if a specific part of the groupPath is an index
   * @param {number} position - The position in the groupPathArray to check
   * @returns {boolean} True if the part at the specified position is an index
   */


  /**
   * Check if a specific part of the namePath is an index
   * @param {number} position - The position in the namePathArray to check
   * @returns {boolean} True if the part at the specified position is an index
   */
  isNamePathIndex(position) {
    if (position < 0 || position >= this.namePathTypes.length) {
      return false;
    }
    return this.namePathTypes[position] === 'index';
  }
  
  /**
   * Get the namePathArray with indices converted to numbers
   * @returns {Array} The namePathArray with indices as numbers
   */
  getNamePathArrayWithIndices() {
    return this.namePathArray.map((part, index) => {
      if (this.namePathTypes[index] === 'index') {
        return parseInt(part, 10);
      }
      return part;
    });
  }
}

module.exports = DynamicProperty; 