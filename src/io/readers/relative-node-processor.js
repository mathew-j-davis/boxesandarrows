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

module.exports = { setPositionRelativeToNode }; 