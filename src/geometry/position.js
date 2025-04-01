/**
 * Handles position calculations for diagram elements
 */
const { Direction } = require('./direction');

// Enum-like object for position types
const PositionType = {
    COORDINATES: "coordinates",
    NAMED: "named"
};

class Position {
    /**
     * Create a new Position instance
     * @param {Object} options - Position options
     */
    constructor(options = {}) {
        // Initialize with defaults
        this.success = options.success || false;
        this.xUnscaled = options.xUnscaled !== undefined ? options.xUnscaled : null;
        this.yUnscaled = options.yUnscaled !== undefined ? options.yUnscaled : null;
        this.xScaled = options.xScaled !== undefined ? options.xScaled : null;
        this.yScaled = options.yScaled !== undefined ? options.yScaled : null;
        this.atNode = options.atNode || null;
        this.atAnchor = options.atAnchor || null;
        this.at = options.at || null;
        this.at = options.at || null;
        this.xAtNodeAnchorOffset = options.xAtNodeAnchorOffset !== undefined ? options.xAtNodeAnchorOffset : null;
        this.yAtNodeAnchorOffset = options.yAtNodeAnchorOffset !== undefined ? options.yAtNodeAnchorOffset : null;
        this.xAtNodeAnchorOffsetScaled = options.xAtNodeAnchorOffsetScaled !== undefined ? options.xAtNodeAnchorOffsetScaled : null;
        this.yAtNodeAnchorOffsetScaled = options.yAtNodeAnchorOffsetScaled !== undefined ? options.yAtNodeAnchorOffsetScaled : null;
        this.positionType = options.positionType || null;
        this.message = options.message || null;
    }

