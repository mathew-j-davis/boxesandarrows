/**
 * Handles position calculations for diagram elements
 */
const { Direction } = require('./direction');

// Enum-like object for position types
const PositionType = {
    UNKNOWN: "unknown",
    COORDINATES: "coordinates",
    ANCHOR: "anchor"
};

class Position {

    /**
     * Calculate position based on a reference node and its anchor
     * @param {Map} allNodes - All nodes in the diagram
     * @param {string} position_of - Reference position string (e.g., "node" or "node.anchor")
     * @param {number} x_offset - X offset from the reference position
     * @param {number} y_offset - Y offset from the reference position
     * @param {number} xScale - X scale factor
     * @param {number} yScale - Y scale factor
     * @returns {Object} - Calculation result with position data
     */
    static calculatePositionFromReference(allNodes, position_of, x_offset, y_offset, xScale, yScale) {
        // Initialize result object
        const result = {
            success: false,
            xUnscaled: null,
            yUnscaled: null,
            xScaled: null,
            yScaled: null,
            atNode: null,
            atAnchor: null,
            atNodeAnchor: null,
            xAtNodeAnchorOffset: null,
            yAtNodeAnchorOffset: null,
            xAtNodeAnchorOffsetScaled: null,
            yAtNodeAnchorOffsetScaled: null,
            positionType: PositionType.UNKNOWN
        };
        
        // Calculate offsets (if any)
        const x_offset_safe = x_offset !== undefined && x_offset !== null ? parseFloat(x_offset) : 0;
        const y_offset_safe = y_offset !== undefined && y_offset !== null ? parseFloat(y_offset) : 0;
        const x_offset_safe_scaled = x_offset_safe * xScale;
        const y_offset_safe_scaled = y_offset_safe * yScale;
        
        // Parse reference position string
        const parts = position_of.split('.');
        const ReferenceNodeName = parts[0];
        const ReferenceNode = allNodes.get(ReferenceNodeName);
        
        if (!ReferenceNode) {
            result.message = `Reference node '${ReferenceNodeName}' not found`;
            return result;
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
                ReferenceNode.xScaled === undefined ||
                ReferenceNode.yScaled === undefined 
            )
        ){
            // Apply offsets if specified
            const finalXScaled = ReferenceNode.xScaled + x_offset_safe_scaled;
            const finalYScaled = ReferenceNode.yScaled + y_offset_safe_scaled;
            
            // Back-calculate to unscaled coordinates
            const finalX = finalXScaled / xScale;
            const finalY = finalYScaled / yScale;
            
            // Update the result object
            result.xUnscaled = finalX;
            result.yUnscaled = finalY;
            result.xScaled = finalXScaled;
            result.yScaled = finalYScaled;
            result.atNode = ReferenceNodeName;
            result.atAnchor = referenceNodeOwnAnchorCanonical || referenceNodeOwnAnchor;
            result.atNodeAnchor = `${result.atNode}.${result.atAnchor}`;
            result.xAtNodeAnchorOffset = x_offset_safe;
            result.yAtNodeAnchorOffset = y_offset_safe;
            result.xAtNodeAnchorOffsetScaled = x_offset_safe_scaled;
            result.yAtNodeAnchorOffsetScaled = y_offset_safe_scaled;
            result.success = true;
            result.positionType = PositionType.COORDINATES;
            return result;
        }

        // If we can't convert anchors to coordinates, use the anchor reference directly
        // This happens when:
        // - referenceNodeAtAnchor or referenceNodeOwnAnchor is undefined
        // - ReferenceNode dimensions (width/height) are missing
        if (
            referenceNodeAtAnchorCanonical === undefined || 
            referenceNodeOwnAnchorCanonical === undefined ||
            ReferenceNode.xScaled === undefined ||
            ReferenceNode.yScaled === undefined ||
            ReferenceNode.widthScaled === undefined ||
            ReferenceNode.heightScaled === undefined
        ){
            result.success = true;
            result.atNode = ReferenceNodeName;
            result.atAnchor = referenceNodeAtAnchorCanonical || referenceNodeAtAnchor;
            result.atNodeAnchor = `${result.atNode}.${result.atAnchor}`;
            result.xAtNodeAnchorOffset = x_offset_safe;
            result.yAtNodeAnchorOffset = y_offset_safe;
            result.xAtNodeAnchorOffsetScaled = x_offset_safe_scaled;
            result.yAtNodeAnchorOffsetScaled = y_offset_safe_scaled;
            result.positionType = PositionType.ANCHOR;
            return result;
        }

