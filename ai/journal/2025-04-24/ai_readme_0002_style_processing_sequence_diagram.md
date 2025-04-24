# Style Processing Sequence Flow Analysis

## Overview

This document provides an analysis of the current flow in the `readerManager.processStyleFiles()` method, specifically how it handles the different paths for JSON and YAML files. Understanding this flow is crucial for our refactoring efforts with the new PropertyProcessor architecture.

## Current Sequence Flow

The diagram below shows the sequence of calls starting from the hierarchy-poc.js script with the line:

```javascript
styleRecords = await readerManager.processStyleFiles([filePath], handler);
```

```
hierarchy-poc.js           ReaderManager                StyleReader               DynamicPropertyYamlReader         StyleHandler
      |                        |                            |                              |                              |
      | processStyleFiles([filePath], handler)             |                              |                              |
      |---------------------→|                             |                              |                              |
      |                      | determine file extension    |                              |                              |
      |                      |-------------------+         |                              |                              |
      |                      |                   |         |                              |                              |
      |                      |←------------------+         |                              |                              |
      |                      |                             |                              |                              |
      |                      |                             |                              |                              |
      |                      |                             |                              |                              |
IF file is JSON:            |                             |                              |                              |
      |                      | readFromJson(file)         |                              |                              |
      |                      |---------------------------→|                              |                              |
      |                      |                            | read JSON file content       |                              |
      |                      |                            |------------------+           |                              |
      |                      |                            |                  |           |                              |
      |                      |                            |←-----------------+           |                              |
      |                      |                            |                              |                              |
      |                      |                            | transformJsonDocument(pageAndStyleData)                     |
      |                      |                            |-------------------------------------------→|                |
      |                      |                            |                              | transform JSON objects       |
      |                      |                            |                              |----------+                   |
      |                      |                            |                              |          |                   |
      |                      |                            |                              |←---------+                   |
      |                      |                            |                              |                              |
      |                      |                            |←------------------------------------------+                 |
      |                      |                            |                              |                              |
      |                      |←----------------------------| return transformed docs     |                              |
      |                      |                             |                             |                              |
      |                      | processYamlDocuments(pageAndStyleDocuments)               |                              |
      |                      |--------------------------------------------------------------------------→|              |
      |                      |                             |                             |               | process docs  |
      |                      |                             |                             |               |--------+      |
      |                      |                             |                             |               |        |      |
      |                      |                             |                             |               |←-------+      |
      |                      |←--------------------------------------------------------------------------| return styles |
      |                      |                             |                             |               |               |
      |                      |                             |                             |               |               |
IF file is YAML:            |                             |                             |               |               |
      |                      | readFromYaml(file)         |                             |               |               |
      |                      |---------------------------→|                             |               |               |
      |                      |                            | readFile(yamlFile, filterOptions)           |               |
      |                      |                            |------------------------------------------→|                 |
      |                      |                            |                             | read and filter YAML          |
      |                      |                            |                             |----------+                    |
      |                      |                            |                             |          |                    |
      |                      |                            |                             |←---------+                    |
      |                      |                            |←------------------------------------------+                 |
      |                      |                            |                             |                               |
      |                      |                            | map(doc => transformDocument(doc))                          |
      |                      |                            |------------------------------------------→|                 |
      |                      |                            |                             | transform each doc            |
      |                      |                            |                             |----------+                    |
      |                      |                            |                             |          |                    |
      |                      |                            |                             |←---------+                    |
      |                      |                            |←------------------------------------------+                 |
      |                      |←----------------------------|                            |                               |
      |                      |                             |                            |                               |
      |                      | processYamlDocuments(styleDocuments)                     |                               |
      |                      |--------------------------------------------------------------------------→|              |
      |                      |                             |                            |                | process docs  |
      |                      |                             |                            |                |--------+      |
      |                      |                             |                            |                |        |      |
      |                      |                             |                            |                |←-------+      |
      |                      |←--------------------------------------------------------------------------|              |
      |                      |                             |                            |                               |
      |←---------------------|                             |                            |                               |
      |                      |                             |                            |                               |
```

## Key Differences Between JSON and YAML Paths

### JSON Processing Path

1. ReaderManager detects a JSON file extension
2. Calls `StyleReader.readFromJson(file)` which:
   - Reads the JSON file content
   - Parses the JSON content
   - Ensures proper structure (wraps in { style: ... } if needed)
   - Calls `DynamicPropertyYamlReader.transformJsonDocument()` to transform the object
   - Returns an array of transformed documents
3. ReaderManager then calls `styleHandler.processYamlDocuments()` on these documents
4. The processed styles are collected and returned

The JSON transformation is handled by `transformJsonDocument()`, which:
- Extracts page configuration into a separate document with `type: 'page'`
- Extracts each style into a document with `type: 'style'` and `name: [styleName]`
- Transforms each extracted document with `_transformDocumentInternal()`

### YAML Processing Path

1. ReaderManager detects a YAML file extension
2. Calls `StyleReader.readFromYaml(file)` which:
   - Calls `DynamicPropertyYamlReader.readFile()` with a filter for 'style' and 'page' documents
   - This reads, parses, and filters the YAML documents
   - Then maps each document through `transformDocument()`
   - Returns an array of transformed documents
3. ReaderManager then calls `styleHandler.processYamlDocuments()` on these documents
4. The processed styles are collected and returned

The YAML parsing uses custom YAML tags (!renderer, !flag, !clear) and its transformation happens document by document rather than on the whole structure at once.

## Common Processing

Both paths converge at `styleHandler.processYamlDocuments()`, which:
- Processes each document based on its `type` property
- For 'page' documents, wraps them in `{ page: doc }`
- For 'style' documents, extracts the style name and wraps them in `{ style: { [styleName]: styleData } }`
- Returns an array of processed records

## Implications for Refactoring

The new PropertyProcessor architecture will need to accommodate both these paths:

1. For the JSON path:
   - PropertyReader.readJsonFile should replace DynamicPropertyYamlReader.transformJsonDocument
   - StyleDocumentHandler.extractDocumentsFromJson should handle the document extraction

2. For the YAML path:
   - PropertyReader.readYamlFile should replace DynamicPropertyYamlReader.readFile
   - PropertyProcessor.transformDocument should handle the individual document transformations

The refactoring needs to ensure that after processing, both paths produce output compatible with the existing `styleHandler.processYamlDocuments()` method, or we'll need to update that method as well.

## Next Steps

1. Implement the new PropertyReader and PropertyProcessor classes
2. Update ReaderManager.processStyleFiles to use the new classes
3. Ensure compatibility with StyleHandler.processYamlDocuments
4. Add unit tests for both processing paths
5. Update the hierarchy-poc.js script if needed
