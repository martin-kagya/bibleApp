/**
 * Projection Window Manager
 * Manages a single projection window that can be reused for different content types
 */

// Store reference to the projection window globally
let projectionWindow = null;

/**
 * Get or create the projection window
 * @returns {Window} The projection window
 */
const getProjectionWindow = () => {
    // Check if window exists and is not closed
    if (!projectionWindow || projectionWindow.closed) {
        // Try to detect extended display and position window there
        // Screen positioning for extended displays
        let windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no';
        
        // Try to position on extended display (screen.width helps detect multi-monitor setups)
        // Move window to the right side which is typically where extended displays are
        // Note: This is a best-effort approach as browser APIs have limited multi-monitor support
        try {
            // If screen width suggests multiple monitors, try positioning off primary screen
            // Extended displays are typically to the right (positive x) or left (negative x)
            if (screen.availWidth > screen.width || screen.availLeft !== 0 || screen.availTop !== 0) {
                // Try to position on secondary display
                const x = screen.availLeft + screen.availWidth - 1280 - 50; // Position near right edge
                const y = screen.availTop + 50; // Small offset from top
                windowFeatures += `,left=${x},top=${y}`;
            } else {
                // Default: position on right side, which is often the extended display
                const x = screen.width - 1280 - 50;
                const y = 50;
                windowFeatures += `,left=${x},top=${y}`;
            }
        } catch (e) {
            console.warn('Could not position window on extended display:', e);
        }
        
        projectionWindow = window.open('', 'pneumavoice_projection', windowFeatures);
        
        // Ensure window is visible and focused
        if (projectionWindow) {
            projectionWindow.focus();
            // Make window fullscreen on extended display if possible
            // Note: This requires user gesture, but we can maximize
            setTimeout(() => {
                try {
                    if (projectionWindow && !projectionWindow.closed) {
                        // Try to resize to full screen on secondary display
                        projectionWindow.resizeTo(screen.availWidth, screen.availHeight);
                    }
                } catch (e) {
                    // Resize might be blocked, that's okay
                    console.log('Could not resize window:', e);
                }
            }, 100);
        }
    }
    return projectionWindow;
};

/**
 * Clear the projection window content
 * @param {Window} win - The window to clear
 */
const clearWindow = (win) => {
    if (win && !win.closed) {
        win.document.open();
        win.document.close();
    }
};

/**
 * Open the Live Display window on extended display
 * This opens the /live route which uses Socket.IO to display live content
 */
export const openLiveDisplay = () => {
    // Check if window already exists and is open
    if (projectionWindow && !projectionWindow.closed) {
        projectionWindow.focus();
        return projectionWindow;
    }

    // Try to detect extended display and position window there
    let windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no,scrollbars=no';
    
    try {
        // Calculate position for extended display
        // Extended displays are typically to the right (positive x) or left (negative x)
        if (screen.availWidth > screen.width || screen.availLeft !== 0 || screen.availTop !== 0) {
            // Position on secondary display
            const x = screen.availLeft + (screen.availWidth - 1280) / 2; // Center on extended display
            const y = screen.availTop + 50;
            windowFeatures += `,left=${x},top=${y}`;
        } else {
            // Default: try right side of screen (common extended display position)
            const x = Math.max(0, screen.width - 1280 - 50);
            const y = 50;
            windowFeatures += `,left=${x},top=${y}`;
        }
    } catch (e) {
        console.warn('Could not calculate extended display position:', e);
    }
    
    // Open the /live route which will display live content via Socket.IO
    const liveUrl = window.location.origin + '/live';
    projectionWindow = window.open(liveUrl, 'pneumavoice_live_display', windowFeatures);
    
    if (projectionWindow) {
        projectionWindow.focus();
        // Wait for window to load, then try to maximize or go fullscreen if on extended display
        setTimeout(() => {
            try {
                if (projectionWindow && !projectionWindow.closed) {
                    // Try to make it larger - ideally fullscreen on extended display
                    // Note: Fullscreen requires user gesture, but we can maximize size
                    projectionWindow.resizeTo(Math.min(screen.availWidth, 1920), Math.min(screen.availHeight, 1080));
                    projectionWindow.focus();
                }
            } catch (e) {
                // Resize might be blocked by browser, that's okay
                console.log('Could not resize live display window:', e);
            }
        }, 500);
    }
    
    return projectionWindow;
};

/**
 * Write content to projection window
 * @param {string} html - The HTML content to write
 */
const writeToProjection = (html) => {
    const win = getProjectionWindow();
    if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
    }
};

/**
 * Project a song to the projection window
 * @param {Object} song - Song object with title and lyrics
 */
