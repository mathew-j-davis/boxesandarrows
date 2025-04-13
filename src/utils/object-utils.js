/**
 * Utility functions for working with objects.
 */
class ObjectUtils {
    /**
     * Deep merge multiple source objects into a target object.
     * Source objects are merged in the order they are provided.
     * Later sources overwrite earlier sources if keys conflict.
     * 
     * @param {Object} target - The target object to merge into.
     * @param {...Object} sources - The source objects to merge from.
     * @returns {Object} - The modified target object.
     */
    static deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key] || !this.isObject(target[key])) {
                        target[key] = {};
                    }
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    }

    /**
     * Helper function to check if a variable is a non-array object.
     * @param {*} item - The variable to check.
     * @returns {boolean} - True if the item is an object (and not null or an array), false otherwise.
     */
    static isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }
}

module.exports = ObjectUtils; 