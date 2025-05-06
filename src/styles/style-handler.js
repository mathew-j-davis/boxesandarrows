const ObjectUtils = require('../utils/object-utils');
const DynamicPropertyMerger = require('../io/readers/dynamic-property-merger');
const DynamicProperty = require('../io/models/dynamic-property');

// Base style for normalization
const BASE_STYLE = 'base';

/**
 * Base StyleHandler class for managing style properties across different renderers
 * Provides common functionality for style management while allowing renderer-specific extensions
 */
class StyleHandler {
    /**
     * Create a new StyleHandler
     * @param {Object} options - Configuration options
     * @param {boolean} options.verbose - Enable verbose logging
     */
    constructor(options = {}) {
        this.verbose = options.verbose || false;
        this.log = this.verbose ? console.log.bind(console) : () => {};
        
        // Core style storage
        // this.stylesheet = this.getBlankStylesheet();
        
        // Dynamic property collection - map of style name to array of properties
        this.dynamicProperties = new Map();

        this.dynamicProperties_unmerged = new Map();
        this.dynamicProperties_merged_stacks = new Map();
        this.dynamicProperties_rendered_stacks = new Map();

        this.newStyles = new Map();
        this.newPage = {};
        
        this.pageProperties = this.createBlankPageProperties();

        // Cache for merged dynamic-property stacks
        this.resolvedStylesCache = new Map();
    }

    /**
     * Get blank page configuration
     * @returns {Array} Default page configuration
     */
    createBlankPageProperties() {
        const validatedProps = [];
        const addProp = (namePath, value, dataType = 'number') => {
          const { property, errors } = DynamicProperty.createValidated({
            namePath,
            value,
            dataType,
            renderer: 'common' // Use common renderer for page properties
          });
          
          if (errors && errors.length) {
            console.error('Error creating page property:', namePath, errors);
          } else if (property) {
            validatedProps.push(property);
          }
        };
      
        // Scale position properties
        addProp('scale.position.x', 1);
        addProp('scale.position.y', 1);
        
        // Scale size properties
        addProp('scale.size.w', 1);
        addProp('scale.size.h', 1);
        
        // Margin properties
        addProp('margin.w', 1);
        addProp('margin.h', 1);
        
        return validatedProps;
      }


    //!important
    /**
     * Split a string by supported delimiters (, | &)
     * @param {string} input
     * @returns {string[]}
     */
    splitByDelimiters(input) {
        if (!input || typeof input !== 'string') return [];
        return input.split(/[,|&]+/).map(s => s.trim()).filter(s => s);
      }
  
      //!important
      /**
       * Normalize style names to a stack, ensuring 'base' first
       * @param {string|Array} styleNames
       * @returns {string[]}
       */
      normalizeStyleNames(styleNames) {
        let cleanStyles = [];
        const pattern = /^[a-zA-Z][a-zA-Z0-9 ]*$/;
  
        function processNameString(str) {
          if (!str || typeof str !== 'string') return;
          const trimmed = str.trim();
          if (!trimmed) return;
          for (const part of trimmed.split(/[,|&]+/).map(s => s.trim()).filter(s => s)) {
            if (pattern.test(part)) cleanStyles.push(part);
          }
        }
  
        if (!styleNames) {
          return [BASE_STYLE];
        } else if (typeof styleNames === 'string') {
          processNameString.call(this, styleNames);
        } else if (Array.isArray(styleNames)) {
          for (const item of styleNames) {
            processNameString.call(this, item);
          }
        }
  
        if (cleanStyles.length === 0) return [BASE_STYLE];
        if (cleanStyles[0] === BASE_STYLE) return cleanStyles;
        return [BASE_STYLE, ...cleanStyles];
      }




    //!important
    /**
     * Merge new properties into the existing page
     * @param {Object} newProperties - New properties to merge
     */
    addPageProperties(newProperties) {

        if (!newProperties || !Array.isArray(newProperties)) {
            this.log('addPageProperties is not an array');
            return;
        }
        
        const validatedProps = [];
        for (const newProp of newProperties) {
            const { property, errors } = DynamicProperty.createValidated(newProp);
            if (errors && errors.length) {
                this.log('Invalid dynamic property for page', errors);
            } else {
                validatedProps.push(property);
            }
        }

        // filter by compatible renderers
        const compatibility = this.getCompatibleRenderers();
        const filteredProps = validatedProps.filter(prop => compatibility.includes(prop.renderer));

        let merged = DynamicPropertyMerger.mergeProperties(filteredProps, this.pageProperties);   
        this.pageProperties = merged;

        this.log('addPageProperties added properties to page');
    }

    
    //!important
    /**
     * Get page properties
     * @returns {Array} Merged page properties
     */
    getPageProperties() {  
        return this.pageProperties;
    }

