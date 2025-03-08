// src/styles/latex-page-handler.js
class LatexPageHandler {
    constructor(options = {}) {
        this.verbose = options.verbose || false;
        this.log = this.verbose ? console.log.bind(console) : () => {};

        // Initialize default configuration
        this.config = {
            page: {
                scale: {
                    position: { x: 1, y: 1 },
                    size: { w: 1, h: 1 }
                },
                margin: { h: 1, w: 1 }
            }
        };
    }

    // Load configuration from a JSON file
    loadConfigFromFile(filePath) {
        if (!filePath) return;
        
        try {
            const fs = require('fs');
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(fileContent);
            
            // Extract page configuration from the file
            this.updateConfig(jsonData);
            this.log(`Loaded configuration from ${filePath}`);
        } catch (error) {
            console.error(`Error loading configuration from ${filePath}:`, error);
        }
    }

    // Update configuration with new values
    updateConfig(newConfig) {
        if (newConfig.page) {
            // Handle page scale
            if (newConfig.page.scale) {
                if (newConfig.page.scale.position) {
                    this.config.page.scale.position.x = 
                        newConfig.page.scale.position.x ?? this.config.page.scale.position.x;
                    this.config.page.scale.position.y = 
                        newConfig.page.scale.position.y ?? this.config.page.scale.position.y;
                }
                
                if (newConfig.page.scale.size) {
                    this.config.page.scale.size.w = 
                        newConfig.page.scale.size.w ?? this.config.page.scale.size.w;
                    this.config.page.scale.size.h = 
                        newConfig.page.scale.size.h ?? this.config.page.scale.size.h;
                }
            }
            
            // Handle page margins
            if (newConfig.page.margin) {
                this.config.page.margin.h = 
                    newConfig.page.margin.h ?? this.config.page.margin.h;
                this.config.page.margin.w = 
                    newConfig.page.margin.w ?? this.config.page.margin.w;
            }
        }
    }

    // Get the complete configuration
    getConfig() {
        return this.config;
    }

    // Get just the page configuration
    getPageConfig() {
        return this.config.page;
    }

    // Get the scale configuration
    getScaleConfig() {
        return this.config.page.scale;
    }
}

module.exports = LatexPageHandler;