// /**
//  * Handles resolution and caching of merged styles
//  */

// const DynamicPropertyMerger = require('../io/readers/dynamic-property-merger');

// /**
//  * Base style name constant
//  * @type {string}
//  */
// const BASE_STYLE = 'base';

// /**
//  * StyleResolver class for merging and caching style properties
//  */
// class StyleResolver {
//   /**
//    * Create a new StyleResolver
//    * @param {StyleHandler} styleHandler - The style handler that provides dynamic properties
//    */
//   constructor(styleHandler) {
//     this.styleHandler = styleHandler;
//     this.mergedStyles = new Map();
//   }

//   /**
//    * Split a string by supported delimiters
//    * @param {string} input - Input string to split
//    * @returns {Array} Array of trimmed, non-empty strings
//    */
//   splitByDelimiters(input) {
//     if (!input || typeof input !== 'string') return [];
//     return input
//       .split(/[,|&]+/) // Split by comma, pipe, or ampersand
//       .map(s => s.trim())
//       .filter(s => s);
//   }

//   /**
//    * Normalize style names to ensure base style is included
//    * @param {string|Array} styleNames - Style name or array of style names
//    * @returns {Array} Normalized array of style names
//    */
//   normalizeStyleNames(styleNames) {

//     let cleanStyles = [];
    
//     function processNameString(nameString) {
//       if (!nameString || typeof nameString !== 'string' ) {
//         return;
//       }

//       let trimmed = nameString.trim();
//       if (trimmed.length === 0){
//         return;
//       }

//       const parsedStyles = this.splitByDelimiters(trimmed);

//       // Style name validation regex:
//       // - Must start with a letter (no leading numbers)
//       // - Can contain letters, numbers, and spaces
//       // Although regex would allow trailing spaces, we know
//       // that splitByDelimiters() will trim them.

//       const styleNamePattern = /^[a-zA-Z][a-zA-Z0-9 ]*$/;
      
//       for (const style of parsedStyles) {
//         if (style.length > 0 && styleNamePattern.test(style)){
//           cleanStyles.push(style);
//         }
//       }
//     }

//     // Handle null/undefined
//     if (!styleNames) {
//       return [BASE_STYLE];
//     }
    
//     if (typeof styleNames === 'string') {
//       processNameString.call(this, styleNames);
//     } 
//     else if (Array.isArray(styleNames)) {
//       for (const item of styleNames) {
//         if (typeof item === 'string') {
//           processNameString.call(this, item);
//         }
//       }
//     }
    
//     if (cleanStyles.length === 0) {
//       return [BASE_STYLE];
//     }

//     if (cleanStyles[0] === BASE_STYLE) {
//       return cleanStyles;
//     }

//     return [BASE_STYLE, ...cleanStyles];
//   }
  
//   /**
//    * Resolve styles by merging dynamic properties
//    * @param {string|Array} styleNames - Style name or array of style names
//    * @returns {Array} Merged dynamic properties
//    */
//   resolveStyles(styleNames) {
//     // Normalize style names
//     const normalizedStyles = this.normalizeStyleNames(styleNames);
    
//     // Check cache for the full style combination
//     const cacheKey = JSON.stringify(normalizedStyles);
//     if (this.mergedStyles.has(cacheKey)) {
//       return this.mergedStyles.get(cacheKey);
//     }
    
//     // Start with empty properties
//     let mergedProps = [];
    
//     // Add each style's properties in sequence
//     for (let i = 0; i < normalizedStyles.length; i++) {
//       const styleName = normalizedStyles[i];
//       const styleProps = this.styleHandler.getDynamicPropertiesForStyle(styleName) || [];
      
//       // Merge onto accumulated result
//       mergedProps = DynamicPropertyMerger.mergeProperties(styleProps, mergedProps);
      
//       // Cache intermediate results
//       const intermediateKey = JSON.stringify(normalizedStyles.slice(0, i+1));
//       this.mergedStyles.set(intermediateKey, [...mergedProps]);
//     }
    
//     return mergedProps;
//   }
// }

// module.exports = StyleResolver;