    //!important
    /**
     * Get page configuration from dynamic properties
     * @returns {Object} Page configuration object
     */
    getPage() {
        // Convert to hierarchical object
        return DynamicPropertyMerger.toHierarchy(
            this.getPageProperties()
        );
    }

    
    /**
     * Get the scale configuration
     * @returns {Object} Scale configuration
     */
    getPageScale() {
        // Use the new method internally
        const page = this.getPage();
        return page.scale; 
    }

    /**
     * Get the margin configuration
     * @returns {Object} Margin configuration 
     */
    getPageMargin() {
        // Use the new method internally
        const page = this.getPage();
        return page.margin; 
    }

    //!important
    /**
     * Merge new styles into the existing stylesheet
     * @param {Object} newStyles - New styles to merge
     */
    addStyleProperties(properties, styleName) {

        if (!properties || !Array.isArray(properties)) {
            this.log('addStyleProperties is not an array');
            return;
        }

        if (!styleName) {
            styleName = BASE_STYLE;
        }
        
        // get existing unmerged dynamic properties for this style
        const existingProperties = this.dynamicProperties_unmerged.get(styleName) || [];

        // validate raw properties
        const validatedProps = [];
        for (const rawProp of properties) {
            const { property, errors } = DynamicProperty.createValidated(rawProp);
            if (errors && errors.length) {
                this.log('Invalid dynamic property for style', styleName, errors);
            } else {
                validatedProps.push(property);
            }
        }

        // filter by compatible renderers
        const compatibility = this.getCompatibleRenderers();
        const filteredProps = validatedProps.filter(prop => compatibility.includes(prop.renderer));

        // append validated & filtered properties
        const appendedProperties = [...existingProperties, ...filteredProps];
        this.dynamicProperties_unmerged.set(styleName, appendedProperties);

        this.log('addStyleProperties added properties to style', styleName);
    }

    //!important
    /**
     * Prepares style properties by merging them in order
     * @param {Array} styleStack - Stack of style names to merge
     * @param {boolean} rebuildCache - Whether to rebuild the cache
     * @returns {Object} Merged properties for the style
     */
    prepareStyle(styleStack, rebuildCache = false) {  
        // Early return for empty stack
        if (!Array.isArray(styleStack) || styleStack.length === 0) {
            return [];
        }
        
        // Find the largest cached subset (if we're not rebuilding)
        let startIndex = 0;
        let merged = [];
        
        if (!rebuildCache) {
            // Work downward to find the largest cached subset (including full stack)
            for (let i = styleStack.length; i > 0; i--) {
                const subStackKey = JSON.stringify(styleStack.slice(0, i));
                if (this.dynamicProperties_merged_stacks.has(subStackKey)) {
                    merged = this.dynamicProperties_merged_stacks.get(subStackKey);
                    startIndex = i;
                    break;
                }
            }
        }
        
        // Build up from wherever we're starting (might be skipped entirely if full stack was found)
        for (let i = startIndex; i < styleStack.length; i++) {
            const name = styleStack[i];
            const props = this.dynamicProperties_unmerged.get(name) || [];
            merged = DynamicPropertyMerger.mergeProperties(props, merged);
            
            // Cache this intermediate result
            const key = JSON.stringify(styleStack.slice(0, i + 1));
            this.dynamicProperties_merged_stacks.set(key, [...merged]);
        }
        
        return merged;
    }

    //!important
    /**
     * Prepare a style for rendering, this may be a stacked style
     * @param {string} styleStack - Names of the styles to stack
     * @returns {Array} Merged properties for the style
     */
    prepareStyleWithNamesString(styleStackNamesString, rebuildCache = false) {
        // Normalize a comma/pipe/& separated style string into array and merge
        const stack = this.normalizeStyleNames(styleStackNamesString);
        return this.prepareStyle(stack, rebuildCache);
    }

    //!important
    /**
     * Prepare a style for rendering, this may be a stacked style
     * @param {Array} styleStack - Names of the styles to stack
     * @returns {Array} Array of dynamic properties
     */
    getStyleProperties(styleStack, rebuildCache = false) {
        return this.prepareStyle(styleStack, rebuildCache) 
    }

