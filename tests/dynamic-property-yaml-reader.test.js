const DynamicPropertyYamlReader = require('../src/io/readers/dynamic-property-yaml-reader');

describe('DynamicPropertyYamlReader', () => {
  // Example YAML with both regular data and renderers
  const exampleYaml = `
---
# Regular data (not a renderer)
metadata:
  version: 1.0
  author: Test User
  description: Sample YAML for testing

# Renderer data that will be transformed
common: !renderer
  label: !group
    text: !group
      above: 
        font: Arial
        size: 12
        visible: true
  arrows: !group
    start: !group
      fill:
        color: black
      width: 1.5

# Another regular section
settings:
  theme: dark
  language: en-US

# Another renderer
latex: !renderer
  draw: !group
    pattern: !flag dashed
    visible1: ~
    visible2: null
`;

  // Example YAML with nested renderer tags (which should be ignored)
  const nestedRendererYaml = `
---
# Top-level renderer (should be processed)
common: !renderer
  label: !group
    text: Above

# Nested renderer tags (should be ignored)
settings:
  theme: dark
  nestedRenderer: !renderer
    ignored: true
    nestedGroup: !group
      alsoIgnored: test
  regularData: 
    stillWorks: true

# Another top-level renderer
math: !renderer
  formula: E=mc^2
`;

  describe('loadFromYaml transformation', () => {
    let transformedYaml;
    let originalProperties;
    
    beforeAll(() => {
      // Process the YAML using the new transformation logic
      transformedYaml = DynamicPropertyYamlReader.loadFromYaml(exampleYaml);
      
      // Get original properties for comparison
      originalProperties = DynamicPropertyYamlReader.loadDynamicProperties(exampleYaml);
    });
    
    test('should return parsed YAML with transformed structure', () => {
      expect(transformedYaml).toBeDefined();
      expect(typeof transformedYaml).toBe('object');
    });
    
    test('should keep non-renderer data unchanged', () => {
      // Check regular data is unchanged
      expect(transformedYaml.metadata).toBeDefined();
      expect(transformedYaml.metadata.version).toBe(1.0);
      expect(transformedYaml.metadata.author).toBe('Test User');
      expect(transformedYaml.metadata.description).toBe('Sample YAML for testing');
      
      expect(transformedYaml.settings).toBeDefined();
      expect(transformedYaml.settings.theme).toBe('dark');
      expect(transformedYaml.settings.language).toBe('en-US');
    });
    
    test('should transform renderer data into _dynamicProperties array', () => {
      // Check renderer keys are removed
      expect(transformedYaml.common).toBeUndefined();
      expect(transformedYaml.latex).toBeUndefined();
      
      // Check _dynamicProperties exists and contains all properties
      expect(transformedYaml._dynamicProperties).toBeDefined();
      expect(Array.isArray(transformedYaml._dynamicProperties)).toBe(true);
      expect(transformedYaml._dynamicProperties.length).toBeGreaterThan(0);
      
      // Should have properties from both renderers
      const commonProps = transformedYaml._dynamicProperties.filter(p => p.renderer === 'common');
      const latexProps = transformedYaml._dynamicProperties.filter(p => p.renderer === 'latex');
      
      expect(commonProps.length).toBeGreaterThan(0);
      expect(latexProps.length).toBeGreaterThan(0);
    });
    
    test('should preserve property values correctly', () => {
      // Check specific property values
      const fontProp = transformedYaml._dynamicProperties.find(
        p => p.renderer === 'common' && p.group === 'label.text' && p.name === 'above.font'
      );
      expect(fontProp).toBeDefined();
      expect(fontProp.value).toBe('Arial');
      
      const colorProp = transformedYaml._dynamicProperties.find(
        p => p.renderer === 'common' && p.group === 'arrows.start' && p.name === 'fill.color'
      );
      expect(colorProp).toBeDefined();
      expect(colorProp.value).toBe('black');
      
      // Test flag property
      const flagProp = transformedYaml._dynamicProperties.find(
        p => p.renderer === 'latex' && p.name === 'pattern'
      );
      expect(flagProp).toBeDefined();
      expect(flagProp.isFlag).toBe(true);
      expect(flagProp.value).toBe('dashed');
      
      // Test null values
      const nullProp1 = transformedYaml._dynamicProperties.find(
        p => p.renderer === 'latex' && p.name === 'visible1'
      );
      const nullProp2 = transformedYaml._dynamicProperties.find(
        p => p.renderer === 'latex' && p.name === 'visible2'
      );
      expect(nullProp1).toBeDefined();
      expect(nullProp2).toBeDefined();
      expect(nullProp1.value).toBeNull();
      expect(nullProp2.value).toBeNull();
    });
    
    test('should maintain complete set of properties from original format', () => {
      // Check the properties count matches original
      expect(transformedYaml._dynamicProperties.length).toBe(originalProperties.length);
      
      // Check each original property has a matching transformed property
      originalProperties.forEach(origProp => {
        const matchingProp = transformedYaml._dynamicProperties.find(p => 
          p.renderer === origProp.renderer && 
          p.name === origProp.name && 
          p.group === origProp.group
        );
        
        expect(matchingProp).toBeDefined();
        expect(matchingProp.value).toEqual(origProp.value);
        expect(matchingProp.dataType).toBe(origProp.dataType);
        expect(matchingProp.isFlag).toBe(origProp.isFlag);
      });
    });
    
    test('should correctly format property objects with all required fields', () => {
      // Check property structure
      const commonProps = transformedYaml._dynamicProperties.filter(p => p.renderer === 'common');
      commonProps.forEach(prop => {
        expect(prop.renderer).toBe('common');
        expect(prop.group).toBeDefined();
        expect(prop.name).toBeDefined();
        expect(prop.dataType).toBeDefined();
        expect('value' in prop).toBe(true);
        expect('isFlag' in prop).toBe(true);
        expect(Array.isArray(prop.groupPathArray)).toBe(true);
        expect(Array.isArray(prop.namePathArray)).toBe(true);
      });
    });
  });
  
  describe('handling of nested renderer tags', () => {
    let transformedYaml;
    
    beforeAll(() => {
      transformedYaml = DynamicPropertyYamlReader.loadFromYaml(nestedRendererYaml);
    });
    
    test('should only transform top-level renderer tags', () => {
      // Check nested renderer is ignored
      expect(transformedYaml.settings).toBeDefined();
      expect(transformedYaml.settings.nestedRenderer).toBeDefined();
      expect(transformedYaml.settings.nestedRenderer).toEqual({});
      
      // Check regular nested data is preserved
      expect(transformedYaml.settings.regularData).toBeDefined();
      expect(transformedYaml.settings.regularData.stillWorks).toBe(true);
      
      // Check _dynamicProperties contains properties from both top-level renderers
      expect(transformedYaml._dynamicProperties).toBeDefined();
      expect(Array.isArray(transformedYaml._dynamicProperties)).toBe(true);
      
      const commonProps = transformedYaml._dynamicProperties.filter(p => p.renderer === 'common');
      const mathProps = transformedYaml._dynamicProperties.filter(p => p.renderer === 'math');
      
      expect(commonProps.length).toBeGreaterThan(0);
      expect(mathProps.length).toBeGreaterThan(0);
    });
    
    test('should extract properties from top-level renderers only', () => {
      // Check specific properties
      const textProp = transformedYaml._dynamicProperties.find(
        p => p.renderer === 'common' && p.group === 'label' && p.name === 'text'
      );
      expect(textProp).toBeDefined();
      expect(textProp.value).toBe('Above');
      
      // Math renderer should have formula property
      const formulaProp = transformedYaml._dynamicProperties.find(
        p => p.renderer === 'math' && p.name === 'formula'
      );
      expect(formulaProp).toBeDefined();
      expect(formulaProp.value).toBe('E=mc^2');
    });
    
    test('should not extract any properties from nested renderers', () => {
      // Check legacy method also ignores nested renderers
      const properties = DynamicPropertyYamlReader.loadDynamicProperties(nestedRendererYaml);
      
      // Should only have properties from top-level renderers
      const nestedProps = properties.filter(p => 
        p.renderer === 'nestedRenderer' || 
        p.group.includes('nestedRenderer')
      );
      
      expect(nestedProps.length).toBe(0);
      
      // The same should be true for the transformed result
      const nestedPropsTransformed = transformedYaml._dynamicProperties.filter(p => 
        p.renderer === 'nestedRenderer' || 
        p.group.includes('nestedRenderer')
      );
      
      expect(nestedPropsTransformed.length).toBe(0);
    });
  });

  describe('appending to existing _dynamicProperties', () => {
    test('should append to existing _dynamicProperties array rather than replace it', () => {
      // Create a document with existing _dynamicProperties
      const docWithExistingProps = {
        metadata: { version: '1.0' },
        _dynamicProperties: [
          {
            renderer: 'existing',
            group: 'test',
            name: 'prop1', 
            dataType: 'string',
            value: 'test value',
            isFlag: false,
            groupPathArray: ['test'],
            namePathArray: ['prop1']
          }
        ],
        common: {
          __tag: 'renderer',
          data: {
            testProp: 'value'
          }
        }
      };
      
      // Transform this document
      const transformed = DynamicPropertyYamlReader.transformDocument(docWithExistingProps);
      
      // Should have the existing property
      const existingProp = transformed._dynamicProperties.find(
        p => p.renderer === 'existing' && p.name === 'prop1'
      );
      expect(existingProp).toBeDefined();
      
      // Should also have the new property from the renderer
      const newProp = transformed._dynamicProperties.find(
        p => p.renderer === 'common' && p.name === 'testProp'
      );
      expect(newProp).toBeDefined();
      
      // Should have both properties in the array
      expect(transformed._dynamicProperties.length).toBe(2);
    });
  });
}); 