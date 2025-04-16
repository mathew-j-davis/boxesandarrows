const DynamicPropertyYamlReader = require('../../../src/io/readers/dynamic-property-yaml-reader');

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
  label:
    text:
      above: 
        font: Arial
        size: 12
        visible: true
  arrows: 
    start: 
      fill:
        color: black
    width: 1.5

# Another regular section
settings:
  theme: dark
  language: en-US

# Another renderer
latex: !renderer
  draw: 
    pattern: !flag dashed
    visible1: ~
    visible2: null
`;

  // Example YAML with nested renderer tags (which should be ignored)
  const nestedRendererYaml = `
---
# Top-level renderer (should be processed)
common: !renderer
  label:
    text: Above

# Nested renderer tags (should be ignored)
settings:
  theme: dark
  nestedRenderer: !renderer
    ignored: true
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
        p => p.renderer === 'common' && p.namePath === 'label.text.above.font'
      );
      expect(fontProp).toBeDefined();
      expect(fontProp.value).toBe('Arial');
      
      const colorProp = transformedYaml._dynamicProperties.find( p => p.renderer === 'common' && p.namePath === 'arrows.start.fill.color'
      );
      expect(colorProp).toBeDefined();
    expect(colorProp.value).toBe('black');
    
      // Test flag property
      const flagProp = transformedYaml._dynamicProperties.find(
        p => p.renderer === 'latex' && p.namePath === 'draw.pattern'
      );
      expect(flagProp).toBeDefined();
      expect(flagProp.isFlag).toBe(true);
      expect(flagProp.value).toBe('dashed');
      
      // Test null values
      const nullProp1 = transformedYaml._dynamicProperties.find(
        p => p.renderer === 'latex' && p.namePath === 'draw.visible1'
      );
      const nullProp2 = transformedYaml._dynamicProperties.find(
        p => p.renderer === 'latex' && p.namePath === 'draw.visible2'
      );
      expect(nullProp1).toBeDefined();
      expect(nullProp2).toBeDefined();
      expect(nullProp1.value).toBeNull();
      expect(nullProp2.value).toBeNull();
    });
    
    
    test('should correctly format property objects with all required fields', () => {
      // Check property structure
      const commonProps = transformedYaml._dynamicProperties.filter(p => p.renderer === 'common');
      commonProps.forEach(prop => {
        expect(prop.renderer).toBe('common');
        expect(prop.namePath).toBeDefined();
        expect(prop.dataType).toBeDefined();
        expect('value' in prop).toBe(true);
        expect('isFlag' in prop).toBe(true);
        expect(Array.isArray(prop.namePathArray)).toBe(true);
      });
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
            namePath: 'prop1', 
            dataType: 'string',
            value: 'test value',
            isFlag: false,
            namePathArray: ['prop1']
          }
        ],
        common: {
          __tag: 'renderer',
          __data: {
            testProp: 'value'
          }
        }
      };
      
      // Transform this document
      const transformed = DynamicPropertyYamlReader.transformDocument(docWithExistingProps);
      
      // Should have the existing property
      const existingProp = transformed._dynamicProperties.find(
        p => p.renderer === 'existing' && p.namePath === 'prop1'
      );
      expect(existingProp).toBeDefined();
      
      // Should also have the new property from the renderer
      const newProp = transformed._dynamicProperties.find(
        p => p.renderer === 'common' && p.namePath === 'testProp'
      );
      expect(newProp).toBeDefined();
      
      // Should have both properties in the array
      expect(transformed._dynamicProperties.length).toBe(3);
    });
  });
});