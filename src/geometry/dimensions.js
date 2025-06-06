const { Position, PositionType } = require('./position');

class Dimensions {
    constructor({ widthUnscaled, heightUnscaled, widthScaled, heightScaled }) {
        this.widthUnscaled = widthUnscaled;
        this.heightUnscaled = heightUnscaled;
        this.widthScaled = widthScaled;
        this.heightScaled = heightScaled;
    }
//calculateDimensionsAndScale
    static calculateDimensionsAndScale(nodes, w, h, w_of, h_of, w_from, h_from, w_to, h_to, w_offset, h_offset, scaleConfig) {
        const defaultHeight = 1;
        const defaultWidth = 1;
        
        let defaultScale = {
            size: {
                w: 1,
                h: 1
            },
            position: {
                x: 1,
                y: 1
            }
        };

        if (!scaleConfig) {
            scaleConfig = defaultScale;
        }

        let dimensions = new Dimensions({
            widthUnscaled: undefined,
            heightUnscaled: undefined,
            widthScaled: undefined,
            heightScaled: undefined
        });

        if (w) {
            dimensions.widthUnscaled = w;
            dimensions.widthScaled = w * scaleConfig.size.w;
        }
        else {
            // Try to calculate width from w_of attribute
            if (w_of && nodes.has(w_of)) {
                const referenceNode = nodes.get(w_of);
                dimensions.widthUnscaled = referenceNode.widthUnscaled + (w_offset || 0);
                dimensions.widthScaled = dimensions.widthUnscaled * scaleConfig.size.w;
            }
            // If no width yet and both w_from and w_to are specified
            else if (w_from && w_to) {
                const fromPosition = Position.calculatePositionFromReference(nodes, w_from, undefined, undefined, 0, 0, scaleConfig);
                const toPosition = Position.calculatePositionFromReference(nodes, w_to, undefined, undefined, 0, 0, scaleConfig);
                
                // Only proceed if we got valid coordinate positions
                if (fromPosition.success && fromPosition.positionType === PositionType.COORDINATES &&
                    toPosition.success && toPosition.positionType === PositionType.COORDINATES) {
                    // Calculate absolute difference in X coordinates (using scaled values)
                    dimensions.widthScaled = Math.abs(toPosition.xScaled - fromPosition.xScaled);
                    // Convert back to unscaled value
                    dimensions.widthUnscaled = dimensions.widthScaled / scaleConfig.size.w;
                    // Add the offset (which is already in unscaled units)
                    dimensions.widthUnscaled += (w_offset || 0);
                }
            }

            if (!dimensions.widthUnscaled) {
                dimensions.widthUnscaled = defaultWidth;
                dimensions.widthScaled = dimensions.widthUnscaled * scaleConfig.size.w;
            }
        }

        if (h) {
            dimensions.heightUnscaled = h;
            dimensions.heightScaled = h * scaleConfig.size.h;
        }
        else {
            // Try to calculate height from h_of attribute
            if (h_of && nodes.has(h_of)) {
                const referenceNode = nodes.get(h_of);
                dimensions.heightUnscaled = referenceNode.heightUnscaled + (h_offset || 0);
                dimensions.heightScaled = dimensions.heightUnscaled * scaleConfig.size.h;
            }
            // If no height yet and both h_from and h_to are specified
            else if (h_from && h_to) {
                const fromPosition = Position.calculatePositionFromReference(nodes, h_from, undefined, undefined, 0, 0, scaleConfig);
                const toPosition = Position.calculatePositionFromReference(nodes, h_to, undefined, undefined, 0, 0, scaleConfig);
                
                // Only proceed if we got valid coordinate positions
                if (fromPosition.success && fromPosition.positionType === PositionType.COORDINATES &&
                    toPosition.success && toPosition.positionType === PositionType.COORDINATES) {
                    // Calculate absolute difference in Y coordinates (using scaled values)
                    dimensions.heightScaled = Math.abs(toPosition.yScaled - fromPosition.yScaled);
                    // Convert back to unscaled value
                    dimensions.heightUnscaled = dimensions.heightScaled / scaleConfig.size.h;
                    // Add the offset (which is already in unscaled units)
                    dimensions.heightUnscaled += (h_offset || 0);
                }
            }

            if (!dimensions.heightUnscaled) {
                dimensions.heightUnscaled = defaultHeight;
                dimensions.heightScaled = dimensions.heightUnscaled * scaleConfig.size.h;
            }
        }

        return dimensions;
    }