        // Complex case: Transform anchors to calculate coordinates
        // Step 1: Get the center point of the reference node by adjusting for its own anchor
        const refNodeCenterX = ReferenceNode.xScaled - (referenceNodeOwnAnchorVector.x * ReferenceNode.widthScaled/2);
        const refNodeCenterY = ReferenceNode.yScaled - (referenceNodeOwnAnchorVector.y * ReferenceNode.heightScaled/2);
        
        // Step 2: Find the position of the specific anchor point on the reference node
        const refAnchorPointX = refNodeCenterX + (referenceNodeAtAnchorVector.x * ReferenceNode.widthScaled/2);
        const refAnchorPointY = refNodeCenterY + (referenceNodeAtAnchorVector.y * ReferenceNode.heightScaled/2);
        
        // Step 3: Apply offsets if specified
        const finalXScaled = refAnchorPointX + x_offset_safe_scaled;
        const finalYScaled = refAnchorPointY + y_offset_safe_scaled;
        
        // Step 4: Back-calculate to unscaled coordinates
        const finalX = finalXScaled / xScale;
        const finalY = finalYScaled / yScale;
        
        // Update the result object
        result.xUnscaled = finalX;
        result.yUnscaled = finalY;
        result.xScaled = finalXScaled;
        result.yScaled = finalYScaled;
        result.atNode = ReferenceNodeName;
        result.atAnchor = referenceNodeAtAnchorCanonical || referenceNodeAtAnchor;
        result.atNodeAnchor = `${result.atNode}.${result.atAnchor}`;
        result.xAtNodeAnchorOffset = x_offset_safe;
        result.yAtNodeAnchorOffset = y_offset_safe;
        result.xAtNodeAnchorOffsetScaled = x_offset_safe_scaled;
        result.yAtNodeAnchorOffsetScaled = y_offset_safe_scaled;
        result.positionType = PositionType.COORDINATES;
        result.success = true;
        
