
class ValueParser {
    static parse(value, valueType) {

        if (value === undefined){
            return undefined;
        }
        else if (value === null) {
            return null;
        }
        else if (valueType === 'string') {
            return String(value);
        } 
        else if (valueType === 'float') {
            return parseFloat(value);
        }
        else if (valueType === 'array') {
            return Array.isArray(value) ? value : [value];
        }
        else if (valueType === 'number') {
            return Number(value);
        }
        else if (valueType === 'boolean') {
            return Boolean(value);
        }
    }
}

module.exports = ValueParser;