    /**
     * Calculate position based on a reference node and its anchor
     * @param {Map} allNodes - All nodes in the diagram
     * @param {string} position_of - Reference position string (e.g., "node" or "node.anchor")
     * @param {number} x_offset - X offset from the reference position
     * @param {number} y_offset - Y offset from the reference position
     * @param {Object} scaleConfig - Scaling configuration
     * @returns {Position} - Position instance with calculation results
     */
    static calculatePositionFromReference(allNodes, position_of, x_offset, y_offset, scaleConfig) {
        // Initialize position object
        const position = new Position();
        
        // Calculate offsets (if any)
        const x_offset_safe = x_offset !== undefined && x_offset !== null ? parseFloat(x_offset) : 0;
        const y_offset_safe = y_offset !== undefined && y_offset !== null ? parseFloat(y_offset) : 0;
        const x_offset_safe_scaled = x_offset_safe * scaleConfig.position.x;
        const y_offset_safe_scaled = y_offset_safe * scaleConfig.position.y;
        
        // Parse reference position string
        const parts = position_of.split('.');
        const ReferenceNodeName = parts[0];
        const ReferenceNode = allNodes.get(ReferenceNodeName);
        
        if (!ReferenceNode) {
            position.message = `Reference node '${ReferenceNodeName}' not found`;
            return position;
        }
        
        let referenceNodeAtAnchor;
        let referenceNodeAtAnchorCanonical;
        let referenceNodeAtAnchorVector;

        let referenceNodeOwnAnchor;
        let referenceNodeOwnAnchorCanonical;
        let referenceNodeOwnAnchorVector;

        // We have a reference node and an anchor
        if (parts.length > 1) {
            referenceNodeAtAnchor = parts[1];
            const ReferenceNodeAnchorInfo = Direction.getStrictAnchorNameAndVector(referenceNodeAtAnchor);
            
            referenceNodeAtAnchorCanonical = ReferenceNodeAnchorInfo.canonical;
            referenceNodeAtAnchorVector = ReferenceNodeAnchorInfo.vector;

            if (ReferenceNode.anchor !== undefined) {
                referenceNodeOwnAnchor = ReferenceNode.anchor;
                const ReferenceNodeOwnAnchorInfo = Direction.getStrictAnchorNameAndVector(referenceNodeOwnAnchor);

                referenceNodeOwnAnchorCanonical = ReferenceNodeOwnAnchorInfo.canonical;
                referenceNodeOwnAnchorVector = ReferenceNodeOwnAnchorInfo.vector;
            }
            // the default anchor for positioning is the center of the node
            // so if the reference node did not have an explicit anchor
            // center was used as the default
            else {
                referenceNodeOwnAnchor = 'center';
                referenceNodeOwnAnchorCanonical = 'center';
                referenceNodeOwnAnchorVector = {x: 0, y: 0};
            }
        }

 
        // Simple case: direct reference without anchor transformation
        // Either we have a reference node with no anchor
        // Or we have a reference node with an attachment anchor that is the same as the reference node's own anchor
        if (
            (
                parts.length === 1 ||
                (
                    (referenceNodeOwnAnchorCanonical||referenceNodeOwnAnchor) === 
                    (referenceNodeAtAnchorCanonical||referenceNodeAtAnchor)
                )
            )
            &&
            !(
                ReferenceNode.position?.xScaled === undefined ||
                ReferenceNode.position?.yScaled === undefined 
            )
        ){
            // Apply offsets if specified

            const finalXScaled = ReferenceNode.position.xScaled + x_offset_safe_scaled;
            const finalYScaled = ReferenceNode.position.yScaled + y_offset_safe_scaled;
            
            // Back-calculate to unscaled coordinates
            const finalX = finalXScaled / scaleConfig.position.x;
            const finalY = finalYScaled / scaleConfig.position.y;
            
            // Update the position object
            position.xUnscaled = finalX;
            position.yUnscaled = finalY;
            position.xScaled = finalXScaled;
            position.yScaled = finalYScaled;
            position.atNode = ReferenceNodeName;
            position.atAnchor = referenceNodeOwnAnchorCanonical || referenceNodeOwnAnchor;
            position.at = `${position.atNode}.${position.atAnchor}`;
            position.xAtNodeAnchorOffset = x_offset_safe;
            position.yAtNodeAnchorOffset = y_offset_safe;
            position.xAtNodeAnchorOffsetScaled = x_offset_safe_scaled;
            position.yAtNodeAnchorOffsetScaled = y_offset_safe_scaled;
            position.success = true;
            position.positionType = PositionType.COORDINATES;
            return position;
        }

        // If we can't convert anchors to coordinates, use the anchor reference directly
        // This happens when:
        // - referenceNodeAtAnchor or referenceNodeOwnAnchor is undefined
        // - ReferenceNode dimensions (width/height) are missing
        if (
            referenceNodeAtAnchorCanonical === undefined || 
            referenceNodeOwnAnchorCanonical === undefined ||
            ReferenceNode.position?.xScaled === undefined ||
            ReferenceNode.position?.yScaled === undefined ||
            ReferenceNode.dimensions?.widthScaled === undefined ||
            ReferenceNode.dimensions?.heightScaled === undefined
        ){
            position.success = true;
            position.atNode = ReferenceNodeName;
            position.atAnchor = referenceNodeAtAnchorCanonical || referenceNodeAtAnchor;
            position.at = `${position.atNode}.${position.atAnchor}`;
            position.xAtNodeAnchorOffset = x_offset_safe;
            position.yAtNodeAnchorOffset = y_offset_safe;
            position.xAtNodeAnchorOffsetScaled = x_offset_safe_scaled;
            position.yAtNodeAnchorOffsetScaled = y_offset_safe_scaled;
            position.positionType = PositionType.NAMED;
            return position;
        }

        // Complex case: Transform anchors to calculate coordinates
        // Step 1: Get the center point of the reference node by adjusting for its own anchor
        const refNodeCenterX = ReferenceNode.position.xScaled - (referenceNodeOwnAnchorVector.x * ReferenceNode.dimensions.widthScaled/2);
        const refNodeCenterY = ReferenceNode.position.yScaled - (referenceNodeOwnAnchorVector.y * ReferenceNode.dimensions.heightScaled/2);
        
        // Step 2: Find the position of the specific anchor point on the reference node
        const refAnchorPointX = refNodeCenterX + (referenceNodeAtAnchorVector.x * ReferenceNode.dimensions.widthScaled/2);
        const refAnchorPointY = refNodeCenterY + (referenceNodeAtAnchorVector.y * ReferenceNode.dimensions.heightScaled/2);
        
        // Step 3: Apply offsets if specified
        const finalXScaled = refAnchorPointX + x_offset_safe_scaled;
        const finalYScaled = refAnchorPointY + y_offset_safe_scaled;
        
        // Step 4: Back-calculate to unscaled coordinates
        const finalX = finalXScaled / scaleConfig.position.x;
        const finalY = finalYScaled / scaleConfig.position.y;
        
        // Update the position object
        position.xUnscaled = finalX;
        position.yUnscaled = finalY;
        position.xScaled = finalXScaled;
        position.yScaled = finalYScaled;
        position.atNode = ReferenceNodeName;
        position.atAnchor = referenceNodeAtAnchorCanonical || referenceNodeAtAnchor;
        position.at = `${position.atNode}.${position.atAnchor}`;
        position.xAtNodeAnchorOffset = x_offset_safe;
        position.yAtNodeAnchorOffset = y_offset_safe;
        position.xAtNodeAnchorOffsetScaled = x_offset_safe_scaled;
        position.yAtNodeAnchorOffsetScaled = y_offset_safe_scaled;
        position.positionType = PositionType.COORDINATES;
        position.success = true;
        
        return position;
    }

