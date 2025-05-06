const fs = require('fs');
const yaml = require('js-yaml');
const YamlReader = require('./yaml-reader');
const DynamicPropertyYamlReader = require('./dynamic-property-yaml-reader');
const PropertyReader = require('./property-reader');
const StyleDocumentHandler = require('./style-document-handler');

class StyleReader {

    /**
     * Common options for style documents
     * @returns {Object} Options for property processing
     */
    static get styleOptions() {
        return {
            filter: doc => doc && (doc.type === 'style' || doc.type === 'page'),
            handler: StyleDocumentHandler
        };
    }

    /**
     * Read styles from a JSON file using the new PropertyReader
     * @param {string} jsonFile - Path to the JSON file
     * @returns {Promise<Array>} - Array of transformed documents
     */
    static async readFromJson(jsonFile) {
        try {
            return await PropertyReader.readJsonFile(jsonFile, this.styleOptions);
        } catch (error) {
            console.error(`Error reading JSON file ${jsonFile}:`, error);
            throw error;
        }
    }

    /**
     * Read styles from a YAML file using the new PropertyReader
     * @param {string} yamlFile - Path to the YAML file
     * @returns {Promise<Array>} - Array of transformed documents
     */
    static async readFromYaml(yamlFile) {
        try {
            return await PropertyReader.readYamlFile(yamlFile, this.styleOptions);
        } catch (error) {
            console.error(`Error reading YAML file ${yamlFile}:`, error);
            throw error;
        }
    }
}

module.exports = StyleReader;
