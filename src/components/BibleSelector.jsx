import React, { useState, useEffect, useRef } from 'react';
import { Book, Globe, Check, ChevronDown, Cloud } from 'lucide-react';
import { Combobox } from '@headlessui/react';

const BibleSelector = ({ onSelectionChange, onSubmit, className = '' }) => {
    const [translations, setTranslations] = useState([]);
    const [books, setBooks] = useState([]);

    // Selection State
    const [selectedTranslation, setSelectedTranslation] = useState('KJV');
    // We keep these for the parent callback, but UI is driven by query
    const [parsedSelection, setParsedSelection] = useState({ book: 'John', chapter: 3, verse: 16 });

    // Combobox/Input State
    const [query, setQuery] = useState('John 3:16');
    const [activeBook, setActiveBook] = useState(null); // The book currently being matched

    // 1. Fetch Data
    useEffect(() => {
        fetch('/api/translations')
            .then(res => res.json())
            .then(data => {
                setTranslations(data);
                if (data.length > 0 && !selectedTranslation) {
                    // setSelectedTranslation(data[0].abbreviation);
                }
            })
            .catch(console.error);

        fetch('/api/books')
            .then(res => res.json())
            .then(data => setBooks(data))
            .catch(console.error);
    }, []);

    // 2. Parse Query Logic
    const parseQuery = (input) => {
        // Match: (Book Name) (Chapter)[:.](Verse)
        // Handles: "Gen 3:2", "Gen3.2", "Gen3:2", "1 John 3:2", "1John3.2"
        // Group 1: Book (letters, spaces, leading numbers like 1 John)
        // Group 2: Chapter (digits)
        // Group 3: Verse (digits, optional)

        // Updated regex to handle no-space formats
        const match = input.match(/^((?:\d\s*)?[a-zA-Z]+(?:\s+[a-zA-Z]+)*)[\s.,:]*(\d+)?(?:[:.,-](\d+))?$/);

        if (match) {
            return {
                bookName: match[1].trim(),
                chapter: match[2] ? parseInt(match[2]) : null,
                verse: match[3] ? parseInt(match[3]) : null,
                fullText: input
            };
        }
        return { bookName: input.trim(), chapter: null, verse: null, fullText: input };
    };

    // 3. Handle Input Change (Typing)
    const handleInputChange = (event) => {
        setQuery(event.target.value);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            // If we have a valid selection state (or even partially valid), trigger submit
            if (onSubmit) {
                event.preventDefault(); // Prevent default form submit if any
                onSubmit();
            }
        }
    };

    // 4. Update Parent on Valid Full Selection
    useEffect(() => {
        if (!parsedSelection.book || !parsedSelection.chapter) return;

        // Debounce? Or just send. 
        if (onSelectionChange) {
            onSelectionChange({
                translation: selectedTranslation,
                book: parsedSelection.book,
                chapter: parsedSelection.chapter,
                verse: parsedSelection.verse,
                reference: parsedSelection.verse
                    ? `${parsedSelection.book} ${parsedSelection.chapter}:${parsedSelection.verse}`
                    : `${parsedSelection.book} ${parsedSelection.chapter}`
            });
        }
    }, [selectedTranslation, parsedSelection]);

    // 5. Filtered Books logic
    // We only filter if the user is typing the BOOK part.
    // We determine the "Book Part" by parsing the active query.
    const { bookName: currentBookPart } = parseQuery(query);

    const filteredBooks =
        query === ''
            ? books
            : books.filter((book) => {
                // Fuzzy match against the extracted book name part
                return book.name.toLowerCase().replace(/\s+/g, '')
                    .includes(currentBookPart.toLowerCase().replace(/\s+/g, ''));
            });

    // 6. Handle Selection from Dropdown
    const handleBookSelect = (bookName) => {
        // User selected a book. We need to preserve the parsed chapter/verse if they exist, 
        // or just set the book and let them continue typing.
        const { chapter, verse } = parseQuery(query);

        let newQuery = bookName;
        if (chapter) {
            newQuery += ` ${chapter}`;
            if (verse) newQuery += `:${verse}`;
        } else {
            newQuery += ' '; // Add space for user to type chapter
        }

        setQuery(newQuery);
        setParsedSelection(prev => ({ ...prev, book: bookName, chapter: chapter || prev.chapter, verse: verse || prev.verse }));
    };

    // Update parsed selection when query changes (so direct typing works without clicking)
    useEffect(() => {
        const { bookName, chapter, verse } = parseQuery(query);
        // Fuzzy match book name to support abbreviations
        const exactBook = books.find(b =>
            b.name.toLowerCase() === bookName.toLowerCase() ||
            b.name.toLowerCase().startsWith(bookName.toLowerCase())
        );
        if (exactBook && chapter) {
            setParsedSelection({ book: exactBook.name, chapter, verse });
        }
    }, [query, books]);


    return (
        <div className={`flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100 ${className}`}>

            {/* Translation Selector - Kept Separate */}
            <div className="flex items-center space-x-2 w-auto">
                <Globe className="w-4 h-4 text-gray-400" />
                <select
                    value={selectedTranslation}
                    onChange={(e) => setSelectedTranslation(e.target.value)}
                    className="form-select block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                    {translations.map(t => (
                        <option key={t.id} value={t.abbreviation}>
                            {t.abbreviation} {!t.isLocal && '☁️'}
                        </option>
                    ))}
                    {translations.length === 0 && <option value="KJV">KJV</option>}
                </select>
            </div>

            {/* Unified Parsing Combobox */}
            <div className="flex-grow relative z-50">
                <div className="flex items-center space-x-2 w-full">
                    <Book className="w-4 h-4 text-gray-400" />
                    <Combobox value={query} onChange={handleBookSelect} nullable>
                        <div className="relative w-full">
                            <Combobox.Input
                                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={handleKeyDown}
                                displayValue={(val) => val} // Raw value
                                placeholder="e.g. Genesis 1:1 or John 3:16"
                                autoComplete="off" // Browser autocomplete off
                            />
                            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </Combobox.Button>

                            {/* Dropdown Options */}
                            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                                {filteredBooks.length === 0 && currentBookPart !== '' ? (
                                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                        No matching books.
                                    </div>
                                ) : (
                                    filteredBooks.map((book) => (
                                        <Combobox.Option
                                            key={book.id}
                                            className={({ active }) =>
                                                `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-600 text-white' : 'text-gray-900'
                                                }`
                                            }
                                            value={book.name}
                                        >
                                            {({ selected, active }) => (
                                                <>
                                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                        {book.name}
                                                    </span>
                                                    {/* Highlight match? */}
                                                </>
                                            )}
                                        </Combobox.Option>
                                    ))
                                )}
                            </Combobox.Options>
                        </div>
                    </Combobox>
                </div>
                <div className="text-xs text-gray-500 mt-1 ml-6">
                    Type a reference, e.g., "Gen 1:1" or "John 3:16"
                </div>
            </div>

        </div>
    );
};

export default BibleSelector;
