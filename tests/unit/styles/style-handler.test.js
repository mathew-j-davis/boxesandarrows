const StyleHandler = require('../../../src/styles/style-handler');
const DynamicProperty = require('../../../src/io/models/dynamic-property');

describe('StyleHandler.addStyleProperties', () => {
  let handler;
  beforeEach(() => {
    handler = new StyleHandler({ verbose: false });
  });

  test('no-op when properties is not an array', () => {
    handler.addStyleProperties(null);
    expect(handler.dynamicProperties_unmerged.size).toBe(0);
  });

  test('adds only validated and compatible properties to base style', () => {
    const rawProps = [
      { namePath: 'foo', value: 'val', dataType: 'string' },
      { namePath: 'bar', value: 123, dataType: 'number', renderer: 'latex' }
    ];
    handler.addStyleProperties(rawProps);
    const props = handler.dynamicProperties_unmerged.get('base') || [];
    expect(props).toHaveLength(1);
    const p = props[0];
    expect(p.namePath).toBe('foo');
    expect(p.value).toBe('val');
    expect(p.dataType).toBe('string');
    expect(p.renderer).toBe('common');
  });

  test('appends to specified style name', () => {
    const raw = [{ namePath: 'baz', value: true, dataType: 'boolean' }];
    handler.addStyleProperties(raw, 'customStyle');
    const props = handler.dynamicProperties_unmerged.get('customStyle') || [];
    expect(props).toHaveLength(1);
    expect(props[0].namePath).toBe('baz');
    expect(props[0].dataType).toBe('boolean');
  });
});

describe('StyleHandler.splitByDelimiters', () => {
  let handler;
  beforeEach(() => { handler = new StyleHandler(); });

  test('splits string by comma', () => {
    expect(handler.splitByDelimiters('red,blue,green')).toEqual(['red','blue','green']);
  });
  test('splits string by pipe', () => {
    expect(handler.splitByDelimiters('red|blue|green')).toEqual(['red','blue','green']);
  });
  test('splits string by ampersand', () => {
    expect(handler.splitByDelimiters('red&blue&green')).toEqual(['red','blue','green']);
  });
  test('splits mixed delimiters', () => {
    expect(handler.splitByDelimiters('red,blue|green&yellow')).toEqual(['red','blue','green','yellow']);
  });
  test('trims whitespace', () => {
    expect(handler.splitByDelimiters('red, blue , green')).toEqual(['red','blue','green']);
  });
  test('handles empty input', () => {
    expect(handler.splitByDelimiters('')).toEqual([]);
    expect(handler.splitByDelimiters(null)).toEqual([]);
    expect(handler.splitByDelimiters(undefined)).toEqual([]);
  });
});

describe('StyleHandler.normalizeStyleNames', () => {
  let handler;
  beforeEach(() => { handler = new StyleHandler(); });

  test('adds base to single style name', () => {
    expect(handler.normalizeStyleNames('red')).toEqual(['base','red']);
  });
  test('preserves base if already first', () => {
    expect(handler.normalizeStyleNames('base,red')).toEqual(['base','red']);
  });
  test('adds base to array of style names', () => {
    expect(handler.normalizeStyleNames(['red','bold'])).toEqual(['base','red','bold']);
  });
  test('handles empty input', () => {
    expect(handler.normalizeStyleNames(null)).toEqual(['base']);
    expect(handler.normalizeStyleNames('')).toEqual(['base']);
    expect(handler.normalizeStyleNames([])).toEqual(['base']);
  });
  test('preserves spaces in style names', () => {
    expect(handler.normalizeStyleNames('light blue')).toEqual(['base','light blue']);
  });
  test('filters invalid style names', () => {
    expect(handler.normalizeStyleNames('valid,123invalid,also-invalid')).toEqual(['base','valid']);
  });
  test('processes comma-separated styles in array elements', () => {
    expect(handler.normalizeStyleNames(['red,bold','green'])).toEqual(['base','red','bold','green']);
  });
  test('returns only base if all style names invalid', () => {
    expect(handler.normalizeStyleNames('123invalid,also-invalid')).toEqual(['base']);
  });
});

