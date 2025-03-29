/**
 * Module for processing nodes with relative positioning
 */
const { Direction } = require('../../geometry/direction');
const { Position, PositionType } = require('../../geometry/position');

/**
 * Positions a node relative to another node using anchor points
 * @param {Object} node - The node to position
 * @param {Object} referenceNode - The node to position relative to
 * @param {Object} styleHandler - The style handler (unused but kept for API consistency)
 * @returns {Object} - The positioned node
 */

// function setPositionRelativeToNode(node, referenceNode, styleHandler) {
//     // If position_of is present but in 'node.anchor' format, process it
//     if (node.position_of && node.position_of.includes('.')) {
//         const [refNodeName, refAnchorName] = node.position_of.split('.');
        
//         // STEP 1: Get anchor vectors
//         // 1a. Get the node's own anchor (how it will be positioned in the diagram)
//         const nodeAnchor = node.anchor || 'center';
//         const nodeAnchorVector = Direction.getVector(nodeAnchor);
        
//         // 1b. Get any additional offsets to apply
//         const offsetX = node.x_offset !== undefined ? parseFloat(node.x_offset) : 0;
//         const offsetY = node.y_offset !== undefined ? parseFloat(node.y_offset) : 0;
        
//         // 1c. scale offsets to apply
//         const scaledOffsetX = offsetX * (styleHandler?.getPageScale()?.position?.x || 0);
//         const scaledOffsetY = offsetY * (styleHandler?.getPageScale()?.position?.y || 0);
        
//         // STEP 2: Find the true center of the reference node
//         const refNodeCenterX = referenceNode.xScaled - (Direction.getVector('center').x * referenceNode.widthScaled/2);
//         const refNodeCenterY = referenceNode.yScaled - (Direction.getVector('center').y * referenceNode.heightScaled/2);
        
//         // STEP 3: Find the specific point on the reference node to use
//         const refAnchorVector = Direction.getVector(refAnchorName);
//         const referencePointX = refNodeCenterX + (refAnchorVector.x * referenceNode.widthScaled/2);
//         const referencePointY = refNodeCenterY + (refAnchorVector.y * referenceNode.heightScaled/2);
        
//         // STEP 4: Find the center of our new node
//         const nodeCenterX = referencePointX - (nodeAnchorVector.x * node.widthScaled/2) + scaledOffsetX;
//         const nodeCenterY = referencePointY - (nodeAnchorVector.y * node.heightScaled/2) + scaledOffsetY;
        
//         // STEP 5: Calculate the final position of the node
//         node.xScaled = nodeCenterX + (nodeAnchorVector.x * node.widthScaled/2);
//         node.yScaled = nodeCenterY + (nodeAnchorVector.y * node.heightScaled/2);
        
//         // STEP 6: Store unscaled coordinates for future reference
//         node.xUnscaled = node.xScaled / (styleHandler?.getPageScale()?.position?.x || 1);
//         node.yUnscaled = node.yScaled / (styleHandler?.getPageScale()?.position?.y || 1);
        
//         // STEP 7: Store that this node has been positioned
//         node.positioned = true;
        
//         return node;
//     }
    
//     // Fallback to standard positioning if no position_of with anchor format
//     // This handles simple position_of without anchor specification
//     // STEP 1: Get the anchor vectors for all points involved
//     // 1a. Get the reference node's own anchor (how it's positioned in the diagram)
//     const referenceNodeAnchor = referenceNode.anchor || 'center';
//     const referenceNodeAnchorVector = Direction.getVector(referenceNodeAnchor);

//     // 1b. Get the specific point on the reference node to use (default to center)
//     const referenceNodeRelativeToAnchor = 'center';
//     const referenceNodeRelativeToAnchorVector = Direction.getVector(referenceNodeRelativeToAnchor);
    
//     // 1c. Get the point on the new node that should be positioned at the reference point
//     const nodeAnchor = node.anchor || 'center';
//     const nodeAnchorVector = Direction.getVector(nodeAnchor);

//     // 1d. Get any additional offsets to apply
//     const offsetX = node.x_offset !== undefined ? parseFloat(node.x_offset) : 0;
//     const offsetY = node.y_offset !== undefined ? parseFloat(node.y_offset) : 0;

//     // 1e. scale offsets to apply
//     const scaledOffsetX = offsetX * (styleHandler?.getPageScale()?.position?.x || 0);
//     const scaledOffsetY = offsetY * (styleHandler?.getPageScale()?.position?.y || 0);

        
//     // STEP 2: Find the true center of the reference node
//     const refNodeCenterX = referenceNode.xScaled - (referenceNodeAnchorVector.x * referenceNode.widthScaled/2);
//     const refNodeCenterY = referenceNode.yScaled - (referenceNodeAnchorVector.y * referenceNode.heightScaled/2);
    
