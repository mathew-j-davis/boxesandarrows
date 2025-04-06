const ValueParser = require('./value-parser');

class DynamicPropertyParser {
    static VALID_TYPES = ['string', 'float', 'number', 'integer', 'boolean', 'flag'];

    static isDynamicProperty(propertyString) {
        // Check if the name matches the dynamic property pattern
        // Pattern: _[renderer] [group] [type] [name]
        const pattern = /^_([a-zA-Z][a-zA-Z0-9]*){0,1} (([a-zA-Z]([_]{0,1}[a-zA-Z0-9])+)([\.]{0,1}[a-zA-Z]([_]{0,1}[a-zA-Z0-9])+)*){0,1} ([a-zA-Z]+) (([a-zA-Z]([_]{0,1}[a-zA-Z0-9])+)([\.]{0,1}[a-zA-Z]([_]{0,1}[a-zA-Z0-9])+)*)$/;
        return pattern.test(propertyString);
    }

    static parsePropertyDescription(propertyString) {
        if (!this.isDynamicProperty(propertyString)) {
            throw new Error(`Invalid dynamic property name: ${propertyString}`);
        }

        // Extract the components using the same pattern
        const pattern = /^_([a-zA-Z][a-zA-Z0-9]*){0,1} (([a-zA-Z]([_]{0,1}[a-zA-Z0-9])+)([\.]{0,1}[a-zA-Z]([_]{0,1}[a-zA-Z0-9])+)*){0,1} ([a-zA-Z]+) (([a-zA-Z]([_]{0,1}[a-zA-Z0-9])+)([\.]{0,1}[a-zA-Z]([_]{0,1}[a-zA-Z0-9])+)*)$/;
        const match = propertyString.match(pattern);
        
        if (!match) {
            throw new Error(`Failed to parse dynamic property name: ${propertyString}`);
        }

        // Extract the components from the match groups
        // Match groups: 1=renderer, 2=group, 7=type, 8=name
        const renderer = match[1] || 'common';
        const group = match[2] || '';
        const type = match[7];
        const name = match[8];

        // Validate the type
        if (!['string', 'float', 'boolean', 'integer', 'flag'].includes(type)) {
            throw new Error(`Invalid type in dynamic property name: ${type}`);
        }

        // Create the property object
        const property = {
            renderer,
            group,
            groupPathArray: group ? group.split('.') : [],
            dataType: type === 'flag' ? 'string' : type,
            isFlag: type === 'flag',
            name,
            namePathArray: name.split('.')
        };

        return property;
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