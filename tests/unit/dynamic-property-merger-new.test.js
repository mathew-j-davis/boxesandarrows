const DynamicPropertyMerger = require('../../src/io/readers/dynamic-property-merger');

// Helper function to create a property with namePathArray
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

describe('DynamicPropertyMerger - New Implementation', () => {
    // Define test renderer priorities
    const rendererPriorities = ['common', 'vector', 'latex'];
    
    test('should merge simple properties correctly', () => {
        const properties = [
            createProperty('common', 'test', 'prop1', 'string', 'value1'),
            createProperty('vector', 'test', 'prop2', 'string', 'value2'),
            createProperty('latex', 'test', 'prop3', 'string', 'value3')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererPriorities);
        
        expect(merged.length).toBe(3);
        expect(merged[0].value).toBe('value1');
        expect(merged[1].value).toBe('value2');
        expect(merged[2].value).toBe('value3');
    });
    
    test('should handle exact match with higher priority correctly', () => {
        const properties = [
            createProperty('common', 'test', 'prop', 'string', 'common value'),
            createProperty('vector', 'test', 'prop', 'string', 'vector value'),
            createProperty('latex', 'test', 'prop', 'string', 'latex value')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererPriorities);
        
        expect(merged.length).toBe(1);
        expect(merged[0].renderer).toBe('latex');
        expect(merged[0].value).toBe('latex value');
    });
    
    test('should handle exact match with lower priority correctly', () => {
        const properties = [
            createProperty('latex', 'test', 'prop', 'string', 'latex value'),
            createProperty('vector', 'test', 'prop', 'string', 'vector value'),
            createProperty('common', 'test', 'prop', 'string', 'common value')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererPriorities);
        
        expect(merged.length).toBe(1);
        expect(merged[0].renderer).toBe('latex');
        expect(merged[0].value).toBe('latex value');
    });
    

    //question: should we allow child properties with equal or lower priority added to a parent property?
    test('should allow child properties with equal or lower priority added to a parent property', () => {
        const properties = [
            createProperty('vector', 'group', 'parent', 'string', 'parent value'),
            createProperty('vector', 'group', 'parent.child1', 'string', 'child1 value'),
            createProperty('vector', 'group', 'parent.child2', 'string', 'child2 value')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererPriorities);
        
        expect(merged.length).toBe(3);
        expect(merged[0].name).toBe('parent');
        expect(merged[0].value).toBe('parent value');
    });
    
    test('should keep child properties with higher priority', () => {
        const properties = [
            createProperty('common', 'group', 'parent', 'string', 'parent value'),
            createProperty('vector', 'group', 'parent.child1', 'string', 'child1 value'),
            createProperty('latex', 'group', 'parent.child2', 'string', 'child2 value')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererPriorities);
        
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
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererPriorities);
        
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
    
    test('should handle complex hierarchical relationships', () => {
        const properties = [
            // Add properties in a mixed order to test the algorithm thoroughly
            createProperty('common', 'test', 'a.b.c.d', 'string', 'abcd common'),
            createProperty('vector', 'test', 'a.b', 'string', 'ab vector'),
            createProperty('latex', 'test', 'a.b.c', 'string', 'abc latex'),
            createProperty('common', 'test', 'a', 'string', 'a common'),
            createProperty('vector', 'test', 'a.b.c.d.e', 'string', 'abcde vector')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererPriorities);
        
        // We should have:
        // - 'a' (common) is replaced by higher priority ones
        // - 'a.b' (vector) is kept
        // - 'a.b.c' (latex) is kept because it's highest priority
        // - 'a.b.c.d' (common) is kept because it is applied later
        // - 'a.b.c.d.e' (vector) is kept because it is applied later
        
        expect(merged.length).toBe(4);
        expect(merged.find(p => p.name === 'a.b')).toBeTruthy();
        expect(merged.find(p => p.name === 'a.b.c')).toBeTruthy();
    });
    
    test('should handle the biscuit example scenario', () => {
        const properties = [
            createProperty('common', 'donkey', 'thing.subthing.flavor', 'string', 'vanilla'),
            createProperty('latex', 'donkey', 'thing.subthing.crunchiness', 'string', 'high'),
            createProperty('vector', 'donkey', 'thing.subthing', 'string', 'biscuit')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererPriorities);
        
        expect(merged.length).toBe(2);
        
        // The vector renderer's thing.subthing property should be there
        const biscuitProp = merged.find(p => p.name === 'thing.subthing');
        expect(biscuitProp).toBeTruthy();
        expect(biscuitProp.renderer).toBe('vector');
        expect(biscuitProp.value).toBe('biscuit');
        
        // The latex renderer's thing.subthing.crunchiness should be there (higher priority)
        const crunchinessProp = merged.find(p => p.name === 'thing.subthing.crunchiness');
        expect(crunchinessProp).toBeTruthy();
        expect(crunchinessProp.renderer).toBe('latex');
        expect(crunchinessProp.value).toBe('high');
        
        // The common renderer's thing.subthing.flavor should be removed
        const flavorProp = merged.find(p => p.name === 'thing.subthing.flavor');
        expect(flavorProp).toBeFalsy();
    });
    
    test('should handle null values correctly', () => {
        const properties = [
            createProperty('vector', 'test', 'prop1', 'string', 'value'),
            createProperty('vector', 'test', 'prop1.child', 'string', 'child value'),
            createProperty('vector', 'test', 'prop1', 'string', null)
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererPriorities);
        
        expect(merged.length).toBe(1);
        expect(merged[0].name).toBe('prop1');
        expect(merged[0].value).toBeNull();
    });
    
    test('should handle renderers not in priority list', () => {
        const properties = [
            createProperty('common', 'test', 'prop1', 'string', 'common'),
            createProperty('unknown', 'test', 'prop2', 'string', 'unknown'),
            createProperty('vector', 'test', 'prop3', 'string', 'vector')
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererPriorities);
        
        expect(merged.length).toBe(2);
        expect(merged.find(p => p.renderer === 'unknown')).toBeFalsy();
    });
    
    test('should handle multiple renderers updating the same property', () => {
        // Add properties with incrementing priorities to test replacement
        const properties = [
            createProperty('common', 'test', 'prop', 'string', 'common value'),
            createProperty('vector', 'test', 'prop.child', 'string', 'vector child'),
            createProperty('vector', 'test', 'prop', 'string', 'vector value'),
            createProperty('latex', 'test', 'prop', 'string', 'latex value'),
        ];
        
        const merged = DynamicPropertyMerger.mergeProperties(properties, rendererPriorities);
        
        expect(merged.length).toBe(1);
        expect(merged[0].renderer).toBe('latex');
        expect(merged[0].value).toBe('latex value');
    });
}); 