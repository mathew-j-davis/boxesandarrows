ai_readme_0000_node_and_style_loading.md

```
│
├─► DiagramBuilder.loadNodes  
│   │
│   └─► NodeReader.readFromYaml  
│       │
│       ├─► DynamicPropertyYamlReader.readFile  
│       │   │
│       │   └─► Filter docs (type=node)  
│       │
│       └─► Process each record  
│           │
│           ├─► NodeReader.processNodeRecord  
│           │   │
│           │   ├─► Parse position/dimensions  
│           │   │
│           │   └─► Collect dynamic properties  
│           │
│           └─► Create Node object  
│               │
│               └─► Store in diagram.nodes  
```



```
│
├─► DiagramBuilder.loadStyles  
│   │
│   └─► StyleReader.readFromYaml  
│       │
│       └─► PropertyReader.readYamlFile  
│           │
│           ├─► Filter docs (type=style/page)  
│           │
│           └─► StyleDocumentHandler.process  
│               │
│               ├─► DynamicPropertyYamlReader.transformDocument  
│               │   │
│               │   ├─► Resolve inheritance  
│               │   │
│               │   └─► Merge style hierarchies  
│               │
│               └─► Build final style structure  
│                   │
│                   └─► Store in diagram.styles  

```