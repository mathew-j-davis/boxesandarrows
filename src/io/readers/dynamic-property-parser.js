const ValueParser = require('./value-parser');
const DynamicProperty = require('../models/dynamic-property');

class DynamicPropertyParser {
    static VALID_TYPES = ['string', 'float', 'number', 'integer', 'boolean', 'flag'];

    static isDynamicProperty(propertyString) {
        // Check if the name matches the dynamic property pattern
        // Pattern: _[renderer]:[group]:[type]:[name](:[tags])?
        // Renderer, group are optional. Tags are optional.
        /**
         * Regex breakdown:
         * ^                      - Start of the string
         * _                      - Literal underscore prefix
         * ([a-zA-Z][a-zA-Z0-9]*)? - Optional Group 1: Renderer (starts with letter, then letters/numbers)
         * :                      - Literal colon delimiter
         * (                      - Group 2: Optional Group (for Group Path)
         *   [a-zA-Z]             - Starts with a letter
         *   (?:[_.]?            - Non-capturing group for optional delimiter (_ or .)
         *     [a-zA-Z0-9]+       - Followed by one or more letters/numbers
         *   )*                 - The delimiter + letters/numbers can repeat (for dotted/underscored segments)
         * )?                     - Group 2 is optional (no group path provided)
         * :                      - Literal colon delimiter
         * ([a-zA-Z]+)            - Group 3: Type (one or more letters)
         * :                      - Literal colon delimiter
         * (                      - Group 4: Property Name
         *   [a-zA-Z]             - Starts with a letter
         *   (?:[_.]?            - Non-capturing group for optional delimiter (_ or .)
         *     [a-zA-Z0-9]+       - Followed by one or more letters/numbers
         *   )*                 - The delimiter + letters/numbers can repeat (for dotted/underscored segments)
         * )                      - End of Group 4
         * (?:                    - Optional Non-capturing group for tags
         *   :                    - Literal colon delimiter before tags
         *   (.*)                 - Group 5: Tags (capture everything after the colon)
         * )?                     - The tags group is optional
         * $                      - End of the string
         */
        const pattern = /^_([a-zA-Z][a-zA-Z0-9]*)?:([a-zA-Z](?:[_.]?[a-zA-Z0-9]+)*)?:([a-zA-Z]+):([a-zA-Z](?:[_.]?[a-zA-Z0-9]+)*)(?::(.*))?$/;
        return pattern.test(propertyString);
    }

    static parsePropertyDescription(propertyString) {
        if (!this.isDynamicProperty(propertyString)) {
            throw new Error(`Invalid dynamic property name: ${propertyString}`);
        }

        // Extract the components using the updated pattern
        // Use the same regex as isDynamicProperty for consistency
        /**
         * Regex breakdown (same as in isDynamicProperty):
         * ^                      - Start of the string
         * _                      - Literal underscore prefix
         * ([a-zA-Z][a-zA-Z0-9]*)? - Optional Group 1: Renderer
         * :                      - Delimiter
         * ([a-zA-Z](?:[_.]?[a-zA-Z0-9]+)*)? - Optional Group 2: Group Path
         * :                      - Delimiter
         * ([a-zA-Z]+)            - Group 3: Type
         * :                      - Delimiter
         * ([a-zA-Z](?:[_.]?[a-zA-Z0-9]+)*) - Group 4: Property Name
         * (?:                    - Optional Non-capturing group for tags
         *   :                    - Delimiter before tags
         *   (.*)                 - Group 5: Tags string
         * )?                     - The tags group is optional
         * $                      - End of the string
         *
         * Match array indices (approximate based on optional groups):
         * match[1]: renderer (optional)
         * match[2]: group (optional)
         * match[3]: type
         * match[4]: name
         * match[5]: tagsString (optional)
         */
        const pattern = /^_([a-zA-Z][a-zA-Z0-9]*)?:([a-zA-Z](?:[_.]?[a-zA-Z0-9]+)*)?:([a-zA-Z]+):([a-zA-Z](?:[_.]?[a-zA-Z0-9]+)*)(?::(.*))?$/;
        const match = propertyString.match(pattern);
        
        if (!match) {
            throw new Error(`Failed to parse dynamic property name: ${propertyString}`);
        }

        // Extract the components from the match groups
        const renderer = match[1] || 'common';
        const group = match[2] || '';
        const type = match[3]; // Type is mandatory
        const name = match[4]; // Name is mandatory
        const tagsString = match[5] || ''; // Optional tags part

        // Validate the type
        if (!this.VALID_TYPES.includes(type)) {
            throw new Error(`Invalid type in dynamic property name: ${type}`);
        }
        
        // Process tags
        const tags = tagsString ? tagsString.split(' ').filter(tag => tag) : [];
        const clearChildren = tags.includes('!clear');

        // Create the property object with potentially updated clearChildren
        return new DynamicProperty({
            renderer,
            group,
            namePath: name,
            dataType: type === 'flag' ? 'string' : type,
            isFlag: type === 'flag',
            clearChildren: clearChildren, // Set based on !clear tag
            tags: tags // Store all tags if needed later
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