    //!important
    /**
     * Get dynamic properties for a style, this may be a stacked style
     * @param {string} styleStackNamesString - Comma/pipe/ampersand separated style names
     * @returns {Array} Array of dynamic properties
     */
    getStylePropertiesWithNamesString(styleStackNamesString, rebuildCache = false) {
        return this.prepareStyleWithNamesString(styleStackNamesString, rebuildCache);
    }


    //!important
    /**
     * Prepare a style for rendering, this may be a stacked style
     * @param {Array} styleStack - Names of the styles to stack
     * @returns {Object} a style object
     */
    getStyle(styleStack, rebuildCache = false) {
        // Merge the stack and convert to hierarchical object
        const mergedProps = this.prepareStyle(styleStack, rebuildCache);
        return DynamicPropertyMerger.toHierarchy(mergedProps);
    }

    //!important
    /**
     * Get a style, this may be a stacked style
     * @param {string} styleStackNamesString - Comma/pipe/ampersand separated style names
     * @returns {Object} a style object
     */
    getStyleWithNamesString(styleStackNamesString, rebuildCache = false) {
        // Normalize names string into style stack then get hierarchical style
        const stack = this.normalizeStyleNames(styleStackNamesString);
        return this.getStyle(stack, rebuildCache);
    }

    //!important
    /**
     * Apply custom property overrides to a prepared style stack
     * @param {Array} styleStack - Stack of style names to use as the base
     * @param {Array} properties - Custom properties to apply as overrides
     * @param {boolean} rebuildCache - Whether to rebuild the cache for the base styles
     * @returns {Array} - The merged properties (not cached)
     */
    getStylePropertiesAndModify(styleStack, properties, rebuildCache = false) {
        // Get the base style properties
        const baseProperties = this.prepareStyle(styleStack, rebuildCache);
        
        // If no custom properties, return the base properties
        if (!properties || !Array.isArray(properties) || properties.length === 0) {
            return baseProperties;
        }
        
        // Merge custom properties on top of the base properties
        return DynamicPropertyMerger.mergeProperties(properties, baseProperties);
    }

    //!important
    /**
     * Apply custom property overrides to a style stack specified by a string
     * @param {string} styleStackNamesString - Comma/pipe/ampersand separated style names
     * @param {Array} properties - Custom properties to apply as overrides
     * @param {boolean} rebuildCache - Whether to rebuild the cache for the base styles
     * @returns {Array} - The merged properties (not cached)
     */
    getStylePropertiesAndModifyWithNamesString(styleStackNamesString, properties, rebuildCache = false) {
        // Normalize names string into style stack
        const stack = this.normalizeStyleNames(styleStackNamesString);
        return this.getStylePropertiesAndModify(stack, properties, rebuildCache);
    }

    //!important
    /**
     * Apply custom property overrides to a prepared style stack
     * @param {Array} styleStack - Stack of style names to use as the base
     * @param {Array} properties - Custom properties to apply as overrides
     * @param {boolean} rebuildCache - Whether to rebuild the cache for the base styles
     * @returns {Object} - The customised style
     */
    getStyleAndModify(styleStack, properties, rebuildCache = false) {
        // Get the base style properties
        const customisedProperties = this.getStylePropertiesAndModify(styleStack, properties, rebuildCache);
        
        return DynamicPropertyMerger.toHierarchy(customisedProperties);
    }

    //!important
    /**
     * Apply custom property overrides to a style stack specified by a string
     * @param {string} styleStackNamesString - Comma/pipe/ampersand separated style names
     * @param {Array} properties - Custom properties to apply as overrides
     * @param {boolean} rebuildCache - Whether to rebuild the cache for the base styles
     * @returns {Object} - The customised style as a hierarchical object
     */
    getStyleWithNamesStringAndModify(styleStackNamesString, properties, rebuildCache = false) {
        // Normalize names string into style stack
        const stack = this.normalizeStyleNames(styleStackNamesString);
        return this.getStyleAndModify(stack, properties, rebuildCache);
    }

    /**
     * Checks if a property is a built-in property of a primitive or object
     * @param {any} value - The value to check
     * @param {string} propName - The property name to check
     * @returns {boolean} True if the property is built-in, false otherwise
     */
    isBuiltInProperty(value, propName) {
        if (value === null || value === undefined) return false;
        
        const valueType = typeof value;
        const constructorMap = {
          'string': String,
          'number': Number,
          'boolean': Boolean,
          'symbol': Symbol,
          'bigint': BigInt
        };
        
        // For primitives
        if (constructorMap[valueType]) {
          return propName in constructorMap[valueType].prototype;
        }
        
        // For objects (including arrays, functions, etc.)
        const proto = Object.getPrototypeOf(value);
        return propName in proto && !Object.getOwnPropertyDescriptor(value, propName);
    }

