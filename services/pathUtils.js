const path = require('path');
const { app } = require('electron');

/**
 * Resolves paths to resources (data, models, etc.)
 * Works in both development and production (packaged) environments.
 */
function getResourcePath(relativePath) {
    const isProd = process.env.NODE_ENV === 'production' || (app && app.isPackaged);

    if (isProd) {
        // process.resourcesPath is where 'extraResources' are placed
        return path.join(process.resourcesPath, relativePath);
    }

    // In dev, assume project root is one level up from the 'services' folder
    return path.join(__dirname, '..', relativePath);
}

module.exports = { getResourcePath };
