const DynamicPropertyParser = require('../../../src/io/readers/dynamic-property-parser');

describe('DynamicPropertyParser', () => {
    describe('isDynamicProperty', () => {
        test('should identify valid dynamic property patterns', () => {
            // Full pattern with renderer and group
            expect(DynamicPropertyParser.isDynamicProperty('_common label_lab.lab string font_font_font.font_font')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_ label_lab.lab string font_font_font.font_font')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_common  string font_font_font.font_font')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_  string font_font_font.font_font')).toBe(true);
            
            // With renderer but no group
            expect(DynamicPropertyParser.isDynamicProperty('_latex  string draw')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_renderer123  float margin')).toBe(true);
            
            // With no renderer or group
            expect(DynamicPropertyParser.isDynamicProperty('_  boolean visible')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_  string title')).toBe(true);
            
            // With complex renderer names
            expect(DynamicPropertyParser.isDynamicProperty('_renderer123 group string property')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_latex2 group string property')).toBe(true);
            
            // With complex group names
            expect(DynamicPropertyParser.isDynamicProperty('_renderer group.name.type string property')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_renderer group_123.name string property')).toBe(true);
            
            // With complex property names
            expect(DynamicPropertyParser.isDynamicProperty('_renderer group string property.name_with_underscores')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_renderer group string property.name.with.dots.and_underscores')).toBe(true);
        });

        test('should reject invalid dynamic property patterns', () => {
            // Missing leading underscore
            expect(DynamicPropertyParser.isDynamicProperty('common label_lab.lab string font_font_font.font_font')).toBe(false);
            
            // Invalid type (contains numbers)
            expect(DynamicPropertyParser.isDynamicProperty('_common label_lab.lab string123 font_font_font.font_font')).toBe(false);
            
            // Missing required spaces
            expect(DynamicPropertyParser.isDynamicProperty('_commonlabel_lab.lab string font_font_font.font_font')).toBe(false);
            
            // Invalid property name (starts with number)
            expect(DynamicPropertyParser.isDynamicProperty('_common label_lab.lab string 123font_font_font.font_font')).toBe(false);
            
            // Invalid group name (starts with number)
            expect(DynamicPropertyParser.isDynamicProperty('_common 123label_lab.lab string font_font_font.font_font')).toBe(false);
            
            // Invalid renderer name (starts with number)
            expect(DynamicPropertyParser.isDynamicProperty('_123common label_lab.lab string font_font_font.font_font')).toBe(false);
        });
    });

    describe('parse', () => {
        test('should parse valid dynamic property names', () => {
            // Full pattern with renderer and group
            const prop1 = DynamicPropertyParser.parsePropertyDescription('_common label_lab.lab string font_font_font.font_font');
            expect(prop1.renderer).toEqual('common');
            expect(prop1.group).toEqual('label_lab.lab');
            expect(prop1.dataType).toEqual('string');
            expect(prop1.name).toEqual('font_font_font.font_font');
            expect(prop1.namePathArray).toEqual(['font_font_font', 'font_font']);

            // With renderer but no group
            const prop2 = DynamicPropertyParser.parsePropertyDescription('_latex  string draw');
            expect(prop2.renderer).toEqual('latex');
            expect(prop2.group).toEqual('');
            expect(prop2.dataType).toEqual('string');
            expect(prop2.name).toEqual('draw');
            expect(prop2.namePathArray).toEqual(['draw']);
            
            // With no renderer or group
            const prop3 = DynamicPropertyParser.parsePropertyDescription('_  boolean visible');
            expect(prop3.renderer).toEqual('common');
            expect(prop3.group).toEqual('');
            expect(prop3.dataType).toEqual('boolean');
            expect(prop3.name).toEqual('visible');
            expect(prop3.namePathArray).toEqual(['visible']);
            
            // With complex renderer name
            const prop4 = DynamicPropertyParser.parsePropertyDescription('_renderer123 group string property');
            expect(prop4.renderer).toEqual('renderer123');
            expect(prop4.group).toEqual('group');
            expect(prop4.dataType).toEqual('string');
            expect(prop4.name).toEqual('property');
            expect(prop4.namePathArray).toEqual(['property']);
            
            // With complex group name
            const prop5 = DynamicPropertyParser.parsePropertyDescription('_renderer group.name.type string property');
            expect(prop5.renderer).toEqual('renderer');
            expect(prop5.group).toEqual('group.name.type');
            expect(prop5.dataType).toEqual('string');
            expect(prop5.name).toEqual('property');
            expect(prop5.namePathArray).toEqual(['property']);
            
            // With complex property name
            const prop6 = DynamicPropertyParser.parsePropertyDescription('_renderer group string property.name_with_underscores');
            expect(prop6.renderer).toEqual('renderer');
            expect(prop6.group).toEqual('group');
            expect(prop6.dataType).toEqual('string');
            expect(prop6.name).toEqual('property.name_with_underscores');
            expect(prop6.namePathArray).toEqual(['property', 'name_with_underscores']);
        });

        test('should throw error for invalid dynamic property names', () => {
            // Invalid type
            expect(() => DynamicPropertyParser.parsePropertyDescription('_common label_lab.lab string123 font_font_font.font_font')).toThrow('Invalid dynamic property name');
            
            // Missing required spaces
            expect(() => DynamicPropertyParser.parsePropertyDescription('_commonlabel_lab.lab string font_font_font.font_font')).toThrow('Invalid dynamic property name');
            
            // Invalid property name
            expect(() => DynamicPropertyParser.parsePropertyDescription('_common label_lab.lab string 123font_font_font.font_font')).toThrow('Invalid dynamic property name');
            
            // Invalid group name
            expect(() => DynamicPropertyParser.parsePropertyDescription('_common 123label_lab.lab string font_font_font.font_font')).toThrow('Invalid dynamic property name');
            
            // Invalid renderer name
            expect(() => DynamicPropertyParser.parsePropertyDescription('_123common label_lab.lab string font_font_font.font_font')).toThrow('Invalid dynamic property name');
        });
    });
        
    describe('parseValue', () => {
        test('should parse string values', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_common label string font');
            expect(DynamicPropertyParser.parseValue(property, 'Arial')).toBe('Arial');
            expect(DynamicPropertyParser.parseValue(property, 123)).toBe('123');
        });

        test('should parse float values', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_common label float size');
            expect(DynamicPropertyParser.parseValue(property, '12.34')).toBe(12.34);
            expect(DynamicPropertyParser.parseValue(property, 12.34)).toBe(12.34);
            expect(DynamicPropertyParser.parseValue(property, 'invalid')).toBe(NaN);
        });

        test('should parse boolean values', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_common label boolean visible');
            expect(DynamicPropertyParser.parseValue(property, 'true')).toBe(true);
            expect(DynamicPropertyParser.parseValue(property, 'false')).toBe(false);
            expect(DynamicPropertyParser.parseValue(property, true)).toBe(true);
            expect(DynamicPropertyParser.parseValue(property, 'invalid')).toBe(false);
        });

        test('should parse integer values', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_common label integer count');
            expect(DynamicPropertyParser.parseValue(property, '123')).toBe(123);
            expect(DynamicPropertyParser.parseValue(property, 123)).toBe(123);
            expect(DynamicPropertyParser.parseValue(property, '12.34')).toBe(12);
            expect(DynamicPropertyParser.parseValue(property, 'invalid')).toBe(NaN);
        });

        test('should parse flag values as strings', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_latex  flag draw');
            expect(DynamicPropertyParser.parseValue(property, 'solid')).toBe('solid');
            expect(DynamicPropertyParser.parseValue(property, 'dashed')).toBe('dashed');
        });
    });

    describe('parse', () => {
        test('should parse complete properties with values', () => {
            const property = DynamicPropertyParser.parse('_common label string font', 'Arial');
            expect(property.renderer).toEqual('common');
            expect(property.group).toEqual('label');
            expect(property.groupPathArray).toEqual(['label']);
            expect(property.dataType).toEqual('string');
            expect(property.isFlag).toEqual(false);
            expect(property.name).toEqual('font');
            expect(property.namePathArray).toEqual(['font']);
            expect(property.value).toEqual('Arial');
        });

        test('should parse hierarchical properties with values', () => {
            const property = DynamicPropertyParser.parse('_latex font.style string family', 'serif');
            expect(property.renderer).toEqual('latex');
            expect(property.group).toEqual('font.style');
            expect(property.groupPathArray).toEqual(['font', 'style']);
            expect(property.dataType).toEqual('string');
            expect(property.isFlag).toEqual(false);
            expect(property.name).toEqual('family');
            expect(property.namePathArray).toEqual(['family']);
            expect(property.value).toEqual('serif');
        });

        test('should parse flag properties with values', () => {
            const property = DynamicPropertyParser.parse('_latex  flag draw', 'solid');
            expect(property.renderer).toEqual('latex');
            expect(property.group).toEqual('');
            expect(property.groupPathArray).toEqual([]);
            expect(property.dataType).toEqual('string');
            expect(property.isFlag).toEqual(true);
            expect(property.name).toEqual('draw');
            expect(property.namePathArray).toEqual(['draw']);
            expect(property.value).toEqual('solid');
        });
    });
});