    /**
     * Helper to safely traverse an object path
     * @param {Object} obj - Object to traverse
     * @param {string[]} pathParts - Path parts to follow
     * @param {boolean} skipBuiltIns - Whether to skip built-in properties (optional)
     * @returns {*} Value at the path or undefined
     */
    getValueFromPath(obj, pathParts, skipBuiltIns = true) {
        if (!obj) return undefined;
        
        return pathParts.reduce((current, part) => {
          // Skip this step if we've already hit undefined
          if (current === undefined) return undefined;
          
          // Skip built-in properties if requested
          if (skipBuiltIns && this.isBuiltInProperty(current, part)) {
            return undefined;
          }
          
          // Use optional chaining
          return current?.[part];
        }, obj);
      }

    /**
     * Gets a value from a style hierarchy using a dot-notation path
     * @param {string} styleStackNamesString - Comma/pipe/ampersand separated style names
     * @param {string} attributePath - Dot-notation path to the attribute (e.g., 'node.object.tikz.shape')
     * @param {Array} properties - Custom properties to apply as overrides (optional)
     * @param {boolean} rebuildCache - Whether to rebuild the cache (optional)
     * @param {any} defaultValue - Default value if the attribute is not found (optional)
     * @returns {any} The value at the specified path or the default value
     */
    getStyleValueWithNamesStringAndModifyWithDefault(styleStackNamesString, attributePath, properties = [], rebuildCache = false, defaultValue = undefined) {
        // Get the complete style object with the specified style stack and optional modifications
        const style = this.getStyleWithNamesStringAndModify(styleStackNamesString, properties, rebuildCache);
        
        // Split the attribute path into parts
        const pathParts = attributePath.split('.');
        
        // Navigate through the path
        let current = style;
        for (const part of pathParts) {
            if (!current || typeof current !== 'object') {
                return defaultValue;
            }
            current = current[part];
        }
        
        // Return the found value or the default
        return current !== undefined ? current : defaultValue;
    }

    /**
     * Load styles from style records
     * @param {Array} styleRecords - Array of style records from ReaderManager
     */
    loadPageAndStyles(styleRecords) {
        for (const rec of styleRecords) {
            if (rec.style) {
                for (const [name, data] of Object.entries(rec.style)) {
                    const rawProps = data._dynamicProperties || data.dynamicProperties || [];
                    this.addStyleProperties(rawProps, name);
                }
            }
        
            if (rec.page) {
                if (Array.isArray(rec.page._dynamicProperties)) {
                    this.addPageProperties(rec.page._dynamicProperties);
                }
            }
        }
    }


    /**
     * Store a dynamic property in the property collection for a style
     * @param {string} styleName - Style name
     * @param {Object} property - Dynamic property object
     * @returns {Array} The updated properties array for this style
     */
    addDynamicProperty(styleName, property) {
        // Get or create the array for this style
        const styleProperties = this.dynamicProperties.get(styleName) || [];
        
        // Add the property to the array
        styleProperties.push(property);
        
        // Update the map
        this.dynamicProperties.set(styleName, styleProperties);
        
        return styleProperties;
    }

    /**
     * Get all dynamic properties for a style
     * @param {string} styleName - Style name
     * @returns {Array|undefined} The properties array for this style or undefined
     */
    getDynamicPropertiesForStyle(styleName) {
        // return merged dynamic properties for style stack
        return this.resolveStyles(styleName);
    }

    /**
     * Get all dynamic properties across all styles
     * @returns {Map} The complete dynamic properties map
     */
    getAllDynamicProperties() {
        return this.dynamicProperties;
    }

    /**
     * Merge dynamic properties into a specific style
     * @param {string} styleName - Name of the style to merge properties into
     * @param {Array} properties - Dynamic properties to merge
     */
    mergeDynamicProperties(styleName, properties) {
        if (!properties || !Array.isArray(properties) || properties.length === 0) return;
        
        this.log(`Merging ${properties.length} dynamic properties for style "${styleName}"`);
        

        // Get existing properties for this style
        const styleProperties = this.dynamicProperties.get(styleName) || [];
        const appendedProperties = [...styleProperties, ...properties];

        // Update the map with merged results
        this.dynamicProperties.set(styleName, appendedProperties);
        
    }

