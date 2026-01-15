/**
 * Projection Service
 * Manages CRUD operations for projection items (announcements, images, slides)
 * Uses localStorage for persistence
 */

const STORAGE_KEY = 'pneumavoice_projections';

/**
 * Projection item types
 */
export const PROJECTION_TYPES = {
    ANNOUNCEMENT: 'announcement',
    IMAGE: 'image',
    SLIDE: 'slide',
    PRAYER_REQUEST: 'prayer_request',
};

/**
 * Get all projection items from storage
 * @returns {Array} Array of projection item objects
 */
export const getAllProjections = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error reading projections:', error);
        return [];
    }
};

/**
 * Save all projections to storage
 * @param {Array} projections - Array of projection objects
 */
const saveProjections = (projections) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projections));
    } catch (error) {
        console.error('Error saving projections:', error);
        throw error;
    }
};

/**
 * Add a new projection item
 * @param {Object} item - Projection item with type, title, content, and any additional fields
 * @returns {Object} The created projection item with ID
 */
export const addProjection = (item) => {
    const projections = getAllProjections();
    const newItem = {
        ...item, // Spread all properties from the item (including prayer request fields)
        id: Date.now().toString(),
        type: item.type,
        title: item.title?.trim() || '',
        content: item.content, // For announcements: text, for images: base64 data URL
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    projections.push(newItem);
    saveProjections(projections);
    return newItem;
};

/**
 * Update an existing projection item
 * @param {string} id - Item ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated item or null if not found
 */
export const updateProjection = (id, updates) => {
    const projections = getAllProjections();
    const index = projections.findIndex(p => p.id === id);
    if (index === -1) return null;

    projections[index] = {
        ...projections[index],
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    saveProjections(projections);
    return projections[index];
};

/**
 * Delete a projection item
 * @param {string} id - Item ID
 * @returns {boolean} True if deleted, false if not found
 */
export const deleteProjection = (id) => {
    const projections = getAllProjections();
    const filtered = projections.filter(p => p.id !== id);
    if (filtered.length === projections.length) return false;
    saveProjections(filtered);
    return true;
};

/**
 * Get projections by type
 * @param {string} type - Projection type
 * @returns {Array} Matching projections
 */
export const getProjectionsByType = (type) => {
    const projections = getAllProjections();
    return projections.filter(p => p.type === type);
};

/**
 * Get a projection by ID
 * @param {string} id - Item ID
 * @returns {Object|null} Projection or null if not found
 */
export const getProjectionById = (id) => {
    const projections = getAllProjections();
    return projections.find(p => p.id === id) || null;
};

/**
 * Convert file to base64 data URL
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 data URL
 */
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export default {
    PROJECTION_TYPES,
    getAllProjections,
    addProjection,
    updateProjection,
    deleteProjection,
    getProjectionsByType,
    getProjectionById,
    fileToBase64,
};
