const DynamicPropertyParser = require('../../../src/io/readers/dynamic-property-parser');

describe('DynamicPropertyParser', () => {
    describe('isDynamicProperty', () => {
        test('should identify valid dynamic property patterns', () => {
            // Full pattern with renderer and groupPath
            expect(DynamicPropertyParser.isDynamicProperty('_common:label_lab.lab:string:font_font_font.font_font')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_:label_lab.lab:string:font_font_font.font_font')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_common::string:font_font_font.font_font')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_::string:font_font_font.font_font')).toBe(true);
            
            // With renderer but no groupPath
            expect(DynamicPropertyParser.isDynamicProperty('_latex::string:draw')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_renderer123::float:margin')).toBe(true);
            
            // With no renderer or groupPath
            expect(DynamicPropertyParser.isDynamicProperty('_::boolean:visible')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_::string:title')).toBe(true);
            
            // With complex renderer names
            expect(DynamicPropertyParser.isDynamicProperty('_renderer123:groupPath:string:property')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_latex2:groupPath:string:property')).toBe(true);
            
            // With complex groupPath names
            expect(DynamicPropertyParser.isDynamicProperty('_renderer:groupPath.name.type:string:property')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_renderer:groupPath_123.name:string:property')).toBe(true);
            
            // With complex property names
            expect(DynamicPropertyParser.isDynamicProperty('_renderer:groupPath:string:property.name_with_underscores')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_renderer:groupPath:string:property.name.with.dots.and_underscores')).toBe(true);
            
            // With array indices in property names
            expect(DynamicPropertyParser.isDynamicProperty('_renderer:groupPath:string:items.0')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_renderer:groupPath:string:items.0.name')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_renderer:groupPath:string:items.0.1.2')).toBe(true);
            
            // With array indices in groupPath
            expect(DynamicPropertyParser.isDynamicProperty('_renderer:items.0:string:property')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_renderer:items.0.1:string:property')).toBe(true);
            expect(DynamicPropertyParser.isDynamicProperty('_renderer:group.items.0.name:string:property')).toBe(true);
        });

        test('should reject invalid dynamic property patterns', () => {
            // Missing leading underscore
            expect(DynamicPropertyParser.isDynamicProperty('common:label_lab.lab:string:font_font_font.font_font')).toBe(false);
            
            // Invalid type (contains numbers)
            expect(DynamicPropertyParser.isDynamicProperty('_common:label_lab.lab:string123:font_font_font.font_font')).toBe(false);
            
            // Missing required colons
            expect(DynamicPropertyParser.isDynamicProperty('_commonlabel_lab.labstringfont_font_font.font_font')).toBe(false);
            
            // Invalid property name (starts with number)
            expect(DynamicPropertyParser.isDynamicProperty('_common:label_lab.lab:string:123font_font_font.font_font')).toBe(false);
            
            // Invalid groupPath name (starts with number)
            expect(DynamicPropertyParser.isDynamicProperty('_common:123label_lab.lab:string:font_font_font.font_font')).toBe(false);
            
            // Invalid renderer name (starts with number)
            expect(DynamicPropertyParser.isDynamicProperty('_123common:label_lab.lab:string:font_font_font.font_font')).toBe(false);
        });
    });

    describe('parse', () => {
        test('should parse valid dynamic property names', () => {
            // Full pattern with renderer and groupPath
            const prop1 = DynamicPropertyParser.parsePropertyDescription('_common:label_lab.lab:string:font_font_font.font_font');
            expect(prop1.renderer).toEqual('common');
            expect(prop1.groupPath).toEqual('label_lab.lab');
            expect(prop1.groupPathArray).toEqual(['label_lab', 'lab']);
            expect(prop1.groupPathTypes).toEqual(['name', 'name']);
            expect(prop1.dataType).toEqual('string');
            expect(prop1.namePath).toEqual('font_font_font.font_font');
            expect(prop1.namePathArray).toEqual(['font_font_font', 'font_font']);
            expect(prop1.namePathTypes).toEqual(['name', 'name']);

            // With renderer but no groupPath
            const prop2 = DynamicPropertyParser.parsePropertyDescription('_latex::string:draw');
            expect(prop2.renderer).toEqual('latex');
            expect(prop2.groupPath).toEqual('');
            expect(prop2.groupPathArray).toEqual([]);
            expect(prop2.groupPathTypes).toEqual([]);
            expect(prop2.dataType).toEqual('string');
            expect(prop2.namePath).toEqual('draw');
            expect(prop2.namePathArray).toEqual(['draw']);
            expect(prop2.namePathTypes).toEqual(['name']);
            
            // With no renderer or groupPath
            const prop3 = DynamicPropertyParser.parsePropertyDescription('_::boolean:visible');
            expect(prop3.renderer).toEqual('common');
            expect(prop3.groupPath).toEqual('');
            expect(prop3.groupPathArray).toEqual([]);
            expect(prop3.groupPathTypes).toEqual([]);
            expect(prop3.dataType).toEqual('boolean');
            expect(prop3.namePath).toEqual('visible');
            expect(prop3.namePathArray).toEqual(['visible']);
            expect(prop3.namePathTypes).toEqual(['name']);
            
            // With complex renderer name
            const prop4 = DynamicPropertyParser.parsePropertyDescription('_renderer123:groupPath:string:property');
            expect(prop4.renderer).toEqual('renderer123');
            expect(prop4.groupPath).toEqual('groupPath');
            expect(prop4.groupPathArray).toEqual(['groupPath']);
            expect(prop4.groupPathTypes).toEqual(['name']);
            expect(prop4.dataType).toEqual('string');
            expect(prop4.namePath).toEqual('property');
            expect(prop4.namePathArray).toEqual(['property']);
            expect(prop4.namePathTypes).toEqual(['name']);
            
            // With complex groupPath name
            const prop5 = DynamicPropertyParser.parsePropertyDescription('_renderer:groupPath.name.type:string:property');
            expect(prop5.renderer).toEqual('renderer');
            expect(prop5.groupPath).toEqual('groupPath.name.type');
            expect(prop5.groupPathArray).toEqual(['groupPath', 'name', 'type']);
            expect(prop5.groupPathTypes).toEqual(['name', 'name', 'name']);
            expect(prop5.dataType).toEqual('string');
            expect(prop5.namePath).toEqual('property');
            expect(prop5.namePathArray).toEqual(['property']);
            expect(prop5.namePathTypes).toEqual(['name']);
            
            // With complex property name
            const prop6 = DynamicPropertyParser.parsePropertyDescription('_renderer:groupPath:string:property.name_with_underscores');
            expect(prop6.renderer).toEqual('renderer');
            expect(prop6.groupPath).toEqual('groupPath');
            expect(prop6.groupPathArray).toEqual(['groupPath']);
            expect(prop6.groupPathTypes).toEqual(['name']);
            expect(prop6.dataType).toEqual('string');
            expect(prop6.namePath).toEqual('property.name_with_underscores');
            expect(prop6.namePathArray).toEqual(['property', 'name_with_underscores']);
            expect(prop6.namePathTypes).toEqual(['name', 'name']);
        });

        test('should parse array indices in property names', () => {
            // Simple array index
            const prop1 = DynamicPropertyParser.parsePropertyDescription('_common:groupPath:string:items.0');
            expect(prop1.renderer).toEqual('common');
            expect(prop1.groupPath).toEqual('groupPath');
            expect(prop1.groupPathArray).toEqual(['groupPath']);
            expect(prop1.groupPathTypes).toEqual(['name']);
            expect(prop1.dataType).toEqual('string');
            expect(prop1.namePath).toEqual('items.0');
            expect(prop1.namePathArray).toEqual(['items', '0']);
            expect(prop1.namePathTypes).toEqual(['name', 'index']);
            expect(prop1.isNamePathIndex(0)).toBe(false);
            expect(prop1.isNamePathIndex(1)).toBe(true);
            expect(prop1.getNamePathArrayWithIndices()).toEqual(['items', 0]);
            
            // Nested array indices
            const prop2 = DynamicPropertyParser.parsePropertyDescription('_common:groupPath:string:items.0.name');
            expect(prop2.renderer).toEqual('common');
            expect(prop2.groupPath).toEqual('groupPath');
            expect(prop2.groupPathArray).toEqual(['groupPath']);
            expect(prop2.groupPathTypes).toEqual(['name']);
            expect(prop2.dataType).toEqual('string');
            expect(prop2.namePath).toEqual('items.0.name');
            expect(prop2.namePathArray).toEqual(['items', '0', 'name']);
            expect(prop2.namePathTypes).toEqual(['name', 'index', 'name']);
            expect(prop2.isNamePathIndex(0)).toBe(false);
            expect(prop2.isNamePathIndex(1)).toBe(true);
            expect(prop2.isNamePathIndex(2)).toBe(false);
            expect(prop2.getNamePathArrayWithIndices()).toEqual(['items', 0, 'name']);
            
            // Multiple array indices
            const prop3 = DynamicPropertyParser.parsePropertyDescription('_common:groupPath:string:items.0.1.2');
            expect(prop3.renderer).toEqual('common');
            expect(prop3.groupPath).toEqual('groupPath');
            expect(prop3.groupPathArray).toEqual(['groupPath']);
            expect(prop3.groupPathTypes).toEqual(['name']);
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

        test('should parse array indices in groupPath', () => {
            // Simple array index in groupPath
            const prop1 = DynamicPropertyParser.parsePropertyDescription('_renderer:items.0:string:property');
            expect(prop1.renderer).toEqual('renderer');
            expect(prop1.groupPath).toEqual('items.0');
            expect(prop1.groupPathArray).toEqual(['items', '0']);
            expect(prop1.groupPathTypes).toEqual(['name', 'index']);
            expect(prop1.isGroupPathIndex(0)).toBe(false);
            expect(prop1.isGroupPathIndex(1)).toBe(true);
            expect(prop1.getGroupPathArrayWithIndices()).toEqual(['items', 0]);
            expect(prop1.dataType).toEqual('string');
            expect(prop1.namePath).toEqual('property');
            expect(prop1.namePathArray).toEqual(['property']);
            expect(prop1.namePathTypes).toEqual(['name']);
            
            // Multiple array indices in groupPath
            const prop2 = DynamicPropertyParser.parsePropertyDescription('_renderer:items.0.1:string:property');
            expect(prop2.renderer).toEqual('renderer');
            expect(prop2.groupPath).toEqual('items.0.1');
            expect(prop2.groupPathArray).toEqual(['items', '0', '1']);
            expect(prop2.groupPathTypes).toEqual(['name', 'index', 'index']);
            expect(prop2.isGroupPathIndex(0)).toBe(false);
            expect(prop2.isGroupPathIndex(1)).toBe(true);
            expect(prop2.isGroupPathIndex(2)).toBe(true);
            expect(prop2.getGroupPathArrayWithIndices()).toEqual(['items', 0, 1]);
            expect(prop2.dataType).toEqual('string');
            expect(prop2.namePath).toEqual('property');
            expect(prop2.namePathArray).toEqual(['property']);
            expect(prop2.namePathTypes).toEqual(['name']);
            
            // Mixed array indices in groupPath and namePath
            const prop3 = DynamicPropertyParser.parsePropertyDescription('_renderer:group.items.0.name:string:property.1');
            expect(prop3.renderer).toEqual('renderer');
            expect(prop3.groupPath).toEqual('group.items.0.name');
            expect(prop3.groupPathArray).toEqual(['group', 'items', '0', 'name']);
            expect(prop3.groupPathTypes).toEqual(['name', 'name', 'index', 'name']);
            expect(prop3.isGroupPathIndex(0)).toBe(false);
            expect(prop3.isGroupPathIndex(1)).toBe(false);
            expect(prop3.isGroupPathIndex(2)).toBe(true);
            expect(prop3.isGroupPathIndex(3)).toBe(false);
            expect(prop3.getGroupPathArrayWithIndices()).toEqual(['group', 'items', 0, 'name']);
            expect(prop3.dataType).toEqual('string');
            expect(prop3.namePath).toEqual('property.1');
            expect(prop3.namePathArray).toEqual(['property', '1']);
            expect(prop3.namePathTypes).toEqual(['name', 'index']);
            expect(prop3.isNamePathIndex(0)).toBe(false);
            expect(prop3.isNamePathIndex(1)).toBe(true);
            expect(prop3.getNamePathArrayWithIndices()).toEqual(['property', 1]);
        });

        test('should throw error for invalid dynamic property names', () => {
            // Invalid type
            expect(() => DynamicPropertyParser.parsePropertyDescription('_common:label_lab.lab:string123:font_font_font.font_font')).toThrow('Invalid dynamic property name');
            
            // Missing required colons
            expect(() => DynamicPropertyParser.parsePropertyDescription('_commonlabel_lab.labstringfont_font_font.font_font')).toThrow('Invalid dynamic property name');
            
            // Invalid property name
            expect(() => DynamicPropertyParser.parsePropertyDescription('_common:label_lab.lab:string:123font_font_font.font_font')).toThrow('Invalid dynamic property name');
            
            // Invalid groupPath name
            expect(() => DynamicPropertyParser.parsePropertyDescription('_common:123label_lab.lab:string:font_font_font.font_font')).toThrow('Invalid dynamic property name');
            
            // Invalid renderer name
            expect(() => DynamicPropertyParser.parsePropertyDescription('_123common:label_lab.lab:string:font_font_font.font_font')).toThrow('Invalid dynamic property name');
        });
    });
        
    describe('parseValue', () => {
        test('should parse string values', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_common:label:string:font');
            expect(DynamicPropertyParser.parseValue(property, 'Arial')).toBe('Arial');
            expect(DynamicPropertyParser.parseValue(property, 123)).toBe('123');
        });

        test('should parse float values', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_common:label:float:size');
            expect(DynamicPropertyParser.parseValue(property, '12.34')).toBe(12.34);
            expect(DynamicPropertyParser.parseValue(property, 12.34)).toBe(12.34);
            expect(DynamicPropertyParser.parseValue(property, 'invalid')).toBe(NaN);
        });

        test('should parse boolean values', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_common:label:boolean:visible');
            expect(DynamicPropertyParser.parseValue(property, 'true')).toBe(true);
            expect(DynamicPropertyParser.parseValue(property, 'false')).toBe(false);
            expect(DynamicPropertyParser.parseValue(property, true)).toBe(true);
            expect(DynamicPropertyParser.parseValue(property, 'invalid')).toBe(false);
        });

        test('should parse integer values', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_common:label:integer:count');
            expect(DynamicPropertyParser.parseValue(property, '123')).toBe(123);
            expect(DynamicPropertyParser.parseValue(property, 123)).toBe(123);
            expect(DynamicPropertyParser.parseValue(property, '12.34')).toBe(12);
            expect(DynamicPropertyParser.parseValue(property, 'invalid')).toBe(NaN);
        });

        test('should parse flag values as strings', () => {
            const property = DynamicPropertyParser.parsePropertyDescription('_latex::flag:draw');
            expect(DynamicPropertyParser.parseValue(property, 'solid')).toBe('solid');
            expect(DynamicPropertyParser.parseValue(property, 'dashed')).toBe('dashed');
        });
    });

    describe('parse', () => {
        test('should parse complete properties with values', () => {
            const property = DynamicPropertyParser.parse('_common:label:string:font', 'Arial');
            expect(property.renderer).toEqual('common');
            expect(property.groupPath).toEqual('label');
            expect(property.groupPathArray).toEqual(['label']);
            expect(property.groupPathTypes).toEqual(['name']);
            expect(property.dataType).toEqual('string');
            expect(property.isFlag).toEqual(false);
            expect(property.namePath).toEqual('font');
            expect(property.namePathArray).toEqual(['font']);
            expect(property.namePathTypes).toEqual(['name']);
            expect(property.value).toEqual('Arial');
        });

        test('should parse hierarchical properties with values', () => {
            const property = DynamicPropertyParser.parse('_latex:font.style:string:family', 'serif');
            expect(property.renderer).toEqual('latex');
            expect(property.groupPath).toEqual('font.style');
            expect(property.groupPathArray).toEqual(['font', 'style']);
            expect(property.groupPathTypes).toEqual(['name', 'name']);
            expect(property.dataType).toEqual('string');
            expect(property.isFlag).toEqual(false);
            expect(property.namePath).toEqual('family');
            expect(property.namePathArray).toEqual(['family']);
            expect(property.namePathTypes).toEqual(['name']);
            expect(property.value).toEqual('serif');
        });

        test('should parse flag properties with values', () => {
            const property = DynamicPropertyParser.parse('_latex::flag:draw', 'solid');
            expect(property.renderer).toEqual('latex');
            expect(property.groupPath).toEqual('');
            expect(property.groupPathArray).toEqual([]);
            expect(property.groupPathTypes).toEqual([]);
            expect(property.dataType).toEqual('string');
            expect(property.isFlag).toEqual(true);
            expect(property.namePath).toEqual('draw');
            expect(property.namePathArray).toEqual(['draw']);
            expect(property.namePathTypes).toEqual(['name']);
            expect(property.value).toEqual('solid');
        });
        
        test('should parse properties with array indices', () => {
            const property = DynamicPropertyParser.parse('_common:groupPath:string:items.0.name', 'test');
            expect(property.renderer).toEqual('common');
            expect(property.groupPath).toEqual('groupPath');
            expect(property.groupPathArray).toEqual(['groupPath']);
            expect(property.groupPathTypes).toEqual(['name']);
            expect(property.dataType).toEqual('string');
            expect(property.isFlag).toEqual(false);
            expect(property.namePath).toEqual('items.0.name');
            expect(property.namePathArray).toEqual(['items', '0', 'name']);
            expect(property.namePathTypes).toEqual(['name', 'index', 'name']);
            expect(property.getNamePathArrayWithIndices()).toEqual(['items', 0, 'name']);
            expect(property.value).toEqual('test');
        });
        
        test('should parse properties with array indices in groupPath', () => {
            const property = DynamicPropertyParser.parse('_renderer:items.0.name:string:property', 'test');
            expect(property.renderer).toEqual('renderer');
            expect(property.groupPath).toEqual('items.0.name');
            expect(property.groupPathArray).toEqual(['items', '0', 'name']);
            expect(property.groupPathTypes).toEqual(['name', 'index', 'name']);
            expect(property.getGroupPathArrayWithIndices()).toEqual(['items', 0, 'name']);
            expect(property.dataType).toEqual('string');
            expect(property.isFlag).toEqual(false);
            expect(property.namePath).toEqual('property');
            expect(property.namePathArray).toEqual(['property']);
            expect(property.namePathTypes).toEqual(['name']);
            expect(property.value).toEqual('test');
        });
    });
});