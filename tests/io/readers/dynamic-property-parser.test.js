const DynamicPropertyParser = require('../../../src/io/readers/dynamic-property-parser');

describe('DynamicPropertyParser', () => {
    describe('isDynamicProperty', () => {
        test('should identify valid dynamic property patterns', () => {
            // Full pattern with renderer and groupPath
            expect(DynamicPropertyParser.isDynamicProperty('_common:string:font_font_font.font_font')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_:string:font_font_font.font_font')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_common:string:font_font_font.font_font')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_:string:font_font_font.font_font')).toBe(true);
            
            // Simple patterns with different renderers
            expect(DynamicPropertyParser.isDynamicProperty('_common:string:font_font_font.font_font')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_latex:string:draw')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_renderer123:string:property')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_latex2:string:property')).toBe(true);
            
            // Without renderer (using default)
            expect(DynamicPropertyParser.isDynamicProperty('_:string:font_font_font.font_font')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_:boolean:visible')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_:string:title')).toBe(true);
            
            // Different data types
            expect(DynamicPropertyParser.isDynamicProperty('_:float:margin')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_:boolean:visible')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_:integer:count')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_:flag:bold')).toBe(true);
            
            // Complex property names with dots and underscores
            expect(DynamicPropertyParser.isDynamicProperty('_:string:property.name_with_underscores')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_:string:property.name.with.dots.and_underscores')).toBe(true);
            
            // With array indices in property names
            expect(DynamicPropertyParser.isDynamicProperty('_:string:items.0')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_:string:items.0.name')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_:string:items.0.1.2')).toBe(true);
        });

        test('should reject invalid dynamic property patterns', () => {
            // Missing leading underscore
            expect(DynamicPropertyParser.isDynamicProperty('common:string:font_font_font.font_font')).toBe(false);
            
            // Invalid type (contains numbers)
            expect(DynamicPropertyParser.isDynamicProperty('_common:string123:font_font_font.font_font')).toBe(false);
            
            // Missing required colons
            expect(DynamicPropertyParser.isDynamicProperty('_commonstringfont_font_font.font_font')).toBe(false);
            
            // Invalid property name (starts with number)
            expect(DynamicPropertyParser.isDynamicProperty('_common:string:123font_font_font.font_font')).toBe(false);
            
            // Invalid renderer name (starts with number)
            expect(DynamicPropertyParser.isDynamicProperty('_123common:string:font_font_font.font_font')).toBe(false);
        });
    });

    describe('parse', () => {
        test('should parse valid dynamic property names', () => {
            // Simple property with renderer
            const prop1 = DynamicPropertyParser.parsePropertyDescription('_common:string:font_font_font.font_font');
            expect(prop1.renderer).toEqual('common');
            expect(prop1.dataType).toEqual('string');
            expect(prop1.namePath).toEqual('font_font_font.font_font');
            expect(prop1.namePathArray).toEqual(['font_font_font', 'font_font']);
            expect(prop1.namePathTypes).toEqual(['name', 'name']);

            // With renderer and simple property
            const prop2 = DynamicPropertyParser.parsePropertyDescription('_latex:string:draw');
            expect(prop2.renderer).toEqual('latex');
            expect(prop2.dataType).toEqual('string');
            expect(prop2.namePath).toEqual('draw');
            expect(prop2.namePathArray).toEqual(['draw']);
            expect(prop2.namePathTypes).toEqual(['name']);
            
            // No renderer (using default)
            const prop3 = DynamicPropertyParser.parsePropertyDescription('_:boolean:visible');
            expect(prop3.renderer).toEqual('common');
            expect(prop3.dataType).toEqual('boolean');
            expect(prop3.namePath).toEqual('visible');
            expect(prop3.namePathArray).toEqual(['visible']);
            expect(prop3.namePathTypes).toEqual(['name']);
            
            // With complex renderer name
            const prop4 = DynamicPropertyParser.parsePropertyDescription('_renderer123:string:property');
            expect(prop4.renderer).toEqual('renderer123');
            expect(prop4.dataType).toEqual('string');
            expect(prop4.namePath).toEqual('property');
            expect(prop4.namePathArray).toEqual(['property']);
            expect(prop4.namePathTypes).toEqual(['name']);
            
            // With complex property name
            const prop6 = DynamicPropertyParser.parsePropertyDescription('_renderer:string:property.name_with_underscores');
            expect(prop6.renderer).toEqual('renderer');
            expect(prop6.dataType).toEqual('string');
            expect(prop6.namePath).toEqual('property.name_with_underscores');
            expect(prop6.namePathArray).toEqual(['property', 'name_with_underscores']);
            expect(prop6.namePathTypes).toEqual(['name', 'name']);
        });

        test('should parse array indices in property names', () => {
            // Simple array index
            const prop1 = DynamicPropertyParser.parsePropertyDescription('_common:string:items.0');
            expect(prop1.renderer).toEqual('common');
            expect(prop1.dataType).toEqual('string');
            expect(prop1.namePath).toEqual('items.0');
            expect(prop1.namePathArray).toEqual(['items', '0']);
            expect(prop1.namePathTypes).toEqual(['name', 'index']);
            expect(prop1.isNamePathIndex(0)).toBe(false);
            expect(prop1.isNamePathIndex(1)).toBe(true);
            expect(prop1.getNamePathArrayWithIndices()).toEqual(['items', 0]);
            
            // Nested array indices
            const prop2 = DynamicPropertyParser.parsePropertyDescription('_common:string:items.0.name');
            expect(prop2.renderer).toEqual('common');
            expect(prop2.dataType).toEqual('string');
            expect(prop2.namePath).toEqual('items.0.name');
            expect(prop2.namePathArray).toEqual(['items', '0', 'name']);
            expect(prop2.namePathTypes).toEqual(['name', 'index', 'name']);
            expect(prop2.isNamePathIndex(0)).toBe(false);
            expect(prop2.isNamePathIndex(1)).toBe(true);
            expect(prop2.isNamePathIndex(2)).toBe(false);
            expect(prop2.getNamePathArrayWithIndices()).toEqual(['items', 0, 'name']);
            
            // Multiple array indices
            const prop3 = DynamicPropertyParser.parsePropertyDescription('_common:string:items.0.1.2');
            expect(prop3.renderer).toEqual('common');
            expect(prop3.dataType).toEqual('string');
            expect(prop3.namePath).toEqual('items.0.1.2');
            expect(prop3.namePathArray).toEqual(['items', '0', '1', '2']);
            expect(prop3.namePathTypes).toEqual(['name', 'index', 'index', 'index']);
            expect(prop3.isNamePathIndex(0)).toBe(false);
            expect(prop3.isNamePathIndex(1)).toBe(true);
            expect(prop3.isNamePathIndex(2)).toBe(true);
            expect(prop3.isNamePathIndex(3)).toBe(true);
            expect(prop3.getNamePathArrayWithIndices()).toEqual(['items', 0, 1, 2]);
        });

        // Removed test for "array indices in groupPath" since we don't have groupPath anymore

        // test('should throw error for invalid dynamic property names', () => {
        //     // Invalid type
        //     expect(() => DynamicPropertyParser.parsePropertyDescription('_common:string123:font_font_font.font_font')).toThrow('Invalid dynamic property name');
            
        //     // Missing required colons
        //     expect(() => DynamicPropertyParser.parsePropertyDescription('_commonstringfont_font_font.font_font')).toThrow('Invalid dynamic property name');
            
        //     // Invalid property name
        //     expect(() => DynamicPropertyParser.parsePropertyDescription('_common:string:123font_font_font.font_font')).toThrow('Invalid dynamic property name');
            
        //     // Invalid renderer name
        //     expect(() => DynamicPropertyParser.parsePropertyDescription('_123common:string:font_font_font.font_font')).toThrow('Invalid dynamic property name');
        // });
    });
        
    describe('parseValue', () => {
        test('should parse string values', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_common:string:font');
            expect(DynamicPropertyParser.parseValue(property, 'Arial')).toBe('Arial');
            expect(DynamicPropertyParser.parseValue(property, 123)).toBe('123');
        });

        test('should parse float values', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_common:float:size');
            expect(DynamicPropertyParser.parseValue(property, '12.34')).toBe(12.34);
            expect(DynamicPropertyParser.parseValue(property, 12.34)).toBe(12.34);
            expect(DynamicPropertyParser.parseValue(property, 'invalid')).toBe(NaN);
        });

        test('should parse boolean values', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_common:boolean:visible');
            expect(DynamicPropertyParser.parseValue(property, 'true')).toBe(true);
            expect(DynamicPropertyParser.parseValue(property, 'false')).toBe(false);
            expect(DynamicPropertyParser.parseValue(property, true)).toBe(true);
            expect(DynamicPropertyParser.parseValue(property, 'invalid')).toBe(false);
        });

        test('should parse integer values', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_common:integer:count');
            expect(DynamicPropertyParser.parseValue(property, '123')).toBe(123);
            expect(DynamicPropertyParser.parseValue(property, 123)).toBe(123);
            expect(DynamicPropertyParser.parseValue(property, '12.34')).toBe(12);
            expect(DynamicPropertyParser.parseValue(property, 'invalid')).toBe(NaN);
        });
    });

    describe('parse', () => {
        test('should parse complete properties with values', () => {
            const property = DynamicPropertyParser.parse('_common:string:font', 'Arial');
            expect(property.renderer).toEqual('common');
            expect(property.dataType).toEqual('string');
            expect(property.isFlag).toEqual(false);
            expect(property.namePath).toEqual('font');
            expect(property.namePathArray).toEqual(['font']);
            expect(property.namePathTypes).toEqual(['name']);
            expect(property.value).toEqual('Arial');
        });

        test('should parse complex property names with values', () => {
            const property = DynamicPropertyParser.parse('_latex:string:font.family', 'serif');
            expect(property.renderer).toEqual('latex');
            expect(property.dataType).toEqual('string');
            expect(property.isFlag).toEqual(false);
            expect(property.namePath).toEqual('font.family');
            expect(property.namePathArray).toEqual(['font', 'family']);
            expect(property.namePathTypes).toEqual(['name', 'name']);
            expect(property.value).toEqual('serif');
        });

        test('should parse flag properties with values', () => {
            const property = DynamicPropertyParser.parse('_latex:flag:draw', 'solid');
            expect(property.renderer).toEqual('latex');
            expect(property.dataType).toEqual('string');
            expect(property.isFlag).toEqual(true);
            expect(property.namePath).toEqual('draw');
            expect(property.namePathArray).toEqual(['draw']);
            expect(property.namePathTypes).toEqual(['name']);
            expect(property.value).toEqual('solid');
        });
        
        test('should parse properties with array indices', () => {
            const property = DynamicPropertyParser.parse('_common:string:items.0.name', 'test');
            expect(property.renderer).toEqual('common');
            expect(property.dataType).toEqual('string');
            expect(property.isFlag).toEqual(false);
            expect(property.namePath).toEqual('items.0.name');
            expect(property.namePathArray).toEqual(['items', '0', 'name']);
            expect(property.namePathTypes).toEqual(['name', 'index', 'name']);
            expect(property.getNamePathArrayWithIndices()).toEqual(['items', 0, 'name']);
            expect(property.value).toEqual('test');
        });
    });
});