        return result;
    }

    /**
     * Calculate position and scale for a node based on various positioning parameters
     * @returns {Object} - Calculation result with success status and position data
     */
    static calculatePositionAndScale(allNodes, x, y, position_of, x_of, y_of, x_offset, y_offset, scaleConfig) {
        // Initialize result object
        const result = {
            success: false,
            xUnscaled: null,
            yUnscaled: null,
            xScaled: null,
            yScaled: null,
            atNode: null,
            atAnchor: null,
            atNodeAnchor: null,
            xAtNodeAnchorOffset: null,
            yAtNodeAnchorOffset: null,
            xAtNodeAnchorOffsetScaled: null,
            yAtNodeAnchorOffsetScaled: null,
            positionType: PositionType.UNKNOWN
        };
        
        // Get scale factors
        const xScale = scaleConfig?.position?.x || 1;
        const yScale = scaleConfig?.position?.y || 1;
        
        let xScaled = undefined;
        let yScaled = undefined;

        if (x !== undefined && x !== null){
            xScaled = x * xScale;
        }

        if (y !== undefined && y !== null){
            yScaled = y * yScale;
        }

        let xUnscaled_safe = parseFloat(x) || 0;
        let yUnscaled_safe = parseFloat(y) || 0;

        // Case 1: Direct positioning with x,y coordinates
        if (xScaled !== undefined && xScaled !== null && yScaled !== undefined && yScaled !== null) {
            result.xUnscaled = xUnscaled_safe;
            result.yUnscaled = yUnscaled_safe;
            result.xScaled = xScaled;
            result.yScaled = yScaled;
            result.success = true;
            result.positionType = PositionType.COORDINATES;
            return result;
        }
        
        // we know that we don't have both x and y set
        // though we may have one of them set
        // the subsequent parameters may set one or both of them, 
        // or if parameters are incomplete neither of them will be set
        // here we calculate what we can, and set the rest to 0
        // so that we can use the rest of the code without having to check if the values are set

        // as we know that we don't have both x and y set
        // we will attempt to position the node relative to another node or nodes using some combination of the parameters:

        // position_of, 
        // x_of, y_of
        // x_offset, y_offset

        xScaled = xUnscaled_safe * xScale;
        yScaled = yUnscaled_safe * yScale;

        // calculate offsets (if any)
        const x_of_offset_safe = x_offset !== undefined && x_offset !== null ? parseFloat(x_offset) : 0;
        const y_of_offset_safe = y_offset !== undefined && y_offset !== null ? parseFloat(y_offset) : 0;
        // const x_of_offset_safe_scaled = x_of_offset_safe * xScale;
        // const y_of_offset_safe_scaled = y_of_offset_safe * yScale;

        // Position relative to another node using position_of
        if (position_of) {
            const refResult = Position.calculatePositionFromReference(allNodes, position_of, x_of_offset_safe, y_of_offset_safe, xScale, yScale);
            
            if (refResult.success) {
                // If we got coordinates, copy coordinate information
                if (refResult.positionType === PositionType.COORDINATES) {
                    result.success = true;
                    result.xUnscaled = refResult.xUnscaled;
                    result.yUnscaled = refResult.yUnscaled;
                    result.xScaled = refResult.xScaled;
                    result.yScaled = refResult.yScaled;
                    result.positionType = PositionType.COORDINATES;
                }
                // If we got anchor positioning, copy anchor information
                else if (refResult.positionType === PositionType.ANCHOR) {
                    result.success = true;
                    result.atNode = refResult.atNode;
                    result.atAnchor = refResult.atAnchor;
                    result.atNodeAnchor = refResult.atNodeAnchor;
                    result.xAtNodeAnchorOffset = refResult.xAtNodeAnchorOffset;
                    result.yAtNodeAnchorOffset = refResult.yAtNodeAnchorOffset;
                    result.xAtNodeAnchorOffsetScaled = refResult.xAtNodeAnchorOffsetScaled;
                    result.yAtNodeAnchorOffsetScaled = refResult.yAtNodeAnchorOffsetScaled;
                    result.positionType = PositionType.ANCHOR;
                }
                return result;
            }
            
            // If reference positioning failed, pass along the error message
            if (refResult.message) {
                result.message = refResult.message;
            }
            
            return result;
        }
        
        // Case 3: Using x_of and y_of for independent axis positioning

        let x_calculated = false;
        let y_calculated = false;
        let xRefResult = undefined;
        let yRefResult = undefined;
        
        // Process x coordinate using x_of
        if (x_of) {
            xRefResult = Position.calculatePositionFromReference(allNodes, x_of, x_of_offset_safe, 0, xScale, yScale);
            
            x_calculated = xRefResult.success && xRefResult.positionType === PositionType.COORDINATES;
            if (!x_calculated) {
                result.message = xRefResult.message;
                return result;
            }
        }
        
        // Process y coordinate using y_of
        if (y_of) {
            yRefResult = Position.calculatePositionFromReference(allNodes, y_of, 0, y_of_offset_safe, xScale, yScale);
            y_calculated = yRefResult.success && yRefResult.positionType === PositionType.COORDINATES;
            if (!y_calculated) {
                result.message = yRefResult.message;
                return result;
            }
        }

        if (x_calculated) {
            result.xUnscaled = xRefResult.xUnscaled;
            result.xScaled = xRefResult.xScaled;
            result.success = true;
            result.positionType = PositionType.COORDINATES;

            if (!y_calculated) {
                result.yUnscaled = yUnscaled_safe;
                result.yScaled = yScaled;
            }
        }

        if ( y_calculated) {
            result.yUnscaled = yRefResult.yUnscaled;
            result.yScaled = yRefResult.yScaled;
            result.success = true;
            result.positionType = PositionType.COORDINATES;

            if (!x_calculated) {
                result.xUnscaled = xUnscaled_safe;
                result.xScaled = xScaled;
            }
        }
        return result;
    }
}

module.exports = { Position, PositionType }; 