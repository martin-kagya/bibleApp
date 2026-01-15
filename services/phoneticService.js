const bibleBooks = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
    "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];

const mishearings = {
    "genesis": ["genesys", "genisys", "jenesis", "genisis"],
    "exodus": ["exodous", "exodis"],
    "leviticus": ["leviticous", "levidicus", "liviticous"],
    "numbers": ["number", "numbas"],
    "deuteronomy": ["deteronomy", "duteronomy", "due to ronamy"],
    "joshua": ["joshwa", "josh"],
    "psalms": ["palms", "songs", "psalm", "sam", "sams", "some"],
    "ecclesiastes": ["ecclesiastics", "eclesiastes", "see ass tees"],
    "isaiah": ["i zaya", "eye zaya", "i say a"],
    "jeremiah": ["jerry maya", "jerimiah"],
    "ezekiel": ["ezekial", "easy kiel"],
    "habakkuk": ["have a cook", "habacuck", "abbakuk"],
    "zephaniah": ["zeff a nye a"],
    "haggai": ["hag eye", "hag guy"],
    "malachi": ["mal a kai", "malakai"],
    "matthew": ["mathew", "matt", "mathieu"],
    "philippians": ["fill lipians", "filippians", "philipians"],
    "colossians": ["colosians", "collasians"],
    "thessalonians": ["thesselonians", "thessalonions"],
    "philemon": ["fi lemon", "phi lemon", "filemon"],
    "hebrews": ["he brews", "heebrews"],
    "revelation": ["revelations", "revolutions", "rev"]
};

class PhoneticService {
    constructor() {
        this.booksNormalized = bibleBooks.map(b => b.toLowerCase());
    }

    extractReference(text) {
        if (!text) return null;

        let cleanText = text.toLowerCase()
            .replace(/\bfirst\b/g, '1')
            .replace(/\bsecond\b/g, '2')
            .replace(/\bthird\b/g, '3')
            .replace(/\bone\b/g, '1')
            .replace(/\btwo\b/g, '2')
            .replace(/\bthree\b/g, '3')
            .replace(/\bfour\b/g, '4')
            .replace(/\bfive\b/g, '5')
            .replace(/\bsix\b/g, '6')
            .replace(/\bseven\b/g, '7')
            .replace(/\beight\b/g, '8')
            .replace(/\bnine\b/g, '9')
            .replace(/\bten\b/g, '10')
            .replace(/\bto\b/g, '2');

        let foundBook = null;
        let bookMatchIndex = -1;

        for (const book of bibleBooks) {
            const normBook = book.toLowerCase();
            const idx = cleanText.indexOf(normBook);
            if (idx !== -1) {
                foundBook = book;
                bookMatchIndex = idx;
                break;
            }

            const mis = mishearings[normBook.split(' ').pop()];
            if (mis) {
                for (const variant of mis) {
                    const vIdx = cleanText.indexOf(variant);
                    if (vIdx !== -1) {
                        foundBook = book;
                        bookMatchIndex = vIdx;
                        cleanText = cleanText.substring(0, vIdx) + normBook + cleanText.substring(vIdx + variant.length);
                        break;
                    }
                }
            }
            if (foundBook) break;
        }

        if (!foundBook) return null;

        const afterBook = cleanText.substring(bookMatchIndex + foundBook.length);
        const numbers = afterBook.match(/\d+/g);

        if (numbers && numbers.length >= 2) {
            return {
                book: foundBook,
                chapter: parseInt(numbers[0]),
                verse: parseInt(numbers[1]),
                confidence: 1.0 // Multiple numbers = extremely high confidence
            };
        } else if (numbers && numbers.length === 1) {
            let numStr = numbers[0];

            // Handle "Matthew 912" -> 9:12
            if (numStr.length >= 3 && numStr.length <= 4) {
                let chapter, verse;
                if (numStr.length === 3) {
                    chapter = parseInt(numStr.substring(0, 1));
                    verse = parseInt(numStr.substring(1));
                } else {
                    chapter = parseInt(numStr.substring(0, 2));
                    verse = parseInt(numStr.substring(2));
                }

                // Heuristic check: most chapters < 150, most verses < 100
                if (chapter > 0 && verse > 0) {
                    return {
                        book: foundBook,
                        chapter,
                        verse,
                        confidence: 0.95
                    };
                }
            }

            return {
                book: foundBook,
                chapter: parseInt(numStr),
                verse: 1,
                confidence: 0.85
            };
        }

        return { book: foundBook, confidence: 0.5 };
    }
}

const phoneticService = new PhoneticService();
module.exports = { phoneticService };
