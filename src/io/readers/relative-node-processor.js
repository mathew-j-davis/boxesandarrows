/**
 * Module for processing nodes with relative positioning
 */
const { Direction } = require('../../geometry/direction');

/**
 * Positions a node relative to another node using anchor points
 * @param {Object} node - The node to position
 * @param {Object} referenceNode - The node to position relative to
 * @param {Object} styleHandler - The style handler (unused but kept for API consistency)
 * @returns {Object} - The positioned node
 */
function setPositionRelativeToNode(node, referenceNode, styleHandler) {
    // STEP 1: Get the anchor vectors for all points involved
    // 1a. Get the reference node's own anchor (how it's positioned in the diagram)
    const referenceNodeAnchor = referenceNode.anchor || 'center';
    const referenceNodeAnchorVector = Direction.getVector(referenceNodeAnchor);

    // 1b. Get the specific point on the reference node to use (the attachment point)
    const referenceNodeRelativeToAnchor = node.relative_to_anchor || 'center';
    const referenceNodeRelativeToAnchorVector = Direction.getVector(referenceNodeRelativeToAnchor);
    
    // 1c. Get the point on the new node that should be positioned at the reference point
    const nodeAnchor = node.anchor || 'center';
    const nodeAnchorVector = Direction.getVector(nodeAnchor);

    // 1d. Get any additional offsets to apply
    const offsetX = node.relative_offset_x !== undefined ? parseFloat(node.relative_offset_x) : 0;
    const offsetY = node.relative_offset_y !== undefined ? parseFloat(node.relative_offset_y) : 0;

    // 1e. scale offsets to apply
    const scaledOffsetX = offsetX * (styleHandler?.getPageScale()?.position?.x || 0);
    const scaledOffsetY = offsetY * (styleHandler?.getPageScale()?.position?.y || 0);

        
    // STEP 2: Find the true center of the reference node
    // We need to adjust for the reference node's own anchor to find its center
    // If the node is anchored at 'center', this doesn't change anything
    // For any other anchor (like 'north west'), we need to adjust to find the center
    const refNodeCenterX = referenceNode.x - (referenceNodeAnchorVector.x * referenceNode.width/2);
    const refNodeCenterY = referenceNode.y - (referenceNodeAnchorVector.y * referenceNode.height/2);
    
    // STEP 3: Find the specific point on the reference node to use
    // This is the point that our new node will be positioned relative to
    // We calculate this from the center of the reference node
    const referencePointX = refNodeCenterX + (referenceNodeRelativeToAnchorVector.x * referenceNode.width/2);
    const referencePointY = refNodeCenterY + (referenceNodeRelativeToAnchorVector.y * referenceNode.height/2);
    
    // STEP 4: Find the center of our new node
    // We need to position the node so that its anchor point is at the reference point (plus offsets)
    // To do this, we need to find where the center should be
    const nodeCenterX = referencePointX - (nodeAnchorVector.x * node.width/2) + scaledOffsetX;
    const nodeCenterY = referencePointY - (nodeAnchorVector.y * node.height/2) + scaledOffsetY;
    
    // STEP 5: Calculate the final position of the node
    // The node position is the center adjusted by the node's anchor vector
    node.x = nodeCenterX + (nodeAnchorVector.x * node.width/2);
    node.y = nodeCenterY + (nodeAnchorVector.y * node.height/2);
    
    // STEP 6: Store unscaled coordinates for future reference
    // These are useful for relative positioning of other nodes
    node.xUnscaled = node.x / (styleHandler?.getPageScale()?.position?.x || 1);
    node.yUnscaled = node.y / (styleHandler?.getPageScale()?.position?.y || 1);
    
    // STEP 7: Store that this node has been positioned (useful for debugging)
    node.positioned = true;
    
    // Return the positioned node
    return node;
}
/*
    // Get anchor point on the reference node
    const anchor = record.anchor || 'center';
    let directionVector = Direction.getVector(anchor);
    
    if (!directionVector) {
        console.warn(`Invalid anchor '${anchor}' for node '${record.name}', using 'center' instead`);
        // Fall back to center anchor
        directionVector = Direction.getVector('center');
    }
    
    // Calculate position based on reference node, anchor, and offsets

    
    // Calculate the center of the reference node, accounting for its own anchor
    let refNodeCenterX = referenceNode.x;
    let refNodeCenterY = referenceNode.y;
    
    // If the reference node has an anchorVector, use it to find the center
    if (referenceNode.anchorVector) {
        // Adjust position back to center by subtracting the anchor vector effect
        refNodeCenterX -= (referenceNode.anchorVector.x * referenceNode.width / 2);
        refNodeCenterY -= (referenceNode.anchorVector.y * referenceNode.height / 2);
    }
    // Otherwise, check for a string anchor and convert to vector
    else if (referenceNode.anchor) {
        const refAnchorVector = Direction.getVector(referenceNode.anchor);
        if (refAnchorVector) {
            refNodeCenterX -= (refAnchorVector.x * referenceNode.width / 2);
            refNodeCenterY -= (refAnchorVector.y * referenceNode.height / 2);
        }
    }
    
    // Now calculate the anchor point from the center of the reference node
    const anchorX = refNodeCenterX + (directionVector.x * referenceNode.width / 2);
    const anchorY = refNodeCenterY + (directionVector.y * referenceNode.height / 2);
    
    // Apply offsets to get the final position
    const x = anchorX + (offsetX * scale.position.x);
    const y = anchorY + (offsetY * scale.position.y);
    
    // Store unscaled position values (for future reference)
    const xUnscaled = (anchorX / scale.position.x) + offsetX;
    const yUnscaled = (anchorY / scale.position.y) + offsetY;
    
    // Create a modified record with calculated positions
    const modifiedRecord = {
        ...record,
        x: xUnscaled,
        y: yUnscaled
    };
    
    // Process the node with the calculated position
    const node = processAbsoluteNode(modifiedRecord, scale, renderer);
    
    // Override the calculated positions (in case the processor did additional scaling)
    node.x = x;
    node.y = y;
    node.xUnscaled = xUnscaled;
    node.yUnscaled = yUnscaled;
    */

