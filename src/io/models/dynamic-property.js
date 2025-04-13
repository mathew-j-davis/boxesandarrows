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

    const config = { ...defaults, ...options };
    
    this.renderer = config.renderer;
    //this.groupPath = config.groupPath;
    
    // Parse the groupPath to determine which parts are names and which are indices
    //this.groupPathArray = [];
    //this.groupPathTypes = []; // 'name' or 'index'
    
    // if (config.groupPath) {
    //   const parts = config.groupPath.split('.');
    //   parts.forEach(part => {
    //     this.groupPathArray.push(part);
    //     // Check if the part is a numeric index
    //     if (/^\d+$/.test(part)) {
    //       this.groupPathTypes.push('index');
    //     } else {
    //       this.groupPathTypes.push('name');
    //     }
    //   });
    // }
    
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
    //if (!this.groupPath) {
    //  return this.namePath;
    //}
    //return `${this.groupPath}.${this.namePath}`;
    return this.namePath;
  }
  
  /**
   * Check if a specific part of the groupPath is an index
   * @param {number} position - The position in the groupPathArray to check
   * @returns {boolean} True if the part at the specified position is an index
   */
  // isGroupPathIndex(position) {
  //   if (position < 0 || position >= this.groupPathTypes.length) {
  //     return false;
  //   }
  //   return this.groupPathTypes[position] === 'index';
  // }
  
  /**
   * Get the groupPathArray with indices converted to numbers
   * @returns {Array} The groupPathArray with indices as numbers
   */
  // getGroupPathArrayWithIndices() {
  //   return this.groupPathArray.map((part, index) => {
  //     if (this.groupPathTypes[index] === 'index') {
  //       return parseInt(part, 10);
  //     }
  //     return part;
  //   });
  // }
  
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