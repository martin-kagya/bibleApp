const abbreviations = {
    'gen': 1, 'ex': 2, 'exo': 2, 'exod': 2, 'lev': 3, 'num': 4, 'numb': 4, 'deut': 5, 'deu': 5,
    'josh': 6, 'jos': 6, 'judg': 7, 'jdg': 7, 'ruth': 8, 'rut': 8, '1sam': 9, '2sam': 10,
    '1samuel': 9, '2samuel': 10, '1sam.': 9, '2sam.': 10, '1sm': 9, '2sm': 10,
    '1kgs': 11, '2kgs': 12, '1king': 11, '2king': 12, '1kings': 11, '2kings': 12,
    '1chr': 13, '2chr': 14, '1chronanicles': 13, '2chronicles': 14, '1ch': 13, '2ch': 14,
    'ezra': 15, 'neh': 16, 'esth': 17, 'est': 17, 'job': 18, 'ps': 19, 'psa': 19, 'psalm': 19, 'psalms': 19,
    'prov': 20, 'pro': 20, 'eccl': 21, 'ecc': 21, 'song': 22, 'sos': 22, 'songs': 22,
    'isa': 23, 'is': 23, 'jer': 24, 'je': 24, 'lam': 25, 'ezek': 26, 'eze': 26, 'dan': 27, 'da': 27,
    'hos': 28, 'joel': 29, 'joe': 29, 'amos': 30, 'am': 30, 'obad': 31, 'ob': 31, 'jonah': 32, 'jon': 32,
    'mic': 33, 'nah': 34, 'hab': 35, 'zeph': 36, 'zep': 36, 'hag': 37, 'zech': 38, 'zec': 38, 'mal': 39,
    'matt': 40, 'mat': 40, 'mt': 40, 'mk': 41, 'mrk': 41, 'mar': 41, 'mark': 41,
    'lk': 42, 'luk': 42, 'luke': 42, 'jn': 43, 'joh': 43, 'john': 43, 'acts': 44, 'act': 44,
    'rom': 45, 'ro': 45, '1cor': 46, '2cor': 47, '1corinthians': 46, '2corinthians': 47,
    'gal': 48, 'ga': 48, 'eph': 49, 'phil': 50, 'phi': 50, 'col': 51, 'co': 51,
    '1thess': 52, '2thess': 53, '1thes': 52, '2thes': 53, '1tim': 54, '2tim': 55, '1ti': 54, '2ti': 55,
    'tit': 56, 'phlm': 57, 'philem': 57, 'heb': 58, 'jas': 59, 'jam': 59, '1pet': 60, '2pet': 61,
    '1pt': 60, '2pt': 61, '1jn': 62, '2jn': 63, '3jn': 64, '1john': 62, '2john': 63, '3john': 64,
    'jude': 65, 'rev': 66, 're': 66, 'revelation': 66
};

// Add Roman Numerals
const bookMap = { ...abbreviations };
bookMap['i john'] = 62;
bookMap['ii john'] = 63;
bookMap['iii john'] = 64;
// ... (rest omitted for brevity, but we assume they work if simple assignment works)

function test(reference) {
    console.log(`Testing: "${reference}"`);
    const fullMatch = reference.match(/^(.+?)\s+(\d+)[:.,](\d+)$/);

    if (!fullMatch) {
        console.error("❌ Regex No Match");
        return;
    }

    const [, bookName, chapter, verse] = fullMatch;
    console.log(`   Captured: Book="${bookName}", Ch=${chapter}, V=${verse}`);

    const id = bookMap[bookName.toLowerCase()];
    if (id) {
        console.log(`   ✅ Resolved ID: ${id}`);
    } else {
        console.error(`   ❌ Book Name Not Found: "${bookName.toLowerCase()}"`);
    }
}

test("gen 1:1");
test(" gen 1:1"); // Leading space test
test("gen 1,1");
test("jas 1.1");
test("rev 22:21");
test("John 3:16");
