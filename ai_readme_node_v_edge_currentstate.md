# NodeReader vs EdgeReader: Current State Analysis

## Initial Comparison of NodeReader and EdgeReader

### Structure and Organization
1. **Class Structure**: Both use static methods for file reading and record processing
2. **File Reading Methods**: Both have methods for reading from CSV and YAML
3. **Record Processing**: Both have methods to process records into model objects

### Key Differences to Investigate Further

1. **Dynamic Property Handling**:
   - NodeReader has `readRecordsFromCsv` that processes dynamic properties
   - EdgeReader doesn't appear to have similar dynamic property handling

2. **Position Handling**:
   - NodeReader has more sophisticated position handling with `Position` class
   - EdgeReader uses simpler point objects for start/end positions

3. **Dimension Handling**:
   - NodeReader uses a `Dimensions` class for width/height
   - EdgeReader doesn't appear to have similar dimension handling

4. **Style Processing**:
   - NodeReader has more extensive style handling with `StyleHandler`
   - EdgeReader has basic style handling

5. **Value Parsing**:
   - NodeReader uses `ValueParser` for parsing various data types
   - EdgeReader doesn't appear to use a dedicated value parser

6. **Connection Point Handling**:
   - EdgeReader has specialized methods for connection points and anchors
   - NodeReader doesn't have similar connection point handling

7. **Waypoint Processing**:
   - EdgeReader has specialized waypoint processing
   - NodeReader doesn't have waypoint handling

8. **Error Handling**:
   - NodeReader has more extensive error handling
   - EdgeReader has basic error handling

9. **Documentation**:
   - NodeReader has more comprehensive JSDoc comments
   - EdgeReader has fewer documented methods

10. **Model Creation**:
    - NodeReader creates `Node` model instances
    - EdgeReader doesn't appear to create a dedicated model class

11. **Dynamic Property Integration**:
    - NodeReader integrates dynamic properties into the node model
    - EdgeReader doesn't appear to have similar integration

12. **Position Type Handling**:
    - NodeReader handles different position types (COORDINATES, ANCHOR, etc.)
    - EdgeReader doesn't appear to have similar position type handling

13. **Relative Positioning**:
    - NodeReader has support for relative positioning (x_of, y_of, etc.)
    - EdgeReader doesn't appear to have similar relative positioning

14. **Label Handling**:
    - NodeReader has more sophisticated label handling
    - EdgeReader has basic label handling

15. **Attribute Processing**:
    - NodeReader has more sophisticated attribute processing
    - EdgeReader has basic attribute handling 