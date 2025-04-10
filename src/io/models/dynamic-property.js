/**
 * Class representing a dynamic property
 */
class DynamicProperty {

  /**
   * Create a new dynamic property
   * @param {Object} options - Configuration options
   * @param {string} [options.renderer='common'] - The renderer name
   * @param {string} [options.group=''] - The group path
   * @param {string} [options.name=''] - The property name
   * @param {string} [options.dataType='string'] - The data type
   * @param {*} [options.value=null] - The property value
   * @param {boolean} [options.isFlag=false] - Whether this is a flag property
   * @param {boolean} [options.clearChildren=false] - Whether to clear child properties when this property is set
   */
  constructor(options = {}) {
    const defaults = {
      renderer: 'common',
      group: '',
      name: '',
      dataType: 'string',
      value: null,
      isFlag: false,
      clearChildren: false
    };

    const config = { ...defaults, ...options };
    
    this.renderer = config.renderer;
    this.group = config.group;
    this.groupPathArray = config.group ? config.group.split('.') : [];
    this.name = config.name;
    this.namePathArray = config.name ? config.name.split('.') : [];
    this.dataType = config.dataType;
    this.isFlag = config.isFlag;
    this.value = config.value;
    this.clearChildren = config.clearChildren;
    
    // Allow for any additional properties from options
    Object.keys(config).forEach(key => {
      if (!(key in defaults)) {
        this[key] = config[key];
      }
    });
  }

  /**
   * Create a property key string for this dynamic property
   * @returns {string} The property key string in the format _renderer:group:type:name
   */
  toPropertyKey() {
    const type = this.isFlag ? 'flag' : this.dataType;
    return `_${this.renderer}:${this.group}:${type}:${this.name}`;
  }

  /**
   * Get the fully qualified path for this property
   * @returns {string} The fully qualified path
   */
  getFullPath() {
    if (!this.group) {
      return this.name;
    }
    return `${this.group}.${this.name}`;
  }
}

module.exports = DynamicProperty; 