//     // STEP 3: Find the specific point on the reference node to use
//     const referencePointX = refNodeCenterX + (referenceNodeRelativeToAnchorVector.x * referenceNode.widthScaled/2);
//     const referencePointY = refNodeCenterY + (referenceNodeRelativeToAnchorVector.y * referenceNode.heightScaled/2);
    
//     // STEP 4: Find the center of our new node
//     const nodeCenterX = referencePointX - (nodeAnchorVector.x * node.widthScaled/2) + scaledOffsetX;
//     const nodeCenterY = referencePointY - (nodeAnchorVector.y * node.heightScaled/2) + scaledOffsetY;
    
//     // STEP 5: Calculate the final position of the node
//     node.xScaled = nodeCenterX + (nodeAnchorVector.x * node.widthScaled/2);
//     node.yScaled = nodeCenterY + (nodeAnchorVector.y * node.heightScaled/2);
    
//     // STEP 6: Store unscaled coordinates for future reference
//     node.xUnscaled = node.xScaled / (styleHandler?.getPageScale()?.position?.x || 1);
//     node.yUnscaled = node.yScaled / (styleHandler?.getPageScale()?.position?.y || 1);
    
//     // STEP 7: Store that this node has been positioned
//     node.positioned = true;
    
//     // Return the positioned node
//     return node;
// }

/**
 * Calculate the size of a node relative to other nodes
 * @param {Object} node - The node to calculate size for
 * @param {Map} nodesMap - Map of all nodes by name
 * @param {Object} scaleConfig - Configuration for scaling
 */
function setSizeRelativeToNodes(node, nodesMap, scaleConfig, log) {
    
    const defaultHeight = 1;
    const defaultWidth = 1;
    
    // Get scale factors
    const widthScale = scaleConfig?.size?.w || 1;
    const heightScale = scaleConfig?.size?.h || 1;
    const xScale = scaleConfig?.position?.x || 1;
    const yScale = scaleConfig?.position?.y || 1;
    
    // Process height first
    if (!node.heightUnscaled) {
        // Try to calculate height from h_of attribute
        if (node.h_of && nodesMap.has(node.h_of)) {
            const referenceNode = nodesMap.get(node.h_of);
            node.heightUnscaled = referenceNode.heightUnscaled + (node.h_offset || 0);
        }
        // If no height yet and both h_from and h_to are specified
        else if (node.h_from && node.h_to) {
            const fromPosition = Position.calculatePositionFromReference(nodesMap, node.h_from, 0, 0, xScale, yScale);
            const toPosition = Position.calculatePositionFromReference(nodesMap, node.h_to, 0, 0, xScale, yScale);
            
            // Only proceed if we got valid coordinate positions
            if (fromPosition.success && fromPosition.positionType === PositionType.COORDINATES &&
                toPosition.success && toPosition.positionType === PositionType.COORDINATES) {
                // Calculate absolute difference in Y coordinates (using scaled values)
                const scaledHeight = Math.abs(toPosition.yScaled - fromPosition.yScaled);
                // Convert back to unscaled value
                node.heightUnscaled = scaledHeight / heightScale;
                // Add the offset (which is already in unscaled units)
                node.heightUnscaled += (node.h_offset || 0);
            }
        }
        if (!node.heightUnscaled) {
            node.heightUnscaled = defaultHeight;
        }
    }

    // Process width second
    if (!node.widthUnscaled) {
        // Try to calculate width from w_of attribute
        if (node.w_of && nodesMap.has(node.w_of)) {
            const referenceNode = nodesMap.get(node.w_of);
            node.widthUnscaled = referenceNode.widthUnscaled + (node.w_offset || 0);
        }
        // If no width yet and both w_from and w_to are specified
        else if (node.w_from && node.w_to) {
            const fromPosition = Position.calculatePositionFromReference(nodesMap, node.w_from, 0, 0, xScale, yScale);
            const toPosition = Position.calculatePositionFromReference(nodesMap, node.w_to, 0, 0, xScale, yScale);
            
            // Only proceed if we got valid coordinate positions
            if (fromPosition.success && fromPosition.positionType === PositionType.COORDINATES &&
                toPosition.success && toPosition.positionType === PositionType.COORDINATES) {
                // Calculate absolute difference in X coordinates (using scaled values)
                const scaledWidth = Math.abs(toPosition.xScaled - fromPosition.xScaled);
                // Convert back to unscaled value
                node.widthUnscaled = scaledWidth / widthScale;
                // Add the offset (which is already in unscaled units)
                node.widthUnscaled += (node.w_offset || 0);
            }
        }

        if (!node.widthUnscaled) {
            node.widthUnscaled = defaultWidth;
        }
    }
}

/**
 * Sets the position of a node based on x_of and y_of properties
 * @param {Object} node - The node to position
 * @param {Map} nodesMap - Map of all nodes by name
 * @param {Object} scaleConfig - Configuration for scaling
 */