export const projectSong = (song) => {
    writeToProjection(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${song.title}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    padding: 40px;
                    background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
                    color: white;
                    font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    text-align: center;
                    overflow: hidden;
                }
                .title-area {
                    position: absolute;
                    top: 40px;
                    left: 0;
                    right: 0;
                    opacity: 0.5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                h1 {
                    font-size: 1.2rem;
                    text-transform: uppercase;
                    letter-spacing: 4px;
                    font-weight: 400;
                    color: #f39c12;
                }
                .icon { font-size: 1rem; }
                .lyrics-container {
                    width: 100%;
                    max-width: 95vw;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: 1;
                }
                pre {
                    font-size: 5rem;
                    line-height: 1.4;
                    font-weight: 800;
                    white-space: pre-wrap;
                    font-family: inherit;
                    text-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    color: #ffffff;
                    width: 100%;
                }
                @media (max-width: 1000px) {
                    pre { font-size: 3.5rem; }
                }
            </style>
        </head>
        <body>
            <div class="title-area">
                <span class="icon">🎵</span>
                <h1>${song.title}</h1>
            </div>
            <div class="lyrics-container">
                <pre>${song.lyrics}</pre>
            </div>
        </body>
        </html>
    `);
};

/**
 * Project an image to the projection window
 * @param {Object} item - Image item with title and content (base64)
 */
export const projectImage = (item) => {
    writeToProjection(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${item.title || 'Projection'}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    background: #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                }
                img {
                    max-width: 100%;
                    max-height: 100vh;
                    object-fit: contain;
                }
            </style>
        </head>
        <body>
            <img src="${item.content}" alt="${item.title}" />
        </body>
        </html>
    `);
};

/**
 * Project an announcement to the projection window
 * @param {Object} item - Announcement item with title and content
 */
export const projectAnnouncement = (item) => {
    writeToProjection(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${item.title || 'Announcement'}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    padding: 60px;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    color: white;
                    font-family: system-ui, -apple-system, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    text-align: center;
                }
                h1 {
                    font-size: 3.5rem;
                    margin-bottom: 2rem;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                }
                p {
                    font-size: 2.5rem;
                    line-height: 1.6;
                    max-width: 80%;
                }
            </style>
        </head>
        <body>
            ${item.title ? `<h1>${item.title}</h1>` : ''}
            <p>${item.content}</p>
        </body>
        </html>
    `);
};

/**
 * Project a prayer request to the projection window
 * @param {Object} item - Prayer request with name, city, country, problem, image
 */
export const projectPrayerRequest = (item) => {
    // Format problem text as bullet points - split by dot delimiter
    const formatProblem = (text) => {
        if (!text) return '';
        // Split by dot followed by space (.) to create bullet points
        // This handles patterns like "Topic 1. Topic 2. Topic 3"
        const lines = text
            .split(/\.\s+(?=[A-Za-z])|\.\s*$/) // Split by dot followed by space(s) and letter, or dot at end
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        // Always display as bullets if we have any content
        if (lines.length > 0) {
            return `<ul class="problem-list">${lines.map(line => `<li>${line}</li>`).join('')}</ul>`;
        }
        // Fallback - display as paragraph
        return `<p class="problem-text">${text}</p>`;
    };

    writeToProjection(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Prayer Request - ${item.name || 'Anonymous'}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: system-ui, -apple-system, sans-serif;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                    color: white;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 30px;
                }
                .container {
                    display: flex;
                    gap: 50px;
                    align-items: center;
                    max-width: 1400px;
                    width: 100%;
                }
                .photo {
                    width: 550px;
                    height: 550px;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.5);
                    background: rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .photo img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .photo-placeholder {
                    font-size: 180px;
                    opacity: 0.2;
                }
                .details {
                    flex: 1;
                }
                .name {
                    font-size: 4.5rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    text-shadow: 3px 3px 6px rgba(0,0,0,0.4);
                }
                .location {
                    font-size: 2.4rem;
                    opacity: 0.85;
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .problem-label {
                    font-size: 1.2rem;
                    text-transform: uppercase;
                    letter-spacing: 3px;
                    opacity: 0.7;
                    margin-bottom: 0.8rem;
                    color: #e74c3c;
                }
                .problem {
                    background: rgba(255,255,255,0.1);
                    padding: 30px 35px;
                    border-radius: 16px;
                    border-left: 6px solid #e74c3c;
                }
                .problem-text {
                    font-size: 2.6rem;
                    line-height: 1.5;
                }
                .problem-list {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                }
                .problem-list li {
                    font-size: 2.4rem;
                    line-height: 1.4;
                    margin-bottom: 0.8rem;
                    padding-left: 40px;
                    position: relative;
                }
                .problem-list li:before {
                    content: "•";
                    position: absolute;
                    left: 0;
                    color: #e74c3c;
                    font-size: 2.5rem;
                    line-height: 1.2;
                }
                .problem-list li:last-child {
                    margin-bottom: 0;
                }
                .header {
                    position: fixed;
                    top: 25px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 1.5rem;
                    text-transform: uppercase;
                    letter-spacing: 5px;
                    opacity: 0.7;
                    font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="header">HEALING & MIRACLE LINE</div>
            <div class="container">
                <div class="photo">
                    ${item.image
            ? `<img src="${item.image}" alt="${item.name}" />`
            : '<div class="photo-placeholder">?</div>'
        }
                </div>
                <div class="details">
                    <div class="name">${item.name || 'Anonymous'}</div>
                    <div class="location">${[item.city, item.country].filter(Boolean).join(', ') || 'Location not specified'}</div>
                    <div class="problem-label">PRAYER NEED</div>
                    <div class="problem">${formatProblem(item.problem)}</div>
                </div>
            </div>
        </body>
        </html>
    `);
};

/**
 * Clear/close the projection window
 */
export const clearProjection = () => {
    if (projectionWindow && !projectionWindow.closed) {
        projectionWindow.close();
        projectionWindow = null;
    }
};

/**
 * Focus the projection window
 */
export const focusProjection = () => {
    if (projectionWindow && !projectionWindow.closed) {
        projectionWindow.focus();
    }
};

export default {
    projectSong,
    projectImage,
    projectAnnouncement,
    projectPrayerRequest,
    clearProjection,
    focusProjection,
};