/**
 * Process a node record with relative positioning
 * @param {Object} node - The node to position relatively
 * @param {Map} nodesMap - Map of existing nodes (name -> node)
 * @param {Object} scale - Scale information for positions and sizes
 * @returns {Object} The positioned node
 */
/*
function setNodePositionRelativeToNode(node, nodesMap, scale) {
    // Validate inputs
    if (!node.relative_to) {
        console.warn(`Node ${node.name} has relative positioning but no relative_to specified`);
        return node;
    }
    
    
    const referenceNode = nodesMap.get(node.relative_to);
    const referenceNodeAnchor = referenceNode.anchor || 'center';
    const referenceNodeAnchorVector = Direction.getVector(referenceNodeAnchor);

    const referenceNodeRelativeToAnchor = node.relative_to_anchor || 'center';
    const referenceNodeRelativeToAnchorVector = Direction.getVector(referenceNodeRelativeToAnchor);
    
    const nodeAnchor = node.anchor || 'center';
    const nodeAnchorVector = Direction.getVector(nodeAnchor);
    
    
    
    referenceNodeCenterX = referenceNode.x + (referenceNodeAnchorVector.x * referenceNode.width / 2);
    
    referenceNode.x + (referenceNodeAnchorVector.x * referenceNode.width / 2);
    // Get the relative direction vector
    const relVector = Direction.getVector(node.relative);

    // Get the offset values
    const offsetX = (node.offset_x || 0);
    const offsetY = (node.offset_y || 0);
    
    


    
    // Ensure reference node exists
    if (!referenceNode) {
        console.warn(`Reference node '${node.relative_to}' for node '${node.name}' not found`);
        return node;
    }
    
    // Get relative direction vector (how we want to position this node)
    const relVector = Direction.getVector(node.relative);
    
    // Get offset values (additional adjustments)
    const offsetX = (node.offset_x || 0);
    const offsetY = (node.offset_y || 0);

    // Get unscaled dimensions for the reference node
    const refWidthUnscaled = referenceNode.widthUnscaled || 1;
    const refHeightUnscaled = referenceNode.heightUnscaled || 1;
    
    // Get anchor vector for the reference node (or use default center)
    const referenceAnchorVector = referenceNode.anchorVector || Direction.getVector('center');
    
    // Calculate the center of the reference node in unscaled coordinates
    const referenceNodeCenterXUnscaled = referenceNode.xUnscaled + ((0 - referenceAnchorVector.x) * refWidthUnscaled/2);
    const referenceNodeCenterYUnscaled = referenceNode.yUnscaled + ((0 - referenceAnchorVector.y) * refHeightUnscaled/2);
    
    // Store original dimensions if not already set
    if (node.widthUnscaled === undefined) {
        node.widthUnscaled = node.width || 1;
    }
    if (node.heightUnscaled === undefined) {
        node.heightUnscaled = node.height || 1;
    }
    
    // Calculate unscaled position
    node.xUnscaled = referenceNodeCenterXUnscaled + 
                     relVector.x * (refWidthUnscaled/2) + 
                     offsetX;
    node.yUnscaled = referenceNodeCenterYUnscaled + 
                     relVector.y * (refHeightUnscaled/2) + 
                     offsetY;
    
    // Now apply scaling to get the final scaled positions and dimensions
    if (scale) {
        // Apply position scaling
        node.x = node.xUnscaled * scale.position.x;
        node.y = node.yUnscaled * scale.position.y;
        
        // Apply dimension scaling
        node.width = node.widthUnscaled * scale.size.w;
        node.height = node.heightUnscaled * scale.size.h;
    } else {
        // If no scale provided, just copy unscaled values
        node.x = node.xUnscaled;
        node.y = node.yUnscaled;
        node.width = node.widthUnscaled;
        node.height = node.heightUnscaled;
    }
    
    return node;
}
*/
/**
 * Process a node with relative positioning
 * @param {Object} node - The node to position
 * @param {Object} referenceNode - The reference node
 * @param {Object} scale - Scale configuration
 * @returns {Object} - The positioned node
 */
