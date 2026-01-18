/**
 * Utility functions for converting projection settings to CSS styles
 */

// Font size mappings for different content types and scaling
const FONT_SIZE_MAPS = {
    scripture: {
        reference: {
            small: 'text-5xl md:text-6xl',
            medium: 'text-6xl md:text-7xl',
            large: 'text-7xl md:text-9xl',
            xlarge: 'text-8xl md:text-[10rem]'
        },
        text: {
            small: 'text-3xl md:text-4xl',
            medium: 'text-4xl md:text-5xl',
            large: 'text-5xl md:text-7xl',
            xlarge: 'text-6xl md:text-8xl'
        }
    },
    song: {
        title: 'text-xl md:text-3xl',
        text: {
            small: 'text-4xl md:text-5xl',
            medium: 'text-5xl md:text-6xl',
            large: 'text-7xl md:text-9xl',
            xlarge: 'text-8xl md:text-[10rem]'
        }
    },
    announcement: {
        title: {
            small: 'text-3xl md:text-4xl',
            medium: 'text-5xl md:text-7xl',
            large: 'text-6xl md:text-8xl',
            xlarge: 'text-7xl md:text-9xl'
        },
        text: {
            small: 'text-xl md:text-2xl',
            medium: 'text-3xl md:text-5xl',
            large: 'text-4xl md:text-6xl',
            xlarge: 'text-5xl md:text-7xl'
        }
    },
    prayer_request: {
        name: {
            small: 'text-5xl lg:text-6xl',
            medium: 'text-6xl lg:text-7xl',
            large: 'text-7xl lg:text-8xl',
            xlarge: 'text-8xl lg:text-9xl'
        },
        location: {
            small: 'text-3xl lg:text-4xl',
            medium: 'text-4xl lg:text-5xl',
            large: 'text-5xl lg:text-6xl',
            xlarge: 'text-6xl lg:text-7xl'
        },
        topics: {
            small: 'text-2xl lg:text-4xl',
            medium: 'text-3xl lg:text-5xl',
            large: 'text-4xl lg:text-6xl',
            xlarge: 'text-5xl lg:text-7xl'
        }
    }
};

// Font family mappings
const FONT_FAMILIES = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono',
    display: 'font-display'
};

/**
 * Get font size class based on settings and content type
 */
export const getFontSizeClass = (size, contentType, element = 'text') => {
    const sizeMap = FONT_SIZE_MAPS[contentType]?.[element];
    if (typeof sizeMap === 'string') return sizeMap;
    return sizeMap?.[size] || sizeMap?.medium || 'text-5xl';
};

/**
 * Get font family class
 */
export const getFontFamilyClass = (family) => {
    return FONT_FAMILIES[family] || FONT_FAMILIES.sans;
};

/**
 * Apply dynamic font scaling based on text length
 * Returns an inline style object for responsive font sizing
 */
export const applyDynamicFontScaling = (baseSize, textLength, contentType = 'scripture') => {
    let scaleFactor = 1;

    // Adjust scale based on text length
    if (textLength > 300) scaleFactor = 0.5;
    else if (textLength > 200) scaleFactor = 0.65;
    else if (textLength > 100) scaleFactor = 0.8;
    else if (textLength > 50) scaleFactor = 0.9;

    // Convert size setting to base pixel value
    const sizeMapping = {
        small: 40,
        medium: 56,
        large: 72,
        xlarge: 96
    };

    const basePx = sizeMapping[baseSize] || sizeMapping.medium;
    const scaledPx = basePx * scaleFactor;

    return {
        fontSize: `clamp(${scaledPx * 0.6}px, ${scaledPx * 0.8}px, ${scaledPx}px)`,
        lineHeight: contentType === 'song' ? '1.2' : '1.3'
    };
};

/**
 * Get background style from settings
 */
export const getBackgroundStyle = (settings) => {
    if (settings.backgroundGradient) {
        return {
            className: `bg-gradient-to-br ${settings.backgroundGradient}`
        };
    }

    return {
        style: {
            backgroundColor: settings.backgroundColor || '#000000'
        }
    };
};

/**
 * Get text color and shadow styles
 */
export const getTextStyle = (settings) => {
    const style = {
        color: settings.fontColor || '#FFFFFF'
    };

    if (settings.textShadow) {
        style.textShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    }

    return style;
};

/**
 * Get complete projection styles for a content type
 */
export const getProjectionStyles = (settings, contentType, textLength = 0) => {
    const baseStyles = {
        fontFamily: getFontFamilyClass(settings.fontFamily),
        ...getTextStyle(settings),
        ...getBackgroundStyle(settings)
    };

    // Add dynamic font scaling if text length is provided
    if (textLength > 0) {
        const dynamicFont = applyDynamicFontScaling(settings.fontSize, textLength, contentType);
        baseStyles.style = { ...baseStyles.style, ...dynamicFont };
    }

    return baseStyles;
};
