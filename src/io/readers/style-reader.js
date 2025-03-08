const fs = require('fs');
const yaml = require('js-yaml');
const YamlReader = require('./yaml-reader');

class StyleReader {
    /**
     * Read styles from a JSON file
     * @param {string} jsonFile - Path to the JSON file
     * @param {Object} renderer - Renderer with style handling capabilities
     * @returns {Promise<Object>} - Style object loaded from JSON
     */
    static async readFromJson(jsonFile) {
        try {
            const content = await fs.promises.readFile(jsonFile, 'utf8');
            const styleData = JSON.parse(content);
            
            // If the JSON is already properly structured, return it as is
            if (styleData.style || styleData.page) {
                return styleData;
            }
            
            // Otherwise, wrap it in the expected structure
            return { style: styleData };
        } catch (error) {
            console.error(`Error reading JSON file ${jsonFile}:`, error);
            throw error;
        }
    }

    /**
     * Read styles from a YAML file
     * @param {string} yamlFile - Path to the YAML file
     */
    static async readFromYaml(yamlFile) {
        try {
            // Use YamlReader to get documents with 'style' and 'page' types
            const styles = await YamlReader.readFile(yamlFile, { 
                filter: doc => doc && (doc.type === 'style' || doc.type === 'page') 
            });
            
            return styles;
        } catch (error) {
            console.error(`Error reading YAML file ${yamlFile}:`, error);
            throw error;
        }
    }

}

module.exports = StyleReader;