    /**
     * Get the list of compatible renderers for the LaTeX style handler
     * @returns {Array} Array of compatible renderer names
     */
    getCompatibleRenderers() {
        // LaTeX-specific implementation
        return ['common'];
    }

    /**
     * Process YAML documents from the style YAML file
     * @param {Array} documents - Array of YAML documents
     * @returns {Array} - Collection of style records
     */
    processPageAndStyleDocuments(documents) {
        if (!Array.isArray(documents)) {
            this.log("processPageAndStyleDocuments expected an array, received:", documents);
            return [];
        }
        let result = [];

        for (const doc of documents) {
            if (!doc) {
                this.log("Skipping null or undefined document in processPageAndStyleDocuments");
                continue;
            }

            this.log('Processing document:', JSON.stringify(doc));

            if (doc.type === 'page') {
                this.log('Processing page document');
                result.push({ page: doc });
            } else if (doc.type === 'style') {
                this.log('Processing style document:', doc.name || 'base');
                const styleName = doc.name || 'base';
                const styleData = { ...doc };
                delete styleData.type;
                delete styleData.name;

                result.push({ style: { [styleName]: styleData } });
            } else {
                this.log(`Unknown document type: ${doc.type}`);
            }
        }

        this.loadPageAndStyles(result);
        
        return result;
    }

    // -------- StyleResolver logic --------


    /**
     * Resolve dynamic properties for one or multiple style names
     * @param {string|Array} styleNames
     * @returns {Object[]} Merged dynamic-property list
     */
    resolveStyles(styleNames) {
      const names = this.normalizeStyleNames(styleNames);
      const key = JSON.stringify(names);
      if (this.resolvedStylesCache.has(key)) {
        return this.resolvedStylesCache.get(key);
      }
      let merged = [];
      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const props = this.dynamicProperties.get(name) || [];
        merged = DynamicPropertyMerger.mergeProperties(props, merged);
        this.resolvedStylesCache.set(JSON.stringify(names.slice(0, i+1)), [...merged]);
      }
      this.resolvedStylesCache.set(key, merged);
      return merged;
    }
    // ------ end StyleResolver inline ------

    /**
     * Parse a dot-notation path string into path segments and segment types
     * @param {string|Array} path - The path as a string (e.g., 'node.0.name') or array
     * @returns {Object} - Object containing segments array and types array
     */
    static parsePath(path) {
        // Handle when path is already an array
        if (Array.isArray(path)) {
            const segments = [...path];
            const types = segments.map(segment => {
                return /^\d+$/.test(segment) ? 'index' : 'name';
            });
            return { segments, types };
        }
        
        // Handle string path
        const segments = path.split('.');
        const types = segments.map(segment => {
            return /^\d+$/.test(segment) ? 'index' : 'name';
        });
        
        return { segments, types };
    }

    /**
     * Get a specific branch of a style hierarchy with custom property modifications
     * @param {string|Array} styleStack - Style name(s) as a string or array
     * @param {Array|string} branchPath - Path to the branch (e.g., 'node.object' or ['node', 'object'])
     * @param {Array} properties - Custom properties to apply as overrides (optional)
     * @param {boolean} rebuildCache - Whether to rebuild the cache (optional)
     * @returns {Object} - The specified branch of the style hierarchy with modifications
     */
    getStyleBranchAndModify(styleStack, branchPath, properties=[], rebuildCache=false) {
        // Get the full style with customizations
        let style;
        
        if (Array.isArray(styleStack)) {
            // Direct style stack array
            style = this.getStyleAndModify(styleStack, properties, rebuildCache);
        } else {
            // Names string
            style = this.getStyleWithNamesStringAndModify(styleStack, properties, rebuildCache);
        }
        
        // Parse the branch path
        const { segments, types } = StyleHandler.parsePath(branchPath);
        
        // Navigate to the requested branch
        let current = style;
        for (let i = 0; i < segments.length; i++) {
            if (!current || typeof current !== 'object') {
                return {}; // Return empty object if path doesn't exist
            }
            
            const segment = segments[i];
            const type = types[i];
            
            if (type === 'index') {
                // Use numeric index for arrays
                current = Array.isArray(current) ? current[parseInt(segment, 10)] : undefined;
            } else {
                // Use property name for objects
                current = current[segment];
            }
        }
        
        return current || {};
    }
}

module.exports = StyleHandler;
