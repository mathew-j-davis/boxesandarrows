# File Support Flows

## Node Loading
```
│
├─► DiagramBuilder.loadNodes(filePath)  
│   │
│   ├─► Detect file type (YAML/CSV)  
│   │
│   ├─► If YAML:  
│   │   │
│   │   └─► NodeReader.readFromYaml  
│   │       │
│   │       ├─► DynamicPropertyYamlReader.readFile  
│   │       │   │
│   │       │   ├─► Validate document type='node'  
│   │       │   │
│   │       │   └─► Transform document structure  
│   │       │
│   │       └─► Process each node document  
│   │           │
│   │           ├─► NodeReader.processNodeRecord  
│   │           │   │
│   │           │   ├─► Parse geometric properties:  
│   │           │   │   ├─► x/y coordinates  
│   │           │   │   └─► width/height dimensions  
│   │           │   │
│   │           │   ├─► Extract style references  
│   │           │   │
│   │           │   └─► Collect dynamic properties:  
│   │           │       ├─► Scan for keys starting with '_'  
│   │           │       └─► Parse via DynamicPropertyParser  
│   │           │
│   │           └─► new Node(...)  
│   │               │
│   │               └─► Add to diagram.nodes Map  
│   │
│   └─► If CSV:  
│       │
│       └─► NodeReader.readFromCsv  
│           │
│           ├─► CsvReader.readFile  
│           │   │
│           │   └─► Validate header row exists  
│           │
│           └─► Process each CSV record  
│               │
│               ├─► Convert string values to types  
│               │   └─► Using ValueParser  
│               │
│               └─► [Same processing as YAML path]  
│                   │
│                   └─► Shared processNodeRecord logic  
```

## Style Loading
```
│
├─► DiagramBuilder.loadStyles(filePath)  
│   │
│   ├─► Detect file type (YAML/JSON)  
│   │
│   ├─► If YAML:  
│   │   │
│   │   └─► StyleReader.readFromYaml  
│   │       │
│   │       ├─► PropertyReader.readYamlFile  
│   │       │   │
│   │       │   ├─► Validate document type  
│   │       │   │   ├─► 'style' or 'page'  
│   │       │   │
│   │       │   └─► StyleDocumentHandler.process  
│   │       │       │
│   │       │       ├─► DynamicPropertyYamlReader.transformDocument  
│   │       │       │   │
│   │       │       │   ├─► Resolve style inheritance  
│   │       │       │   │
│   │       │       │   └─► Merge property hierarchies  
│   │       │       │
│   │       │       └─► Build style structure  
│   │       │           │
│   │       │           ├─► Handle page dimensions  
│   │       │           │
│   │       │           └─► Normalize renderer flags  
│   │       │
│   │       └─► Add to diagram.styles Map  
│   │
│   └─► If JSON:  
│       │
│       └─► StyleReader.readFromJson  
│           │
│           ├─► PropertyReader.readJsonFile  
│           │   │
│           │   └─► Normalize document structure  
│           │       │
│           │       └─► Add missing 'style' root  
│           │
│           └─► [Same transformation as YAML path]  
│               │
│               └─► Shared StyleDocumentHandler logic  
```