    /**
     * Calculate position and scale for a node based on various positioning parameters
     * @param {Map} allNodes - All nodes in the diagram
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} position_of - Reference position string
     * @param {string} x_of - Reference for X coordinate
     * @param {string} y_of - Reference for Y coordinate
     * @param {number} x_offset - X offset
     * @param {number} y_offset - Y offset
     * @param {Object} scaleConfig - Scaling configuration
     * @returns {Position} - Position instance with calculation results
     */
    static calculatePositionAndScale(allNodes, x, y, at, position_of, x_of, y_of, x_by = 1.0, y_by = 1.0, x_offset = 0.0, y_offset = 0.0, scaleConfig) {



        // x_by and y_by are used to scale the x and y coordinates
        // currently, 
        // x_by and y_by can only be used if the position can be converted to coordinates

        // x_offset and y_offset are used to offset the x and y coordinates
        // scaleConfig is used to get the scale factors for the x and y coordinates

        // Initialize position object
        const position = new Position();
        
        // Get scale factors
        const xScale = scaleConfig?.position?.x || 1;
        const yScale = scaleConfig?.position?.y || 1;
        
        scaleConfig = {
            position: {
                x: scaleConfig?.position?.x || 1.0,
                y: scaleConfig?.position?.y || 1.0
            },
            size: {
                w: scaleConfig?.size?.w || 1.0,
                h: scaleConfig?.size?.h || 1.0
            }
        }
        
        let x_safe = parseFloat(x) || 0;
        let y_safe = parseFloat(y) || 0;

        x_by = parseFloat(x_by) || 1.0;
        y_by = parseFloat(y_by) || 1.0;
        x_offset = parseFloat(x_offset) || 0.0;
        y_offset = parseFloat(y_offset) || 0.0;

        let xUnscaled = (x_safe * x_by) + x_offset;
        let xScaled = xUnscaled * xScale;

        let yUnscaled = (y_safe * y_by) + y_offset;
        let yScaled = yUnscaled * yScale;

        // Case : Direct positioning with x,y coordinates
        // only used if the user has set x and y directly
        if (
            x !== undefined && 
            x !== null &&
            y !== null &&
            y !== undefined &&
            xUnscaled !== undefined && xUnscaled !== null &&
            yUnscaled !== undefined && yUnscaled !== null &&
            xScaled !== undefined && xScaled !== null &&
            yScaled !== undefined && yScaled !== null
        ) {
            position.xUnscaled = xUnscaled;
            position.yUnscaled = yUnscaled;
            position.xScaled = xScaled;
            position.yScaled = yScaled;
            position.success = true;
            position.positionType = PositionType.COORDINATES;
            return position;
        }
        
        // Case : Direct positioning with at
        // this is a special case where the user wants to position using a named position with no validation.
        if (at !== undefined && at !== null && typeof at === 'string' && at !== '') {
            position.success = true;
            position.at = at;
            position.positionType = PositionType.NAMED;

            return position;
        }
        

        // we know that we don't have both x and y set
        // though we may have one of them set
        // the subsequent parameters may set one or both of them, 
        // or if parameters are incomplete neither of them will be set
        // here we calculate what we can, and set the rest to 0
        // so that we can use the rest of the code without having to check if the values are set

        // as we know that we don't have both x and y set
        // we will attempt to position the node relative to another node or nodes using some combination of the parameters


        // Position relative to another node using position_of
        if (position_of) {
            const refPosition = Position.calculatePositionFromReference(allNodes, position_of, x_offset, y_offset, scaleConfig);
            
            if (refPosition.success) {
                // If we got coordinates, copy coordinate information
                if (refPosition.positionType === PositionType.COORDINATES) {
                    position.success = true;
                    position.xUnscaled = refPosition.xUnscaled;
                    position.yUnscaled = refPosition.yUnscaled;
                    position.xScaled = refPosition.xScaled;
                    position.yScaled = refPosition.yScaled;
                    position.positionType = PositionType.COORDINATES;
                }
                // If we got anchor positioning, copy anchor information
                else if (refPosition.positionType === PositionType.NAMED) {
                    position.success = true;
                    position.atNode = refPosition.atNode;
                    position.atAnchor = refPosition.atAnchor;
                    position.at = refPosition.at;
                    position.xAtNodeAnchorOffset = refPosition.xAtNodeAnchorOffset;
                    position.yAtNodeAnchorOffset = refPosition.yAtNodeAnchorOffset;
                    position.xAtNodeAnchorOffsetScaled = refPosition.xAtNodeAnchorOffsetScaled;
                    position.yAtNodeAnchorOffsetScaled = refPosition.yAtNodeAnchorOffsetScaled;
                    position.positionType = PositionType.NAMED;
                }
                return position;
            }
            
            // If reference positioning failed, pass along the error message
            if (refPosition.message) {
                position.message = refPosition.message;
            }
            
            return position;
        }
        
        // Case 3: Using x_of and y_of for independent axis positioning

        let x_calculated = false;
        let y_calculated = false;
        let xRefPosition = undefined;
        let yRefPosition = undefined;
        
        // Process x coordinate using x_of
        if (x_of) {
            xRefPosition = Position.calculatePositionFromReference(allNodes, x_of, x_offset, 0, scaleConfig);
            x_calculated = xRefPosition.success && xRefPosition.positionType === PositionType.COORDINATES;
            if (!x_calculated) {
                position.message = xRefPosition.message;
                return position;
            }
        }
        
        // Process y coordinate using y_of
        if (y_of) {
            yRefPosition = Position.calculatePositionFromReference(allNodes, y_of, 0, y_offset, scaleConfig);
            y_calculated = yRefPosition.success && yRefPosition.positionType === PositionType.COORDINATES;
            if (!y_calculated) {
                position.message = yRefPosition.message;
                return position;
            }
        }

        if (x_calculated) {
            position.xUnscaled = xRefPosition.xUnscaled;
            position.xScaled = xRefPosition.xScaled;
            position.success = true;
            position.positionType = PositionType.COORDINATES;

            if (!y_calculated) {
                position.yUnscaled = y_safe;
                position.yScaled = yScaled;
            }
        }

        if (y_calculated) {
            position.yUnscaled = yRefPosition.yUnscaled;
            position.yScaled = yRefPosition.yScaled;
            position.success = true;
            position.positionType = PositionType.COORDINATES;

            if (!x_calculated) {
                position.xUnscaled = x_safe;
                position.xScaled = xScaled;
            }
        }
        return position;
    }
}

module.exports = { Position, PositionType }; 