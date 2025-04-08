const DynamicPropertyYamlReader = require('../../../cull/dynamic-property-yaml-reader');
const fs = require('fs');
const path = require('path');

describe('DynamicPropertyYamlReader', () => {
  // Test basic property parsing
  test('should parse basic properties with different data types', () => {
    const yamlContent = `
---
common: !renderer
  label: !group
    font: !string Arial
    size: !float 12
    visible: !bool true
  arrows: !group
    color: black
    width: 1.5
---
`;

    const properties = DynamicPropertyYamlReader.loadDynamicProperties(yamlContent);
    
    // Check number of properties
    expect(properties.length).toBe(5);
    
    // Check string property
    const fontProp = properties.find(p => 
      p.renderer === 'common' && p.group === 'label' && p.name === 'font'
    );
    expect(fontProp).toBeTruthy();
    expect(fontProp.dataType).toBe('string');
    expect(fontProp.value).toBe('Arial');
    expect(fontProp.groupPathArray).toEqual(['label']);
    expect(fontProp.namePathArray).toEqual(['font']);
    expect(fontProp.isFlag).toBe(false);
    
    // Check float property
    const sizeProp = properties.find(p => 
      p.renderer === 'common' && p.group === 'label' && p.name === 'size'
    );
    expect(sizeProp).toBeTruthy();
    expect(sizeProp.dataType).toBe('float');
    expect(sizeProp.value).toBe(12);
    
    // Check boolean property
    const visibleProp = properties.find(p => 
      p.renderer === 'common' && p.group === 'label' && p.name === 'visible'
    );
    expect(visibleProp).toBeTruthy();
    expect(visibleProp.dataType).toBe('boolean');
    expect(visibleProp.value).toBe(true);
    
    // Check auto-detected string
    const colorProp = properties.find(p => 
      p.renderer === 'common' && p.group === 'arrows' && p.name === 'color'
    );
    expect(colorProp).toBeTruthy();
    expect(colorProp.dataType).toBe('string');
    expect(colorProp.value).toBe('black');
    
    // Check auto-detected float
    const widthProp = properties.find(p => 
      p.renderer === 'common' && p.group === 'arrows' && p.name === 'width'
    );
    expect(widthProp).toBeTruthy();
    expect(widthProp.dataType).toBe('float');
    expect(widthProp.value).toBe(1.5);
  });

  // Test flag properties
  test('should handle flag properties correctly', () => {
    const yamlContent = `
---
latex: !renderer
  draw: !group
    pattern: !flag dashed
    visible: !flag
---
`;

    const properties = DynamicPropertyYamlReader.loadDynamicProperties(yamlContent);
    
    // Check flag with value
    const patternProp = properties.find(p => 
      p.renderer === 'latex' && p.group === 'draw' && p.name === 'pattern'
    );
    expect(patternProp).toBeTruthy();
    expect(patternProp.isFlag).toBe(true);
    expect(patternProp.dataType).toBe('string');
    expect(patternProp.value).toBe('dashed');
    
    // Check flag without value
    const visibleProp = properties.find(p => 
      p.renderer === 'latex' && p.group === 'draw' && p.name === 'visible'
    );
    expect(visibleProp).toBeTruthy();
    expect(visibleProp.isFlag).toBe(true);
    expect(visibleProp.dataType).toBe('string');
    expect(visibleProp.value).toBeUndefined();
  });

  // Test nested groups
  test('should handle nested groups correctly', () => {
    const yamlContent = `
---
latex: !renderer
  draw: !group
    pattern: !group
      style: !group
        line: !string double
        color: !string blue
---
`;

    const properties = DynamicPropertyYamlReader.loadDynamicProperties(yamlContent);
    
    // Check deeply nested property
    const lineProp = properties.find(p => 
      p.renderer === 'latex' && 
      p.group === 'draw.pattern.style' && 
      p.name === 'line'
    );
    expect(lineProp).toBeTruthy();
    expect(lineProp.dataType).toBe('string');
    expect(lineProp.value).toBe('double');
    
    // Check group path array
    expect(lineProp.groupPathArray).toEqual(['draw', 'pattern', 'style']);
    
    // Check the other nested property
    const colorProp = properties.find(p => 
      p.renderer === 'latex' && 
      p.group === 'draw.pattern.style' && 
      p.name === 'color'
    );
    expect(colorProp).toBeTruthy();
    expect(colorProp.dataType).toBe('string');
    expect(colorProp.value).toBe('blue');
  });

  // Test multiple renderers in the same document
  test('should handle multiple renderers in one document', () => {
    const yamlContent = `
---
common: !renderer
  label: !group
    font: !string Arial

latex: !renderer
  draw: !group
    style: !string dashed
---
`;

    const properties = DynamicPropertyYamlReader.loadDynamicProperties(yamlContent);
    
    // Check common renderer property
    const fontProp = properties.find(p => 
      p.renderer === 'common' && p.group === 'label' && p.name === 'font'
    );
    expect(fontProp).toBeTruthy();
    expect(fontProp.value).toBe('Arial');
    
    // Check latex renderer property
    const styleProp = properties.find(p => 
      p.renderer === 'latex' && p.group === 'draw' && p.name === 'style'
    );
    expect(styleProp).toBeTruthy();
    expect(styleProp.value).toBe('dashed');
  });

  // Test auto-detection of numeric and boolean types
  test('should auto-detect numeric and boolean types', () => {
    const yamlContent = `
---
common: !renderer
  options: !group
    integer_value: 42
    float_value: 3.14
    boolean_true: true
    boolean_false: false
---
`;

    const properties = DynamicPropertyYamlReader.loadDynamicProperties(yamlContent);
    
    // Check integer
    const intProp = properties.find(p => p.name === 'integer_value');
    expect(intProp).toBeTruthy();
    expect(intProp.dataType).toBe('integer');
    expect(intProp.value).toBe(42);
    
    // Check float
    const floatProp = properties.find(p => p.name === 'float_value');
    expect(floatProp).toBeTruthy();
    expect(floatProp.dataType).toBe('float');
    expect(floatProp.value).toBe(3.14);
    
    // Check boolean true
    const trueProp = properties.find(p => p.name === 'boolean_true');
    expect(trueProp).toBeTruthy();
    expect(trueProp.dataType).toBe('boolean');
    expect(trueProp.value).toBe(true);
    
    // Check boolean false
    const falseProp = properties.find(p => p.name === 'boolean_false');
    expect(falseProp).toBeTruthy();
    expect(falseProp.dataType).toBe('boolean');
    expect(falseProp.value).toBe(false);
  });

  // Test multiple documents
  test('should process properties from multiple documents', () => {
    const yamlContent = `
---
common: !renderer
  base: !group
    color: !string black
---
common: !renderer
  base: !group
    size: !float 12
---
latex: !renderer
  draw: !group
    pattern: !string dashed
`;

    const properties = DynamicPropertyYamlReader.loadDynamicProperties(yamlContent);
    
    // Should have 3 properties from all documents
    expect(properties.length).toBe(3);
    
    // Check first document property
    const colorProp = properties.find(p => 
      p.renderer === 'common' && p.group === 'base' && p.name === 'color'
    );
    expect(colorProp).toBeTruthy();
    expect(colorProp.value).toBe('black');
    
    // Check second document property
    const sizeProp = properties.find(p => 
      p.renderer === 'common' && p.group === 'base' && p.name === 'size'
    );
    expect(sizeProp).toBeTruthy();
    expect(sizeProp.value).toBe(12);
    
    // Check third document property
    const patternProp = properties.find(p => 
      p.renderer === 'latex' && p.group === 'draw' && p.name === 'pattern'
    );
    expect(patternProp).toBeTruthy();
    expect(patternProp.value).toBe('dashed');
  });
});
