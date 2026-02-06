/**
 * API URL Helper
 * Provides dynamic API base URL resolution for both development and production Electron builds
 */

let apiBaseUrl = null;
let portPromise = null;

/**
 * Initialize the API base URL
 * In Electron production, fetches the dynamic port from the main process
 * In dev/browser mode, uses relative paths (proxied by Vite)
 */
const initializeApiUrl = async () => {
    if (apiBaseUrl !== null) return apiBaseUrl;

    if (portPromise) return portPromise;

    portPromise = (async () => {
        // Check if running in Electron
        if (window.electron && window.electron.getServerPort) {
            try {
                const port = await window.electron.getServerPort();
                console.log('📡 [API] Using dynamic port from Electron:', port);
                apiBaseUrl = `http://127.0.0.1:${port}`;
                return apiBaseUrl;
            } catch (error) {
                console.warn('⚠️ [API] Failed to get Electron port, falling back to relative URLs:', error);
            }
        }

        // Fallback: Use relative paths (works in dev with Vite proxy, and browser mode)
        apiBaseUrl = '';
        return apiBaseUrl;
    })();

    return portPromise;
};

// Initialize immediately
initializeApiUrl();

/**
 * Get full API URL for a given endpoint
 * @param {string} endpoint - API endpoint (e.g., '/api/lexicon/search' or 'lexicon/search')
 * @returns {Promise<string>} Full API URL
 */
export const apiUrl = async (endpoint) => {
    await initializeApiUrl();

    // Ensure endpoint starts with /
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // If no base URL (browser/dev mode), return the endpoint as-is (relative)
    if (!apiBaseUrl) {
        return cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
    }

    // Electron production: return full URL
    const fullEndpoint = cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
    return `${apiBaseUrl}${fullEndpoint}`;
};

/**
 * Synchronous version for cases where async isn't possible
 * Note: May return relative URL if port hasn't been fetched yet
 */
export const apiUrlSync = (endpoint) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    if (!apiBaseUrl || apiBaseUrl === '') {
        return cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
    }

    const fullEndpoint = cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`;
    return `${apiBaseUrl}${fullEndpoint}`;
};

export default apiUrl;
