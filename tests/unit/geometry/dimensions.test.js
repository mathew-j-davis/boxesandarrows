const Dimensions = require('../../../src/geometry/dimensions');

describe('Dimensions', () => {
    test('should create a Dimensions instance with unscaled and scaled dimensions', () => {
        const dimensions = new Dimensions({
            widthUnscaled: 10,
            heightUnscaled: 20,
            widthScaled: 15,
            heightScaled: 30
        });

        expect(dimensions.widthUnscaled).toBe(10);
        expect(dimensions.heightUnscaled).toBe(20);
        expect(dimensions.widthScaled).toBe(15);
        expect(dimensions.heightScaled).toBe(30);

    });

    test('should calculate scaled dimensions from unscaled values', () => {
        const scaleConfig = {
            size: {
                w: 1.5,
                h: 2.0
            }
        };

        const dimensions = Dimensions.calculateDimensionsAndScale(
            {}, // nodes map (not used yet)
            10, // widthUnscaled
            20, // heightUnscaled
            null, // w_of
            null, // h_of
            null, // w_from
            null, // h_from
            null, // w_to
            null, // h_to
            0, // w_offset
            0, // h_offset
            scaleConfig
        );

        expect(dimensions.widthUnscaled).toBe(10);
        expect(dimensions.heightUnscaled).toBe(20);
        expect(dimensions.widthScaled).toBe(15); // 10 * 1.5
        expect(dimensions.heightScaled).toBe(40); // 20 * 2.0
    });

    test('should handle undefined scale config', () => {
        const dimensions = Dimensions.calculateDimensionsAndScale(
            {}, // nodes map
            10, // widthUnscaled
            20, // heightUnscaled
            null, // w_of
            null, // h_of
            null, // w_from
            null, // h_from
            null, // w_to
            null, // h_to
            0, // w_offset
            0, // h_offset
            undefined // scaleConfig
        );

        expect(dimensions.widthUnscaled).toBe(10);
        expect(dimensions.heightUnscaled).toBe(20);
        expect(dimensions.widthScaled).toBe(10); // 10 * 1 (default scale)
        expect(dimensions.heightScaled).toBe(20); // 20 * 1 (default scale)
    });
}); 