    static calculateDimensionsAndScaleX(nodes, w, w_of, w_from, w_to, w_offset, scaleConfig) {
        const defaultWidth = 1;
        
        let dimensions = new Dimensions({
            widthUnscaled: undefined,
            heightUnscaled: undefined,
            widthScaled: undefined,
            heightScaled: undefined
        });

        if (w) {
            dimensions.widthUnscaled = w;
            dimensions.widthScaled = w * scaleConfig.size.w;
        }
        else {
            // Try to calculate width from w_of attribute
            if (w_of && nodes.has(w_of)) {
                const referenceNode = nodes.get(w_of);
                dimensions.widthUnscaled = referenceNode.widthUnscaled + (w_offset || 0);
                dimensions.widthScaled = dimensions.widthUnscaled * scaleConfig.size.w;
            }
            // If no width yet and both w_from and w_to are specified
            else if (w_from && w_to) {
                const fromPosition = Position.calculateXFromReference(nodes, w_from, undefined, 0, scaleConfig);
                const toPosition = Position.calculateXFromReference(nodes, w_to, undefined, 0, scaleConfig);
                
                // Only proceed if we got valid coordinate positions
                if (fromPosition.success && fromPosition.positionType === PositionType.COORDINATES &&
                    toPosition.success && toPosition.positionType === PositionType.COORDINATES) {
                    // Calculate absolute difference in X coordinates (using scaled values)
                    dimensions.widthScaled = Math.abs(toPosition.valueScaled - fromPosition.valueScaled);
                    // Convert back to unscaled value
                    dimensions.widthUnscaled = dimensions.widthScaled / scaleConfig.size.w;
                    // Add the offset (which is already in unscaled units)
                    dimensions.widthUnscaled += (w_offset || 0);
                }
            }

            if (!dimensions.widthUnscaled) {
                dimensions.widthUnscaled = defaultWidth;
                dimensions.widthScaled = dimensions.widthUnscaled * scaleConfig.size.w;
            }
        }

        return dimensions;
    }

    static calculateDimensionsAndScaleY(nodes, h, h_of, h_from, h_to, h_offset, scaleConfig) {
        const defaultHeight = 1;
        
        let dimensions = new Dimensions({
            widthUnscaled: undefined,
            heightUnscaled: undefined,
            widthScaled: undefined,
            heightScaled: undefined
        });

        if (h) {
            dimensions.heightUnscaled = h;
            dimensions.heightScaled = h * scaleConfig.size.h;
        }
        else {
            // Try to calculate height from h_of attribute
            if (h_of && nodes.has(h_of)) {
                const referenceNode = nodes.get(h_of);
                dimensions.heightUnscaled = referenceNode.heightUnscaled + (h_offset || 0);
                dimensions.heightScaled = dimensions.heightUnscaled * scaleConfig.size.h;
            }
            // If no height yet and both h_from and h_to are specified
            else if (h_from && h_to) {
                const fromPosition = Position.calculateYFromReference(nodes, h_from, undefined, 0, scaleConfig);
                const toPosition = Position.calculateYFromReference(nodes, h_to, undefined, 0, scaleConfig);
                
                // Only proceed if we got valid coordinate positions
                if (fromPosition.success && fromPosition.positionType === PositionType.COORDINATES &&
                    toPosition.success && toPosition.positionType === PositionType.COORDINATES) {
                    // Calculate absolute difference in Y coordinates (using scaled values)
                    dimensions.heightScaled = Math.abs(toPosition.valueScaled - fromPosition.valueScaled);
                    // Convert back to unscaled value
                    dimensions.heightUnscaled = dimensions.heightScaled / scaleConfig.size.h;
                    // Add the offset (which is already in unscaled units)
                    dimensions.heightUnscaled += (h_offset || 0);
                }
            }

            if (!dimensions.heightUnscaled) {
                dimensions.heightUnscaled = defaultHeight;
                dimensions.heightScaled = dimensions.heightUnscaled * scaleConfig.size.h;
            }
        }

        return dimensions;
    }
}

module.exports = Dimensions; 


