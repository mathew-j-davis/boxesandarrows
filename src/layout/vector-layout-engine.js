const LayoutEngine = require('./layout-engine');
const { Position } = require('../geometry/position');
const Dimensions = require('../geometry/dimensions');
const { Direction } = require('../geometry/direction');

/**
 * Vector layout engine for continuous coordinate systems
 * Used by LaTeX, SVG, PDF renderers
 *
 * Characteristics:
 * - Floating point coordinates
 * - Text scales to fit boxes
 * - Respects input dimensions
 */
class VectorLayoutEngine extends LayoutEngine {
    constructor(styleHandler, options = {}) {
        super(styleHandler, options);
        this.scaleConfig = null;
    }

    /**
     * Calculate vector layout for all nodes and edges
     */
    calculateLayout(nodes, edges) {
        this.scaleConfig = this.styleHandler.getPageScale();

        // Phase 1: Calculate node positions/dimensions/anchors
        this.calculateNodeLayout(nodes);

        // Phase 2: Calculate edge connection points
        this.calculateEdgeLayout(edges, nodes);

        return { nodes, edges };
    }

    /**
     * Calculate layout for all nodes
     * Dependencies are pre-sorted in input, so simple iteration works
     */
    calculateNodeLayout(nodes) {
        for (const [nodeName, node] of nodes.entries()) {
            // Calculate vector position (floating point)
            node.position = Position.calculatePositionAndScale(
                nodes,
                node.x, node.y,
                node.at,
                node.position_of,
                node.x_of, node.y_of,
                undefined, undefined,
                node.x_offset, node.y_offset,
                this.scaleConfig
            );

            // Calculate vector dimensions (respects input, text will scale)
            node.dimensions = Dimensions.calculateDimensionsAndScale(
                nodes,
                node.width, node.height,
                node.w_of, node.h_of,
                node.w_from, node.h_from,
                node.w_to, node.h_to,
                node.w_offset, node.h_offset,
                this.scaleConfig
            );

            // Calculate anchor as vector (-1 to 1 range)
            node.anchorVector = this.calculateAnchorVector(node);

            // Mark coordinate system type for debugging
            node._coordinateSystem = 'vector';
        }
    }

    /**
     * Calculate anchor as vector
     */
    calculateAnchorVector(node) {
        // Check explicit anchor on node
        if (node.anchor && typeof node.anchor === 'string') {
            return Direction.getVector(node.anchor);
        }

        // Get from style system
        const anchor = this.styleHandler.getStyleValueWithNamesStringAndModifyWithDefault(
            node.style,
            'node.object.anchor',
            [],
            false,
            'center'
        );

        return Direction.getVector(anchor);
    }

    /**
     * Calculate edge connection points
     */
    calculateEdgeLayout(edges, nodes) {
        for (const edge of edges) {
            const fromNode = nodes.get(edge.from);
            const toNode = nodes.get(edge.to);

            if (!fromNode || !toNode) {
                console.warn(`Edge references missing node: ${edge.from} -> ${edge.to}`);
                continue;
            }

            // Auto-detect anchors if not specified
            const anchors = this.autoDetectAnchors(fromNode, toNode, edge);

            // Calculate precise connection points
            edge.startPoint = this.getConnectionPoint(
                fromNode,
                anchors.start,
                this.scaleConfig
            );

            edge.endPoint = this.getConnectionPoint(
                toNode,
                anchors.end,
                this.scaleConfig
            );

            edge._coordinateSystem = 'vector';
        }
    }

    /**
     * Auto-detect edge anchors based on node positions
     */
    autoDetectAnchors(fromNode, toNode, edge) {
        let startAnchor = edge.start_anchor;
        let endAnchor = edge.end_anchor;

        // Auto-detect start anchor if not specified
        if (!startAnchor || startAnchor === 'null' || startAnchor === '') {
            const dx = toNode.position.xScaled - fromNode.position.xScaled;
            const dy = toNode.position.yScaled - fromNode.position.yScaled;
            startAnchor = Direction.getDirectionName(dx, dy);
        }

        // Auto-detect end anchor if not specified
        if (!endAnchor || endAnchor === 'null' || endAnchor === '') {
            const dx = fromNode.position.xScaled - toNode.position.xScaled;
            const dy = fromNode.position.yScaled - toNode.position.yScaled;
            endAnchor = Direction.getDirectionName(dx, dy);
        }

        return { start: startAnchor, end: endAnchor };
    }

    /**
     * Get connection point on node perimeter
     */
    getConnectionPoint(node, anchor, scale) {
        const directionVector = Direction.getVector(anchor);
        const anchorVector = node.anchorVector;

        return {
            x: node.position.xUnscaled +
               ((directionVector.x - anchorVector.x) *
                node.dimensions.widthScaled / (2 * scale.position.x)),

            y: node.position.yUnscaled +
               ((directionVector.y - anchorVector.y) *
                node.dimensions.heightScaled / (2 * scale.position.y))
        };
    }
}

module.exports = VectorLayoutEngine;
