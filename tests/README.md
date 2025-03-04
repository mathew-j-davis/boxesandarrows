# Tests for BoxesAndArrows

This directory contains automated tests for the BoxesAndArrows project.

## Running Tests

To run all tests:

```bash
npm test
```

To run tests in watch mode (tests re-run when files change):

```bash
npm run test:watch
```

To generate a test coverage report:

```bash
npm run test:coverage
```

## Test Structure

- `tests/unit/`: Contains unit tests for individual components
  - `tests/unit/styles/`: Tests for style-related functionality
  - `tests/unit/io/`: Tests for file I/O classes including readers
- `tests/integration/`: Tests how components work together

## Testing Strategy

1. **Unit Tests**: Test individual functions and classes in isolation
   - Use mocks for dependencies
   - Focus on edge cases and error handling

2. **Integration Tests**: Test how components work together
   - Focus on the interactions between systems
   - May use real implementations rather than mocks

## Current Test Coverage

- Style handling:
  - Parsing TikZ attributes
  - Processing and registering colors
  - Style cascading and merging
  
- Node/Edge processing:
  - Position and size calculation
  - Style application from various sources
  - Attribute processing

## Adding New Tests

1. Place unit tests in the appropriate subdirectory under `tests/unit/`
2. Place integration tests in `tests/integration/`
3. Name test files with `.test.js` or `.spec.js` suffix
4. Follow the existing patterns for structuring test files:
   - Use `describe` blocks to group related tests
   - Use `beforeEach` to set up common test fixtures
   - Use clear, descriptive test names

## Test Helpers

No test helpers have been implemented yet. As the test suite grows, common testing utilities should be added to `tests/helpers/` directory. 