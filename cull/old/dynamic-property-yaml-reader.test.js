const DynamicPropertyYamlReader = require('../src/io/readers/dynamic-property-yaml-reader-simplified');

describe('DynamicPropertyYamlReader', () => {
  // Sample YAML content for testing
  const sampleYaml = `
---
# Regular data (not a renderer)
metadata:
  version: 1.0
  author: Test User

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

# Another renderer
latex: !renderer
  draw: !group
    pattern: !flag dashed
    visible1: ~
    visible2: null
`;

  describe('loadFromYaml', () => {
    test('should parse and transform YAML content', () => {
      const result = DynamicPropertyYamlReader.loadFromYaml(sampleYaml);
      
      // Should return a non-null object
      expect(result).not.toBeNull();
      expect(typeof result).toBe('object');
      
      // Should keep non-renderer properties as is
      expect(result.metadata).toBeDefined();
      expect(result.metadata.version).toBe(1.0);
      expect(result.settings).toBeDefined();
      expect(result.settings.theme).toBe('dark');
      
      // Should transform renderer properties
      expect(result._common).toBeDefined();
      expect(result._latex).toBeDefined();
      expect(result.common).toBeUndefined(); // Original key should be removed
      expect(result.latex).toBeUndefined(); // Original key should be removed
    });
    
    test('should handle empty YAML content', () => {
      const result = DynamicPropertyYamlReader.loadFromYaml('');
      expect(result).not.toBeNull();
    });
    
    test('should handle invalid YAML content', () => {
      const result = DynamicPropertyYamlReader.loadFromYaml('invalid: yaml: ::::');
      expect(result).toBeNull();
    });
    
    test('should return array for multi-document YAML', () => {
      const multiDocYaml = `
---
doc1: value1
---
doc2: value2
`;
      const result = DynamicPropertyYamlReader.loadFromYaml(multiDocYaml);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });
  });
  
  describe('transformDocument', () => {
    test('should transform renderer objects in document', () => {
      // Parse with js-yaml first to get the intermediate structure
      const schema = DynamicPropertyYamlReader.getSchema();
      const doc = require('js-yaml').load(sampleYaml, { schema });
      
      // Transform the document
      const transformed = DynamicPropertyYamlReader.transformDocument(doc);
      
      // Check structure
      expect(transformed._common).toBeDefined();
      expect(transformed._common.properties).toBeDefined();
      expect(Array.isArray(transformed._common.properties)).toBe(true);
      expect(transformed._common.properties.length).toBeGreaterThan(0);
    });
    
    test('should handle null or non-object documents', () => {
      expect(DynamicPropertyYamlReader.transformDocument(null)).toBeNull();
      expect(DynamicPropertyYamlReader.transformDocument('string')).toBe('string');
      expect(DynamicPropertyYamlReader.transformDocument(123)).toBe(123);
    });
  });
  
  describe('_common properties array structure', () => {
    test('should correctly structure properties in _common', () => {
      const result = DynamicPropertyYamlReader.loadFromYaml(sampleYaml);
      const commonProps = result._common.properties;
      
      // We should have properties
      expect(commonProps.length).toBeGreaterThan(0);
      
      // Each property should have the expected structure
      commonProps.forEach(prop => {
        expect(prop.renderer).toBe('common');
        expect(prop.name).toBeDefined();
        expect(prop.group).toBeDefined();
        expect(prop.dataType).toBeDefined();
        expect('value' in prop).toBe(true);
        expect('isFlag' in prop).toBe(true);
      });
      
      // Check a specific property (label.text.above.font)
      const fontProp = commonProps.find(p => 
        p.group === 'label.text' && p.name === 'above.font'
      );
      expect(fontProp).toBeDefined();
      expect(fontProp.value).toBe('Arial');
      expect(fontProp.dataType).toBe('string');
    });
  });
  
  describe('null handling', () => {
    test('should handle null values correctly', () => {
      const result = DynamicPropertyYamlReader.loadFromYaml(sampleYaml);
      const latexProps = result._latex.properties;
      
      // Find the null properties
      const nullProp1 = latexProps.find(p => p.name === 'visible1');
      const nullProp2 = latexProps.find(p => p.name === 'visible2');
      
      expect(nullProp1).toBeDefined();
      expect(nullProp2).toBeDefined();
      expect(nullProp1.value).toBeNull();
      expect(nullProp2.value).toBeNull();
    });
  });
  
  describe('flag handling', () => {
    test('should mark flag properties correctly', () => {
      const result = DynamicPropertyYamlReader.loadFromYaml(sampleYaml);
      const latexProps = result._latex.properties;
      
      // Find the flag property
      const flagProp = latexProps.find(p => p.name === 'pattern');
      
      expect(flagProp).toBeDefined();
      expect(flagProp.isFlag).toBe(true);
      expect(flagProp.value).toBe('dashed');
    });
  });
  
  describe('loadDynamicProperties (legacy method)', () => {
    test('should extract all properties into a flat array', () => {
      const properties = DynamicPropertyYamlReader.loadDynamicProperties(sampleYaml);
      
      // Should be a non-empty array
      expect(Array.isArray(properties)).toBe(true);
      expect(properties.length).toBeGreaterThan(0);
      
      // Each property should have the correct structure
      properties.forEach(prop => {
        expect(prop.renderer).toBeDefined();
        expect(prop.name).toBeDefined();
        expect(prop.group).toBeDefined();
        expect(prop.dataType).toBeDefined();
        expect('value' in prop).toBe(true);
      });
      
      // Count properties by renderer
      const commonProps = properties.filter(p => p.renderer === 'common');
      const latexProps = properties.filter(p => p.renderer === 'latex');
      
      expect(commonProps.length).toBeGreaterThan(0);
      expect(latexProps.length).toBeGreaterThan(0);
    });
  });
  
  describe('consistency between new and legacy methods', () => {
    test('should have consistent property data between both APIs', () => {
      const transformedResult = DynamicPropertyYamlReader.loadFromYaml(sampleYaml);
      const legacyProperties = DynamicPropertyYamlReader.loadDynamicProperties(sampleYaml);
      
      // Combine properties from transformed result
      const combinedProps = [
        ...transformedResult._common.properties,
        ...transformedResult._latex.properties
      ];
      
      // Should have the same number of properties
      expect(combinedProps.length).toBe(legacyProperties.length);
      
      // Every legacy property should have a match in the combined properties
      legacyProperties.forEach(legacyProp => {
        const matchingProp = combinedProps.find(p => 
          p.renderer === legacyProp.renderer && 
          p.name === legacyProp.name && 
          p.group === legacyProp.group
        );
        
        expect(matchingProp).toBeDefined();
        expect(matchingProp.value).toEqual(legacyProp.value);
        expect(matchingProp.dataType).toBe(legacyProp.dataType);
        expect(matchingProp.isFlag).toBe(legacyProp.isFlag);
      });
    });
  });
}); 