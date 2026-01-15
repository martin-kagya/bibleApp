function cleanBibleText(text) {
    if (!text) return '';
    console.log('Original:', text);
    const cleaned = text
        .replace(/\{[^{}]*:[^{}]*\}/g, '')
        .replace(/\{([^{}]+)\}/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();
    console.log('Cleaned: ', cleaned);
    return cleaned;
}

const sample = "In that day also he shall come even to thee from Assyria, and from the fortified cities, and from the fortress even to the river, and from sea to sea, and from mountain to mountain. {and from the fortified cities: or, even to the fortified cities}";
cleanBibleText(sample);
