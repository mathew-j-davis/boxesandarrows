const ValueParser = require('./value-parser');
const DynamicProperty = require('../models/dynamic-property');

class DynamicPropertyParser {
    static VALID_TYPES = ['string', 'float', 'number', 'integer', 'boolean', 'flag'];
    
    /**
     * Dynamic property name pattern for validating and parsing
     * 
     * Pattern: _[renderer]:[type]:[namePath](:tags)?
     * 
     * Components:
     * - renderer: Optional. Must start with a letter followed by letters or numbers.
     * - type: Required. Must be only letters.
     * - namePath: Required. Dot-separated segments where each segment is either:
     *   - A name (starts with letter or underscore, can contain letters, digits, spaces, underscores)
     *   - A pure numeric index
     * - tags: Optional. Any additional information after a final colon.
     * 
     * Name segment rules:
     * - Cannot start with a digit (except for pure numeric indices)
     * - Can contain spaces, but not leading or trailing spaces
     * - Can contain and start with underscores
     * - Cannot be empty
     */
    static PROPERTY_PATTERN = /^_([a-zA-Z][a-zA-Z0-9]*)?:([a-zA-Z]+):(([_a-zA-Z][a-zA-Z\d\s_\-]*[a-zA-Z\d_]|[_a-zA-Z]|\d+)(?:\.([_a-zA-Z][a-zA-Z\d\s_]*[a-zA-Z\d_]|[_a-zA-Z]|\d+))*)(?::(.*))?$/;

    static isDynamicProperty(propertyString) {
        // Check if the name matches the dynamic property pattern
        return this.PROPERTY_PATTERN.test(propertyString);
    }

    static parsePropertyDescription(propertyString) {
        if (!this.isDynamicProperty(propertyString)) {
            throw new Error(`Invalid dynamic property name: ${propertyString}`);
        }

        // Extract the components using the pattern
        const match = propertyString.match(this.PROPERTY_PATTERN);
        
        if (!match) {
            throw new Error(`Failed to parse dynamic property name: ${propertyString}`);
        }

        /**
         * Match array indices:
         * match[1]: renderer (optional)
         * match[2]: type
         * match[3]: namePath
         * match[4]: first path segment (part of namePath capture group)
         * match[5]: last segment in path (only for multi-segment paths)
         * match[6]: tagsString (optional)
         */

        // Extract the components from the match groups
        const renderer = match[1] || 'common';
        const type = match[2];
        const namePath = match[3];
        const tagsString = match[6] || '';

        // Validate the type
        if (!this.VALID_TYPES.includes(type)) {
            throw new Error(`Invalid type in dynamic property name: ${type}`);
        }
        
        // Process tags
        const tags = tagsString ? tagsString.split(' ').filter(tag => tag) : [];
        const clear = tags.includes('!clear');

        // Create the property object without groupPath
        return new DynamicProperty({
            renderer,
            //groupPath,
            namePath: namePath,
            dataType: type === 'flag' ? 'string' : type,
            isFlag: type === 'flag',
            value: type === 'flag' ? true : null,
            clear
        });
    }

    static parseValue(property, value) {
        return ValueParser.parse(value, property.dataType);
    }

    static parse(propertyString, value) {
        const property = this.parsePropertyDescription(propertyString);
        property.value = ValueParser.parse(value, property.dataType);
        return property;
    }
}

module.exports = DynamicPropertyParser;