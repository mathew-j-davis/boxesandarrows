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
        this.stylesheet = this.getBlankStylesheet();
        
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

        let merged = DynamicPropertyMerger.mergeProperties(this.pageProperties, filteredProps);   
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
     * Get page properties
     * @returns {Object} page object
     */
    getPage_NEW() {
        // Convert to hierarchical object
        return DynamicPropertyMerger.toHierarchy(this.pageProperties);
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
     * Prepare a style for rendering, this may be a stacked style
     * @param {Array} styleStack - Names of the styles to stack
     * @returns {Object} Merged properties for the style
     */
    prepareStyle(styleStack, rebuildCache = false) {  
        let merged = [];

        // styleStack must be an array of style names
        if (!Array.isArray(styleStack)) {
            return merged;
        }
        // Incrementally merge per prefix, using cache if available
        
        for (let i = 0; i < styleStack.length; i++) {
            const prefix = styleStack.slice(0, i + 1);
            const key = JSON.stringify(prefix);
            if (!rebuildCache && this.dynamicProperties_merged_stacks.has(key)) {
                merged = this.dynamicProperties_merged_stacks.get(key);
            } else {
                const name = styleStack[i];
                const props = this.dynamicProperties_unmerged.get(name) || [];
                merged = DynamicPropertyMerger.mergeProperties(props, merged);
                this.dynamicProperties_merged_stacks.set(key, merged);
            }
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






    /**
     * Merge new styles into the existing stylesheet
     * @param {Object} newStyles - New styles to merge
     */
    mergeStylesheet(newStyles) {
        if (!newStyles) {
            this.log('mergeStylesheet received null or undefined');
            return;
        }

        this.log('mergeStylesheet received:', JSON.stringify(newStyles));
        
        // Process dynamic properties if present
        if (newStyles._dynamicProperties && Array.isArray(newStyles._dynamicProperties)) {
            this.mergeDynamicProperties(newStyles.name || 'base', newStyles._dynamicProperties);


            // transition method
            // append all dynamic properties to the unmerged map
            const styleName = newStyles.name || 'base';
            const styleProperties = this.dynamicProperties_unmerged.get(styleName) || [];
            const appendedProperties = [...styleProperties, ...newStyles._dynamicProperties];
            this.dynamicProperties_unmerged.set(styleName, appendedProperties);
        }
        
        // Initialize stylesheet if needed
        if (!this.stylesheet) {
            this.stylesheet = this.getBlankStylesheet();
        }
        
        // Process styles if present
        if (newStyles.style) {
            this.log('Processing style section');
            
            if (!this.stylesheet.style) {
                this.stylesheet.style = this.getBlankStyles();
            }
            
            // Merge styles at the style name level
            for (const [styleName, styleData] of Object.entries(newStyles.style)) {
                if (!this.stylesheet.style[styleName]) {
                    this.stylesheet.style[styleName] = {};
                }
                
                // Deep merge the style data
                this.stylesheet.style[styleName] = ObjectUtils.deepMerge(
                    this.stylesheet.style[styleName] || {},
                    styleData
                );
            }
        }
        
        // Handle page configuration if present
        if (newStyles.page) {
            this.log('Processing page config in mergeStylesheet:', JSON.stringify(newStyles.page));
            
            if (!this.stylesheet.page) {
                this.stylesheet.page = this.getBlankPage();
            }
            
            // Merge page configuration
            this.stylesheet.page = ObjectUtils.deepMerge(
                this.stylesheet.page,
                newStyles.page
            );
        }
    }

    
    /**
     * Get a blank stylesheet with default values
     * @returns {Object} Blank stylesheet
     */
    getBlankStylesheet() {
        const blank = { 
            page: {},
            style: {}
        };

        blank.page = this.getBlankPage();
        blank.style = this.getBlankStyles();

        return blank;
    }

    /**
     * Get blank page configuration
     * @returns {Object} Default page configuration
     */
    getBlankPage() {
        return {
            scale: {
                position: { x: 1, y: 1 },
                size: { w: 1, h: 1 }
            },
            margin: {
                h: 1,
                w: 1
            }
        };
    }

    /**
     * Get blank styles structure
     * @returns {Object} Default styles structure
     */
    getBlankStyles() {
        return {
            node: {},
            edge: {}
        };
    }

    /**
     * Get just the page configuration
     * @returns {Object} Page configuration
     */
    getPage() {
        return this.stylesheet.page;
    }

    /**
     * Get the scale configuration
     * @returns {Object} Scale configuration
     */
    getPageScale() {
        return this.stylesheet.page.scale;
    }

    /**
     * Get the margin configuration
     * @returns {Object} Margin configuration 
     */
    getPageMargin() {
        return this.stylesheet.page.margin;
    }

    /**
     * Helper to safely traverse an object path
     * @param {Object} obj - Object to traverse
     * @param {string[]} pathParts - Path parts to follow
     * @returns {*} Value at the path or undefined
     */
    getValueFromPath(obj, pathParts) {
        if (!obj) return undefined;
        
        return pathParts.reduce((current, part) => {
            return current?.[part];
        }, obj);
    }

    /**
     * Get a style attribute by cascading from the specified style to base
     * @param {string} category - 'node', 'edge', etc.
     * @param {string} styleName - name of the style, or null/undefined for default
     * @param {string} attributePath - dot-separated path to the attribute (e.g., 'node.anchor')
     * @param {any} [defaultValue=null] - value to return if attribute not found
     * @returns {*} The attribute value
     */
    getStyleAttribute(category, styleName, attributePath, defaultValue = null) {
        // Split the attribute path into parts
        const pathParts = attributePath.split('.');
        
        // Try the specified style first (or default if none specified)
        const styleToUse = styleName || 'default';
        let value = this.getValueFromPath(this.stylesheet.style?.[styleToUse]?.[category], pathParts);
        
        // If not found, cascade to base
        if (value === undefined) {
            value = this.getValueFromPath(this.stylesheet.style?.base?.[category], pathParts);
        }
        
        return value ?? defaultValue;
    }

    /**
     * Get complete style object for a category/style, with base cascade
     * @param {string} styleName - name of the style, or null/undefined for default
     * @param {string} styleType - 'node', 'edge', etc.
     * @param {string} generalCategory - 'object', 'label', 'head'
     * @param {string} specificCategory - more refined category like 'label_start', 'head_end'
     * @returns {Object} Complete cascaded style
     */
    getCompleteStyle(styleName, styleType, generalCategory, specificCategory = null) {
        const baseStyle = this.stylesheet?.style?.base?.[styleType]?.[generalCategory] || {};
        const baseStyleSpecific = this.stylesheet?.style?.base?.[styleType]?.[specificCategory] || {};

        const selectedStyle = this.stylesheet?.style?.[styleName || 'default']?.[styleType]?.[generalCategory] || {};
        const selectedStyleSpecific = this.stylesheet?.style?.[styleName || 'default']?.[styleType]?.[specificCategory] || {};

        return {
            ...baseStyle,
            ...baseStyleSpecific,
            ...selectedStyle,
            ...selectedStyleSpecific,
        };
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

        // DO NOT DELETE WE WILL USE THIS LATER
        // Get compatible renderers from the current implementation
        //const compatibleRenderers = this.getCompatibleRenderers(); 
        // // Filter and merge properties in a single step, passing existing properties
        // const mergedProperties = DynamicPropertyMerger.mergePropertiesWithRendererFilter(
        //     properties,
        //     compatibleRenderers,
        //     styleProperties
        // );
        
    }

    prepareStyles() {
        //DO NOT DELETE WE WILL USE THIS LATER
        //Get compatible renderers from the current implementation

        const compatibleRenderers = this.getCompatibleRenderers(); 

        // Filter and merge properties in a single step, passing existing properties
        const mergedProperties = DynamicPropertyMerger.mergePropertiesWithRendererFilter(
            properties,
            compatibleRenderers,
            styleProperties
        );
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
    processYamlDocuments(documents) {
        if (!Array.isArray(documents)) {
            this.log("processYamlDocuments expected an array, received:", documents);
            return [];
        }
        let result = [];

        for (const doc of documents) {
            if (!doc) {
                this.log("Skipping null or undefined document in processYamlDocuments");
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

}

module.exports = StyleHandler;
