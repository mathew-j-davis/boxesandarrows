/**
 * Represents a node in a diagram
 */
const { Direction } = require('../../geometry/direction');
const { Position, PositionType } = require('../../geometry/position');

class Node {
    constructor(properties) {
        Object.assign(this, properties);
    }

    merge(otherNode) {
        // Save a copy of the original records
        const originalRecords = [...(this.records || [])];
        const originalTikzAttributes = this.tikz_object_attributes;
        
        // Selectively merge properties, with otherNode taking priority
        // but only for properties that are defined in otherNode
        for (const [key, value] of Object.entries(otherNode)) {
            // Skip the records property (we'll handle that separately)
            if (key === 'records') continue;
            
            // Only copy if the property has a value in otherNode
            if (value !== undefined && value !== null) {
                this[key] = value;
            }
        }
        
        // Special handling for tikz_object_attributes - concatenate if both exist
        if (originalTikzAttributes && otherNode.tikz_object_attributes) {
            this.tikz_object_attributes = `${originalTikzAttributes}, ${otherNode.tikz_object_attributes}`;
        }
        
        // Combine records arrays
        this.records = [...originalRecords, ...(otherNode.records || [])];
        
        return this;
    }

    static mergeNodes(node1, node2) {
        // Create a new node with properties from node1
        const mergedNode = new Node({...node1});
        
        // Selectively merge properties from node2
        for (const [key, value] of Object.entries(node2)) {
            // Skip the records property (we'll handle that separately)
            if (key === 'records') continue;
            
            // Only copy if the property has a value in node2
            if (value !== undefined && value !== null) {
                mergedNode[key] = value;
            }
        }
        
        // Special handling for tikz_object_attributes - concatenate if both exist
        if (node1.tikz_object_attributes && node2.tikz_object_attributes) {
            mergedNode.tikz_object_attributes = `${node1.tikz_object_attributes}, ${node2.tikz_object_attributes}`;
        }
        
        // Combine records arrays
        mergedNode.records = [...(node1.records || []), ...(node2.records || [])];
        
        return mergedNode;
    }

    //* @param {Object} anchorVector - Vector representation of anchor point (can be null if not pre-calculated)

    
}

module.exports = { Node }; 



/*
if (result.useTikzAnchorSyntax) {
    const pos = `(${refNodeName}.${result.referenceTikzAnchor})`;
    const shifts = [];
    if (result.xShift) shifts.push(`xshift=${result.xShift}cm`);
    if (result.yShift) shifts.push(`yshift=${result.yShift}cm`);
    
    const shiftStr = shifts.length ? ` [${shifts.join(', ')}]` : '';
    output += `\\node[${styleStr}] (${nodeId}) at ${pos}${shiftStr} ${labelWithAdjustbox};`;
}






*/





