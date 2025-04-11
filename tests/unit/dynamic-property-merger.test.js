const DynamicPropertyMerger = require('../../src/io/readers/dynamic-property-merger');

// Helper function to create a property with namePathArray
function createProperty(renderer, group, name, dataType, value, isFlag = false, clearChildren = false) {
    return {
        renderer,
        group,
        name,
        dataType,
        value,
        isFlag,
        clearChildren,
        groupPathArray: group ? group.split('.') : [],
        namePathArray: name ? name.split('.') : []
    };
}

describe('DynamicPropertyMerger', () => {
    // Define compatible renderers for testing
    const rendererCompatibility = ['common', 'vector', 'latex'];
    
    test('should merge simple properties correctly', () => {
        const properties = [
            createProperty('common', 'test', 'prop1', 'string', 'value1'),
            createProperty('vector', 'test', 'prop2', 'string', 'value2'),
            createProperty('latex', 'test', 'prop3', 'string', 'value3')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererCompatibility);
        
        expect(merged.length).toBe(3);
        expect(merged[0].value).toBe('value1');
        expect(merged[1].value).toBe('value2');
        expect(merged[2].value).toBe('value3');
    });
    
    test('should handle exact match with chronological ordering', () => {
        const properties = [
            createProperty('common', 'test', 'prop', 'string', 'common value'),
            createProperty('vector', 'test', 'prop', 'string', 'vector value'),
            createProperty('latex', 'test', 'prop', 'string', 'latex value')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererCompatibility);
        
        // Last one in the array wins
        expect(merged.length).toBe(1);
        expect(merged[0].renderer).toBe('latex');
        expect(merged[0].value).toBe('latex value');
    });
    
    test('should handle exact match with chronological ordering regardless of renderer', () => {
        const properties = [
            createProperty('latex', 'test', 'prop', 'string', 'latex value'),
            createProperty('vector', 'test', 'prop', 'string', 'vector value'),
            createProperty('common', 'test', 'prop', 'string', 'common value')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererCompatibility);
        
        // Last one wins, regardless of renderer type
        expect(merged.length).toBe(1);
        expect(merged[0].renderer).toBe('common');
        expect(merged[0].value).toBe('common value');
    });
    
    test('should allow child properties with a parent property when clearChildren=false', () => {
        const properties = [
            createProperty('vector', 'group', 'parent', 'string', 'parent value'),
            createProperty('vector', 'group', 'parent.child1', 'string', 'child1 value'),
            createProperty('vector', 'group', 'parent.child2', 'string', 'child2 value')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererCompatibility);
        
        expect(merged.length).toBe(3);
        expect(merged[0].name).toBe('parent');
        expect(merged[0].value).toBe('parent value');
    });
    
    test('should keep properties from different renderers when paths differ', () => {
        const properties = [
            createProperty('common', 'group', 'parent', 'string', 'parent value'),
            createProperty('vector', 'group', 'parent.child1', 'string', 'child1 value'),
            createProperty('latex', 'group', 'parent.child2', 'string', 'child2 value')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererCompatibility);
        
        expect(merged.length).toBe(3);
        expect(merged.find(p => p.name === 'parent')).toBeTruthy();
        expect(merged.find(p => p.name === 'parent.child1')).toBeTruthy();
        expect(merged.find(p => p.name === 'parent.child2')).toBeTruthy();
    });
    
    test('should keep properties from different groups separate', () => {
        const properties = [
            createProperty('vector', 'group1', 'prop', 'string', 'group1 value'),
            createProperty('vector', 'group2', 'prop', 'string', 'group2 value'),
            createProperty('vector', 'group1', 'prop.child', 'string', 'group1 child'),
            createProperty('vector', 'group2', 'prop.child', 'string', 'group2 child')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererCompatibility);
        
        expect(merged.length).toBe(4);
        
        const group1 = merged.filter(p => p.group === 'group1');
        expect(group1).toBeTruthy();
        expect(group1.length).toBe(2);
        expect(group1[0].name).toBe('prop');
        expect(group1[1].name).toBe('prop.child');
        
        const group2 = merged.filter(p => p.group === 'group2');
        expect(group2).toBeTruthy();
        expect(group2.length).toBe(2);
        expect(group2[0].name).toBe('prop');
        expect(group2[1].name).toBe('prop.child');
    });
    
    test('should handle complex hierarchical relationships with clearChildren=true', () => {
        const properties = [
            // Add properties in a mixed order to test the algorithm thoroughly
            createProperty('common', 'test', 'a.b.c.d', 'string', 'abcd common'),
            createProperty('vector', 'test', 'a.b', 'string', 'ab vector', false, true),
            createProperty('latex', 'test', 'a.b.c', 'string', 'abc latex', false, true),
            createProperty('common', 'test', 'a', 'string', 'a common'),
            createProperty('vector', 'test', 'a.b.c.d.e', 'string', 'abcde vector')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererCompatibility);
        
        // With the clearChildren flags:
        // - 'a.b' clears any children (a.b.c.d) processed before it
        // - 'a.b.c' clears any children processed before it
        // - 'a.b.c.d.e' is added after the clearChildren processing
        
        expect(merged.length).toBe(4);
        expect(merged.find(p => p.name === 'a')).toBeTruthy();
        expect(merged.find(p => p.name === 'a.b')).toBeTruthy();
        expect(merged.find(p => p.name === 'a.b.c')).toBeTruthy();
        expect(merged.find(p => p.name === 'a.b.c.d.e')).toBeTruthy();
        expect(merged.find(p => p.name === 'a.b.c.d')).toBeFalsy(); // Cleared by a.b
    });
    
    test('should handle the biscuit example with clearChildren=true', () => {
        const properties = [
            createProperty('common', 'donkey', 'thing.subthing.flavor', 'string', 'vanilla'),
            createProperty('latex', 'donkey', 'thing.subthing.crunchiness', 'string', 'high'),
            createProperty('vector', 'donkey', 'thing.subthing', 'string', 'biscuit', false, true)
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererCompatibility);
        
        // The vector renderer's thing.subthing property with clearChildren=true
        // should remove all children
        expect(merged.length).toBe(1);
        
        const biscuitProp = merged.find(p => p.name === 'thing.subthing');
        expect(biscuitProp).toBeTruthy();
        expect(biscuitProp.renderer).toBe('vector');
        expect(biscuitProp.value).toBe('biscuit');
        
        // Child properties should be cleared by clearChildren=true
        expect(merged.find(p => p.name === 'thing.subthing.flavor')).toBeFalsy();
        expect(merged.find(p => p.name === 'thing.subthing.crunchiness')).toBeFalsy();
    });
    
    test('should handle null values correctly with clearChildren', () => {
        const properties = [
            createProperty('vector', 'test', 'prop1', 'string', 'value'),
            createProperty('vector', 'test', 'prop1.child', 'string', 'child value'),
            createProperty('vector', 'test', 'prop1', 'string', null, false, true)
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererCompatibility);
        
        // With clearChildren=true, null value clears children
        expect(merged.length).toBe(1);
        expect(merged[0].name).toBe('prop1');
        expect(merged[0].value).toBeNull();
    });
    
    test('should filter renderers not in compatibility list', () => {
        const properties = [
            createProperty('common', 'test', 'prop1', 'string', 'common'),
            createProperty('unknown', 'test', 'prop2', 'string', 'unknown'),
            createProperty('vector', 'test', 'prop3', 'string', 'vector')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererCompatibility);
        
        // Should exclude 'unknown' renderer
        expect(merged.length).toBe(2);
        expect(merged.find(p => p.renderer === 'unknown')).toBeFalsy();
    });
    
    test('should use chronological order when same property appears multiple times', () => {
        // Add properties in sequence to test last-one-wins
        const properties = [
            createProperty('common', 'test', 'prop', 'string', 'common value'),
            createProperty('vector', 'test', 'prop.child', 'string', 'vector child'),
            createProperty('vector', 'test', 'prop', 'string', 'vector value', false, true),
            createProperty('latex', 'test', 'prop', 'string', 'latex value', false, true),
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererCompatibility);
        
        // Last definition of 'prop' (latex) wins and has clearChildren=true
        expect(merged.length).toBe(1);
        expect(merged[0].renderer).toBe('latex');
        expect(merged[0].value).toBe('latex value');
    });

    test('should preserve child properties when parent has clearChildren=false', () => {
        const properties = [
            createProperty('vector', 'test', 'parent.child1', 'string', 'child1 value'),
            createProperty('vector', 'test', 'parent.child2', 'string', 'child2 value'),
            // Parent with clearChildren=false (default)
            createProperty('vector', 'test', 'parent', 'string', 'parent value')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererCompatibility);
        
        // All properties should be kept with clearChildren=false
        expect(merged.length).toBe(3);
        
        // Verify parent and both children exist
        expect(merged.find(p => p.name === 'parent')).toBeTruthy();
        expect(merged.find(p => p.name === 'parent.child1')).toBeTruthy();
        expect(merged.find(p => p.name === 'parent.child2')).toBeTruthy();
    });

    test('should directly compare clearChildren=true vs clearChildren=false behavior', () => {
        // Setup for clearChildren=false
        const propertiesWithoutClear = [
            createProperty('vector', 'test', 'parent.child1', 'string', 'child1 value'),
            createProperty('vector', 'test', 'parent.child2', 'string', 'child2 value'),
            createProperty('vector', 'test', 'parent', 'string', 'parent value', false, false) // Explicitly false
        ];
        
        const mergedWithoutClear = DynamicPropertyMerger.mergeProperties(propertiesWithoutClear, rendererCompatibility);
        
        // With clearChildren=false, we expect parent and both children
        expect(mergedWithoutClear.length).toBe(3);
        expect(mergedWithoutClear.find(p => p.name === 'parent')).toBeTruthy();
        expect(mergedWithoutClear.find(p => p.name === 'parent.child1')).toBeTruthy();
        expect(mergedWithoutClear.find(p => p.name === 'parent.child2')).toBeTruthy();
        
        // Setup for clearChildren=true with identical properties
        const propertiesWithClear = [
            createProperty('vector', 'test', 'parent.child1', 'string', 'child1 value'),
            createProperty('vector', 'test', 'parent.child2', 'string', 'child2 value'),
            createProperty('vector', 'test', 'parent', 'string', 'parent value', false, true) // True!
        ];
        
        const mergedWithClear = DynamicPropertyMerger.mergeProperties(propertiesWithClear, rendererCompatibility);
        
        // With clearChildren=true, we expect only the parent
        expect(mergedWithClear.length).toBe(1);
        expect(mergedWithClear[0].name).toBe('parent');
        expect(mergedWithClear.find(p => p.name === 'parent.child1')).toBeFalsy();
        expect(mergedWithClear.find(p => p.name === 'parent.child2')).toBeFalsy();
    });
});