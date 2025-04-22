const StyleResolver = require('../../src/styles/style-resolver');

describe('StyleResolver', () => {
  let mockStyleHandler;
  let styleResolver;

  beforeEach(() => {
    // Create a mock style handler for testing
    mockStyleHandler = {
      getDynamicPropertiesForStyle: jest.fn(styleName => {
        // Return mock dynamic properties based on style name
        if (styleName === 'base') {
          return [{ name: 'baseProperty', value: 'baseValue' }];
        } else if (styleName === 'red') {
          return [{ name: 'colorProperty', value: 'red' }];
        } else if (styleName === 'bold') {
          return [{ name: 'weightProperty', value: 'bold' }];
        } else if (styleName === 'clear') {
          return [{ clear: true }];
        } else {
          return [];
        }
      })
    };

    styleResolver = new StyleResolver(mockStyleHandler);
  });

  describe('splitByDelimiters', () => {
    test('splits string by comma', () => {
      expect(styleResolver.splitByDelimiters('red,blue,green')).toEqual(['red', 'blue', 'green']);
    });

    test('splits string by pipe', () => {
      expect(styleResolver.splitByDelimiters('red|blue|green')).toEqual(['red', 'blue', 'green']);
    });

    test('splits string by ampersand', () => {
      expect(styleResolver.splitByDelimiters('red&blue&green')).toEqual(['red', 'blue', 'green']);
    });

    test('splits string by mixed delimiters', () => {
      expect(styleResolver.splitByDelimiters('red,blue|green&yellow')).toEqual(['red', 'blue', 'green', 'yellow']);
    });

    test('trims whitespace', () => {
      expect(styleResolver.splitByDelimiters('red, blue , green')).toEqual(['red', 'blue', 'green']);
    });

    test('handles empty input', () => {
      expect(styleResolver.splitByDelimiters('')).toEqual([]);
      expect(styleResolver.splitByDelimiters(null)).toEqual([]);
      expect(styleResolver.splitByDelimiters(undefined)).toEqual([]);
    });
  });

  describe('normalizeStyleNames', () => {
    test('adds base to single style name', () => {
      expect(styleResolver.normalizeStyleNames('red')).toEqual(['base', 'red']);
    });

    test('preserves base if already first', () => {
      expect(styleResolver.normalizeStyleNames('base,red')).toEqual(['base', 'red']);
    });

    test('adds base to array of style names', () => {
      expect(styleResolver.normalizeStyleNames(['red', 'bold'])).toEqual(['base', 'red', 'bold']);
    });

    test('handles empty input', () => {
      expect(styleResolver.normalizeStyleNames(null)).toEqual(['base']);
      expect(styleResolver.normalizeStyleNames('')).toEqual(['base']);
      expect(styleResolver.normalizeStyleNames([])).toEqual(['base']);
    });

    test('preserves spaces in style names', () => {
      expect(styleResolver.normalizeStyleNames('light blue')).toEqual(['base', 'light blue']);
    });

    test('filters invalid style names', () => {
      expect(styleResolver.normalizeStyleNames('valid,123invalid,also-invalid')).toEqual(['base', 'valid']);
    });

    test('processes comma-separated styles in array elements', () => {
      expect(styleResolver.normalizeStyleNames(['red,bold', 'green'])).toEqual(['base', 'red', 'bold', 'green']);
    });
    
    test('returns only base if all style names are invalid', () => {
      expect(styleResolver.normalizeStyleNames('123invalid,also-invalid')).toEqual(['base']);
    });
  });
});
