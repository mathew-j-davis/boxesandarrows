# StyleHandler Entry Points Analysis

## Date: 2025-04-23

## Purpose
Document every entry point where code calls into the `StyleHandler` API, to aid refactoring, testing, and instrumentation.

## Entry Points

1. **Instantiation**
   - In each renderer’s constructor:
     ```js
     this.styleHandler = new LatexStyleHandler(options);
     ```
   - Located in `src/renderers/*-renderer.js`

2. **Merging external style definitions**
   - In `diagram-builder.js`:
     ```js
     this.renderer.styleHandler.mergeStylesheet(styleRecord);
     ```
   - In `reader-manager.js`:
     ```js
     styleHandler.processYamlDocuments(styleDocuments);
     ```

3. **Dynamic‑property resolution**
   - In `src/styles/style-resolver.js`:
     ```js
     this.styleHandler.getDynamicPropertiesForStyle(styleName);
     ```

4. **Complete style fetch**
   - API: `getCompleteStyle(styleName, styleType, category[, specificCategory])`
   - Used extensively in `latex-renderer.js` and `edge-reader.js` to retrieve cascaded styles.

5. **Attribute lookup**
   - API: `getStyleAttribute(category, styleName, attributePath, defaultValue)`
   - E.g. for anchor placement in `latex-renderer.js`.

6. **Auxiliary utilities**
   - `registerColor(color)`
   - `processAttributes(obj)`
   - `applyLatexFormatting(text, textStyle)`
   - `getColorDefinitions()`
   - Page layout: `getPageMargin()`, `getPageScale()`

## Impact
This catalog provides a single reference for where and how the styling pipeline is invoked, enabling consistent enhancements and coverage tests.

## Next Steps
- Add descriptive logging around each call.
- Write unit tests to cover all entry points.
- Standardize argument ordering and defaults where possible.
