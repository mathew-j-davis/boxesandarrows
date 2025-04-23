# Merge StyleResolver into StyleHandler

## Date: 2025-04-23

## Overview

Consolidate the separate `StyleResolver` logic into the `StyleHandler` class to:
- Remove the extra dependency and class
- Centralize all style-normalization, caching, and dynamic-property merging
- Simplify the styling API

## Changes

1. **New cache**: Add `resolvedStylesCache` in `StyleHandler` to memoize merged dynamic-property arrays.
2. **Method inlining**:
   - Copy `splitByDelimiters(input)`, `normalizeStyleNames(styleNames)`, and `resolveStyles(styleNames)` from `StyleResolver` into `StyleHandler`.
   - Adjust `resolveStyles` to read raw properties directly from `this.dynamicProperties`.
3. **API adaptation**:
   - Modify `getDynamicPropertiesForStyle(styleName)` to call the new `resolveStyles(styleName)` method.
   - Remove any external instantiation or import of `StyleResolver`.
4. **Cleanup**: Mark `style-resolver.js` for removal once migration is verified.

## Next Steps

- Implement in one edit in `style-handler.js`.
- Update or remove `style-resolver.js` file.
- Adjust tests to cover normalization and caching edge cases.
