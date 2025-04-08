const DynamicPropertyMerger = require('../../src/io/readers/dynamic-property-merger');
const DynamicPropertyParser = require('../../src/io/readers/dynamic-property-parser');

// Helper function to create a property
function createProperty(renderer, group, name, dataType, value, isFlag = false) {
    return {
        renderer,
        group,
        name,
        dataType,
        value,
        isFlag,
        groupPathArray: group ? group.split('.') : [],
        namePathArray: name ? name.split('.') : []
    };
}

describe('DynamicPropertyMerger', () => {
    // Define test renderer priorities (as would be provided by the latex renderer)
    const rendererPriorities = ['common', 'vector', 'latex'];
    
    test('should merge properties based on renderer priorities', () => {
        // Sample dynamic properties
        const dynamicProperties = [
            createProperty('common', 'label', 'font', 'string', 'Arial'),
            createProperty('vector', 'label', 'font', 'string', 'Helvetica'),
            createProperty('latex', 'label', 'font', 'string', 'Computer Modern'),
            createProperty('common', 'object', 'margin', 'float', 5),
            createProperty('latex', '', 'margin', 'float', 10), // No group
            createProperty('common', '', 'visible', 'boolean', true)  // No renderer or group
        ];
        
        // Merge the properties
        const mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        // Check that the correct properties were kept
        const fontProp = mergedProperties.find(p => p.name === 'font' && p.group === 'label');
        expect(fontProp).toBeTruthy();
        expect(fontProp.renderer).toBe('latex');
        expect(fontProp.value).toBe('Computer Modern');
        
        // Check property with no group
        const marginProp = mergedProperties.find(p => p.name === 'margin' && p.group === '');
        expect(marginProp).toBeTruthy();
        expect(marginProp.renderer).toBe('latex');
        expect(marginProp.value).toBe(10);
        
        // Check property with no renderer or group
        const visibleProp = mergedProperties.find(p => p.name === 'visible' && p.group === '');
        expect(visibleProp).toBeTruthy();
        expect(visibleProp.renderer).toBe('common');
        expect(visibleProp.value).toBe(true);
    });

    test('should only include properties with renderers in the priority list', () => {
        // Create properties including one with a renderer not in the priorities
        const dynamicProperties = [
            createProperty('common', 'label', 'font', 'string', 'Arial'),
            createProperty('unknown', 'label', 'color', 'string', 'red'),
            createProperty('vector', 'label', 'size', 'float', 12)
        ];
        
        const mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        // Should only include the properties with renderers in the priority list
        expect(mergedProperties.length).toBe(2);
        
        const fontProp = mergedProperties.find(p => p.name === 'font');
        expect(fontProp).toBeTruthy();
        
        const sizeProp = mergedProperties.find(p => p.name === 'size');
        expect(sizeProp).toBeTruthy();
        
        // The unknown renderer property should be excluded
        const colorProp = mergedProperties.find(p => p.name === 'color');
        expect(colorProp).toBeFalsy();
    });
    
    test('should treat common renderer and null renderer as equivalent', () => {
        // Create properties with matching names but different renderers
        let dynamicProperties = [
            createProperty('common', '', 'font', 'string', 'Arial'),     // Has common renderer, no group
            createProperty(null, '', 'font', 'string', 'Helvetica')      // No renderer, no group
        ];
        
        let mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        // Only one of them should exist since they should be treated the same
        expect(mergedProperties.length).toBe(1);
        expect(mergedProperties[0].value).toBe('Helvetica'); // The last one should win
        
        // Now test in reverse order
        dynamicProperties = [
            createProperty(null, '', 'font', 'string', 'Helvetica'),    // No renderer
            createProperty('common', '', 'font', 'string', 'Arial')     // Common renderer
        ];
        
        mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        // Again, only one property should be in the result
        expect(mergedProperties.length).toBe(1);
        expect(mergedProperties[0].value).toBe('Arial'); // The last one should win
        
        // Both should lose to a higher priority renderer
        dynamicProperties = [
            createProperty(null, '', 'font', 'string', 'Helvetica'),     // No renderer
            createProperty('common', '', 'font', 'string', 'Arial'),     // Common renderer
            createProperty('vector', '', 'font', 'string', 'Sans')       // Vector renderer (higher priority)
        ];
        
        mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        // Should have only kept the vector renderer version
        expect(mergedProperties.length).toBe(1);
        expect(mergedProperties[0].renderer).toBe('vector');
        expect(mergedProperties[0].value).toBe('Sans');
    });
    
    test('should process dynamic properties directly', () => {
        // Create a dynamic properties array
        const dynamicProperties = [
            createProperty('common', 'label', 'font', 'string', 'Arial'),
            createProperty('vector', 'label', 'font', 'string', 'Helvetica'),
            createProperty('latex', 'object', 'margin', 'float', 10)
        ];
        
        const mergedProperties = DynamicPropertyMerger.processDynamicProperties(dynamicProperties, rendererPriorities);
        
        expect(mergedProperties).toBeTruthy();
        expect(Array.isArray(mergedProperties)).toBe(true);
        
        // Check that properties are correctly merged
        const fontProp = mergedProperties.find(p => p.name === 'font' && p.group === 'label');
        expect(fontProp.value).toBe('Helvetica');
        
        const marginProp = mergedProperties.find(p => p.name === 'margin' && p.group === 'object');
        expect(marginProp.value).toBe(10);
    });
    
    test('should handle hierarchical names by removing child properties with lower priority', () => {
        // Create properties with hierarchical names
        const dynamicProperties = [
            createProperty('vector', 'donkey', 'thing.subthing', 'string', 'biscuit'),
            createProperty('vector', 'donkey', 'thing.subthing.flavor', 'string', 'chocolate'),
            createProperty('latex', 'donkey', 'thing.subthing.crunchiness', 'string', 'high')
        ];
        
        const mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        // Since 'thing.subthing' is added first, it should remove 'thing.subthing.flavor'
        // But not 'thing.subthing.crunchiness' which has higher priority
        expect(mergedProperties.length).toBe(2);
        
        // Check the biscuit property is there
        const biscuitProp = mergedProperties.find(p => 
            p.group === 'donkey' && p.name === 'thing.subthing'
        );
        expect(biscuitProp).toBeTruthy();
        expect(biscuitProp.value).toBe('biscuit');
        
        // Check the flavor property is gone (equal priority and child of thing.subthing)
        const flavorProp = mergedProperties.find(p => 
            p.group === 'donkey' && p.name === 'thing.subthing.flavor'
        );
        expect(flavorProp).toBeFalsy();
        
        // Check the crunchiness property is still there (higher priority)
        const crunchinessProp = mergedProperties.find(p => 
            p.group === 'donkey' && p.name === 'thing.subthing.crunchiness'
        );
        expect(crunchinessProp).toBeTruthy();
        expect(crunchinessProp.value).toBe('high');
    });
    
    test('should handle null values', () => {
        // Create properties with null values
        const dynamicProperties = [
            createProperty('vector', 'test', 'prop1', 'string', 'value'),
            createProperty('vector', 'test', 'prop1.child', 'string', 'child value'),
            createProperty('vector', 'test', 'prop1', 'string', null) // null value should still replace children
        ];
        
        const mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        // Should have only the null-valued property (child was removed)
        expect(mergedProperties.length).toBe(1);
        
        const nullProp = mergedProperties[0];
        expect(nullProp.group).toBe('test');
        expect(nullProp.name).toBe('prop1');
        expect(nullProp.value).toBeNull();
    });
    
    test('should only consider properties with same group when removing children', () => {
        // Create properties with same name pattern but different groups
        const dynamicProperties = [
            createProperty('vector', 'group1', 'thing', 'string', 'value1'),
            createProperty('vector', 'group1', 'thing.child', 'string', 'child1'),
            createProperty('vector', 'group2', 'thing', 'string', 'value2'),
            createProperty('vector', 'group2', 'thing.child', 'string', 'child2')
        ];
        
        const mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        // Should keep the parent properties and remove the children for each group
        expect(mergedProperties.length).toBe(2);
        
        // Group1 property
        const group1Prop = mergedProperties.find(p => p.group === 'group1');
        expect(group1Prop).toBeTruthy();
        expect(group1Prop.name).toBe('thing');
        
        // Group2 property
        const group2Prop = mergedProperties.find(p => p.group === 'group2');
        expect(group2Prop).toBeTruthy();
        expect(group2Prop.name).toBe('thing');
        
        // Neither child property should remain
        const childProps = mergedProperties.filter(p => p.name.includes('child'));
        expect(childProps.length).toBe(0);
    });
    
    test('should maintain parent-child relationships in the hierarchy output', () => {
        const dynamicProperties = [
            createProperty('vector', 'font', 'color', 'string', 'black'),
            createProperty('vector', 'font', 'style.weight', 'string', 'bold'),
            createProperty('vector', 'font', 'style.decoration', 'string', 'underline'),
            createProperty('vector', '', 'margin.top', 'float', 10),
            createProperty('vector', '', 'margin.bottom', 'float', 20)
        ];
        
        const mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        const hierarchy = DynamicPropertyMerger.toHierarchy(mergedProperties);
        
        // Check the hierarchy structure with dot notation in names
        expect(hierarchy.font.color).toBe('black');
        expect(hierarchy.font.style.weight).toBe('bold');
        expect(hierarchy.font.style.decoration).toBe('underline');
        expect(hierarchy.margin.top).toBe(10);
        expect(hierarchy.margin.bottom).toBe(20);
    });
    
    test('should handle empty or invalid input', () => {
        // Null input
        expect(DynamicPropertyMerger.processDynamicProperties(null, rendererPriorities)).toEqual([]);
        
        // Not an array
        expect(DynamicPropertyMerger.processDynamicProperties({}, rendererPriorities)).toEqual([]);
        
        // Empty array
        expect(DynamicPropertyMerger.processDynamicProperties([], rendererPriorities)).toEqual([]);
        
        // Invalid renderer priorities
        expect(DynamicPropertyMerger.processDynamicProperties([
            createProperty('vector', 'test', 'prop', 'string', 'value')
        ], null)).toEqual([]);
    });
    
    test('should properly handle the example scenario', () => {
        // The example scenario from the requirements
        const dynamicProperties = [
            // First add some properties in various renderers
            createProperty('common', 'donkey', 'thing.subthing.flavor', 'string', 'vanilla'),
            createProperty('latex', 'donkey', 'thing.subthing.crunchiness', 'string', 'high'),
            
            // Then add the vector property which should remove flavor but not crunchiness
            createProperty('vector', 'donkey', 'thing.subthing', 'string', 'biscuit')
        ];
        
        const mergedProperties = DynamicPropertyMerger.mergeProperties(dynamicProperties, rendererPriorities);
        
        // Should have two properties
        expect(mergedProperties.length).toBe(2);
        
        // Check the biscuit property is there
        const biscuitProp = mergedProperties.find(p => 
            p.group === 'donkey' && p.name === 'thing.subthing'
        );
        expect(biscuitProp).toBeTruthy();
        expect(biscuitProp.value).toBe('biscuit');
        expect(biscuitProp.renderer).toBe('vector');
        
        // Check the flavor property is gone (lower priority child)
        const flavorProp = mergedProperties.find(p => 
            p.group === 'donkey' && p.name === 'thing.subthing.flavor'
        );
        expect(flavorProp).toBeFalsy();
        
        // Check the crunchiness property is still there (higher priority)
        const crunchinessProp = mergedProperties.find(p => 
            p.group === 'donkey' && p.name === 'thing.subthing.crunchiness'
        );
        expect(crunchinessProp).toBeTruthy();
        expect(crunchinessProp.value).toBe('high');
        expect(crunchinessProp.renderer).toBe('latex');
    });
});