function setPositionFromReference(node, nodesMap, scaleConfig, log) {
    log(`Positioning node: ${node.name} with x_of: ${node.x_of}, y_of: ${node.y_of}`);
    
    // Process x coordinate
    if (node.x_of && nodesMap.has(node.x_of)) {
        const referenceNode = nodesMap.get(node.x_of);
        log(`  Reference node for x: ${node.x_of}, xUnscaled: ${referenceNode.xUnscaled}`);
        
        // Get the x position from the reference node
        if (typeof referenceNode.xUnscaled === 'number') {
            node.xUnscaled = referenceNode.xUnscaled;
            log(`  Setting xUnscaled to ${node.xUnscaled}`);
            
            // Apply offset if specified
            if (node.x_offset !== undefined) {
                node.xUnscaled += parseFloat(node.x_offset);
                log(`  Applied x_offset: ${node.x_offset}, new xUnscaled: ${node.xUnscaled}`);
            }
        }
    }
    
    // Process y coordinate
    if (node.y_of && nodesMap.has(node.y_of)) {
        const referenceNode = nodesMap.get(node.y_of);
        log(`  Reference node for y: ${node.y_of}, yUnscaled: ${referenceNode.yUnscaled}`);
        
        // Get the y position from the reference node
        if (typeof referenceNode.yUnscaled === 'number') {
            node.yUnscaled = referenceNode.yUnscaled;
            log(`  Setting yUnscaled to ${node.yUnscaled}`);
            
            // Apply offset if specified
            if (node.y_offset !== undefined) {
                node.yUnscaled += parseFloat(node.y_offset);
                log(`  Applied y_offset: ${node.y_offset}, new yUnscaled: ${node.yUnscaled}`);
            }
        }
    }
    
    // Calculate the scaled coordinates after setting position
    if (node.xUnscaled !== undefined) {
        node.xScaled = node.xUnscaled * (scaleConfig?.position?.x || 1);
        log(`  Final xScaled: ${node.xScaled}`);
    }
    
    if (node.yUnscaled !== undefined) {
        node.yScaled = node.yUnscaled * (scaleConfig?.position?.y || 1);
        log(`  Final yScaled: ${node.yScaled}`);
    }
    
    return node;
}

/**
 * Sets the position of a node's coordinate from a specific anchor point on a reference node
 * @param {Object} node - The node to position
 * @param {Map} nodesMap - Map of all nodes by name
 * @param {Object} scaleConfig - Configuration for scaling
 */
function setPositionFromAnchorPoint(node, nodesMap, scaleConfig) {
    const xScale = scaleConfig?.position?.x || 1;
    const yScale = scaleConfig?.position?.y || 1;
    
    // Handle x_of property with anchor notation (node.anchor)
    if (node.x_of && node.x_of.includes('.')) {
        const position = Position.calculatePositionFromReference(nodesMap, node.x_of, 0, 0, xScale, yScale);
        
        if (position.success && position.positionType === PositionType.COORDINATES) {
            node.xUnscaled = position.xUnscaled;
            
            // Apply offset if specified
            if (node.x_offset !== undefined) {
                node.xUnscaled += parseFloat(node.x_offset);
            }
        }
    }
    
    // Handle y_of property with anchor notation (node.anchor)
    if (node.y_of && node.y_of.includes('.')) {
        const position = Position.calculatePositionFromReference(nodesMap, node.y_of, 0, 0, xScale, yScale);
        
        if (position.success && position.positionType === PositionType.COORDINATES) {
            node.yUnscaled = position.yUnscaled;
            
            // Apply offset if specified
            if (node.y_offset !== undefined) {
                node.yUnscaled += parseFloat(node.y_offset);
            }
        }
    }
    
    // Calculate the scaled coordinates after setting position
    if (node.xUnscaled !== undefined) {
        node.xScaled = node.xUnscaled * xScale;
    }
    
    if (node.yUnscaled !== undefined) {
        node.yScaled = node.yUnscaled * yScale;
    }
    
    return node;
}

/**
 * Determine if a position can be converted to coordinates
 * @param {string} positionSpec - Position specification, possibly in node.anchor format
 * @returns {boolean} - True if the position can be directly converted to coordinates
 */
function canConvertPositionToCoordinates(positionSpec) {
    // If the position doesn't include an anchor, it can be converted
    if (!positionSpec || !positionSpec.includes('.')) {
        return true;
    }

    // Extract the anchor part
    const anchor = positionSpec.split('.')[1];
    
    // Basic directional anchors can be converted
    const convertibleAnchors = [
        'center', 'north', 'south', 'east', 'west', 
        'north east', 'north west', 'south east', 'south west',
        'northeast', 'northwest', 'southeast', 'southwest'
    ];
    
    return convertibleAnchors.includes(anchor);
}

// Export both functions
module.exports = { 
    //setPositionRelativeToNode,
    setSizeRelativeToNodes,
    setPositionFromReference,
    setPositionFromAnchorPoint,
    canConvertPositionToCoordinates
}; 