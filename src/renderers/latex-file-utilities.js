// const Renderer = require('./renderer');
// const { Point2D } = require('../geometry/basic-points');
// const { Direction } = require('../geometry/direction');
const { exec } = require('child_process');
//const fs = require('fs');
const path = require('path');
// const LatexStyleHandler = require('../styles/latex-style-handler');
// const { BoundingBox } = require('../geometry/bounding-box');
// //const { canConvertPositionToCoordinates } = require('../io/readers/relative-node-processor');
// const { Position, PositionType } = require('../geometry/position');
// const LatexUtilities = require('./latex-utilities');
// const LatexFileUtilities = require('./latex-file-utilities');

class LatexFileUtilities {
  // constructor() {
  //   // Initialize file utilities
    
  // }

  
  static async compileToPdf(texFilePath, options = {}) {

    // Get verbose from options with default false
    const verbose = options.verbose ?? false;
    const log = verbose ? console.log.bind(console) : () => {};

    const texDir = path.dirname(texFilePath);
    const texFileName = path.basename(texFilePath);

    // Add -quiet flag if not verbose
    const interactionMode = verbose ? 'nonstopmode' : 'batchmode';
    const command = `pdflatex -interaction=${interactionMode} -file-line-error -output-directory="${texDir}" "${texFileName}"`;

    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (verbose) {
                log('LaTeX stdout:', stdout);
                if (stderr) console.error('LaTeX stderr:', stderr);
            }

            if (error) {
                console.error('LaTeX compilation error:', error);
                reject(error);
            } else {
                if (verbose) {
                    log('pdflatex output:', stdout);
                }
                resolve();
            }
        });
    });
  }
}

module.exports = LatexFileUtilities;