/*
function processRelativeNode(node, referenceNode, scale) {
    if (!node || !referenceNode) {
        console.warn('Cannot process relative node: Missing node or reference node');
        return node;
    }
    
    // Get the Direction utility if not directly passed
    const Direction = require('../../geometry/direction');
    
    // 1. Get the vector for the node's own anchor (or default to center)
    const nodeAnchorVector = node.anchorVector || 
                            (node.anchor ? Direction.getVector(node.anchor) : Direction.getVector('center'));
    
    // 2. Get the vector for the reference node's anchor point to use
    // This is the new part - using relative_to_anchor instead of assuming center
    const referenceAnchorVector = node.relative_to_anchor ? 
                                Direction.getVector(node.relative_to_anchor) :  
                                (referenceNode.anchorVector || Direction.getVector('center'));
    
    // 3. Calculate the center position of the reference node
    // Account for the reference node's own anchor positioning
    const refNodeAnchorVector = referenceNode.anchorVector || Direction.getVector('center');
    const refNodeCenterX = referenceNode.x + ((0 - refNodeAnchorVector.x) * referenceNode.width/2);
    const refNodeCenterY = referenceNode.y + ((0 - refNodeAnchorVector.y) * referenceNode.height/2);
    
    // 4. Calculate the position of the specific anchor point on the reference node
    const refAnchorPointX = refNodeCenterX + (referenceAnchorVector.x * referenceNode.width/2);
    const refAnchorPointY = refNodeCenterY + (referenceAnchorVector.y * referenceNode.height/2);
    
    // 5. Apply any specified offsets
    const offsetX = node.offset_x !== undefined ? parseFloat(node.offset_x) : 0;
    const offsetY = node.offset_y !== undefined ? parseFloat(node.offset_y) : 0;
    
    // 6. Calculate the position for the node's center based on its anchor
    // This positions the node's anchor point at the reference anchor point
    const nodeCenterX = refAnchorPointX - (nodeAnchorVector.x * node.width/2) + offsetX;
    const nodeCenterY = refAnchorPointY - (nodeAnchorVector.y * node.height/2) + offsetY;
    
    // 7. Update the node's position
    node.x = nodeCenterX + (nodeAnchorVector.x * node.width/2);
    node.y = nodeCenterY + (nodeAnchorVector.y * node.height/2);
    
    // 8. Calculate unscaled coordinates if scale is provided
    if (scale) {
        node.xUnscaled = node.x / scale.position.x;
        node.yUnscaled = node.y / scale.position.y;
    }
    
    return node;
}
*/

module.exports = { setPositionRelativeToNode }; 