describe('StyleHandler.prepareStyle', () => {
  let handler;
  const propA = { namePathArray: ['keyA'], clear: false };
  const propB = { namePathArray: ['keyB'], clear: false };

  beforeEach(() => {
    handler = new StyleHandler();
    handler.dynamicProperties_unmerged.set('a', [propA]);
    handler.dynamicProperties_unmerged.set('b', [propB]);
  });

  test('merges properties from single style', () => {
    const merged = handler.prepareStyle(['a']);
    expect(merged).toEqual([propA]);
    expect(handler.dynamicProperties_merged_stacks.get(JSON.stringify(['a']))).toBe(merged);
  });

  test('merges and caches multiple styles in order', () => {
    const merged = handler.prepareStyle(['a','b']);
    expect(merged).toEqual([propA, propB]);
    expect(handler.dynamicProperties_merged_stacks.get(JSON.stringify(['a','b']))).toBe(merged);
  });

  test('empty stack yields empty array', () => {
    const merged = handler.prepareStyle([]);
    expect(merged).toEqual([]);
  });

  test('returns empty array for invalid input', () => {
    const merged = handler.prepareStyle('a');
    expect(merged).toEqual([]);
  });
});

describe('StyleHandler.prepareStyleWithNamesString', () => {
  let handler;
  const baseProp = { namePathArray: ['base'], clear: false };
  const aProp = { namePathArray: ['a'], clear: false };
  const bProp = { namePathArray: ['b'], clear: false };

  beforeEach(() => {
    handler = new StyleHandler();
    handler.dynamicProperties_unmerged.set('base', [baseProp]);
    handler.dynamicProperties_unmerged.set('a', [aProp]);
    handler.dynamicProperties_unmerged.set('b', [bProp]);
  });

  test('merges properties for comma-separated string', () => {
    const merged = handler.prepareStyleWithNamesString('a,b');
    expect(merged).toEqual([baseProp, aProp, bProp]);
  });

  test('merges properties for mixed delimiters and trims', () => {
    const merged = handler.prepareStyleWithNamesString(' a | b & ');
    expect(merged).toEqual([baseProp, aProp, bProp]);
  });

  test('handles empty string as base only', () => {
    const merged = handler.prepareStyleWithNamesString('');
    expect(merged).toEqual([baseProp]);
  });

  test('handles null input as base only', () => {
    const merged = handler.prepareStyleWithNamesString(null);
    expect(merged).toEqual([baseProp]);
  });
});

describe('StyleHandler.getStyle', () => {
  let handler;
  const { property: fooProp } = DynamicProperty.createValidated({ namePath: 'foo', value: 'v1' });
  const { property: barProp } = DynamicProperty.createValidated({ namePath: 'bar', value: 'v2' });

  beforeEach(() => {
    handler = new StyleHandler();
    handler.dynamicProperties_unmerged.set('foo', [fooProp]);
    handler.dynamicProperties_unmerged.set('bar', [barProp]);
  });

  test('returns hierarchical object for single style array', () => {
    const result = handler.getStyle(['foo']);
    expect(result).toEqual({ foo: 'v1' });
  });

  test('returns hierarchical object for multiple style array', () => {
    const result = handler.getStyle(['foo', 'bar']);
    expect(result).toEqual({ foo: 'v1', bar: 'v2' });
  });

  test('empty array returns empty object', () => {
    expect(handler.getStyle([])).toEqual({});
  });

  test('invalid input returns empty object', () => {
    expect(handler.getStyle('foo')).toEqual({});
  });
});

describe('StyleHandler.getStyleWithNamesString', () => {
  let handler;
  const { property: fooProp } = DynamicProperty.createValidated({ namePath: 'foo', value: 'v1' });
  const { property: barProp } = DynamicProperty.createValidated({ namePath: 'bar', value: 'v2' });

  beforeEach(() => {
    handler = new StyleHandler();
    handler.dynamicProperties_unmerged.set('foo', [fooProp]);
    handler.dynamicProperties_unmerged.set('bar', [barProp]);
  });

  test('parses comma-separated names and returns hierarchical object', () => {
    expect(handler.getStyleWithNamesString('foo,bar')).toEqual({ foo: 'v1', bar: 'v2' });
  });

  test('parses mixed delimiters and trims', () => {
    expect(handler.getStyleWithNamesString(' foo | bar & ')).toEqual({ foo: 'v1', bar: 'v2' });
  });

  test('empty string returns empty object', () => {
    expect(handler.getStyleWithNamesString('')).toEqual({});
  });

  test('null returns empty object', () => {
    expect(handler.getStyleWithNamesString(null)).toEqual({});
  });
});
