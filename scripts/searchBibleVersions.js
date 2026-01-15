const axios = require('axios')
require('dotenv').config()

const BIBLE_API_KEY = process.env.BIBLE_API_KEY
const BIBLE_API_BASE_URL = 'https://api.scripture.api.bible/v1'

async function searchBibles(query) {
    try {
        const response = await axios.get(`${BIBLE_API_BASE_URL}/bibles`, {
            headers: { 'api-key': BIBLE_API_KEY }
        })

        const versions = response.data.data
        const matches = versions.filter(v =>
            v.name.toLowerCase().includes(query.toLowerCase()) ||
            v.abbreviation.toLowerCase().includes(query.toLowerCase())
        )

        console.log(`Searching for "${query}"... Found ${matches.length} matches:`)
        matches.forEach(v => {
            console.log(`${v.abbreviation}: ${v.name} (${v.id}) [Language: ${v.language.name}]`)
        })
    } catch (error) {
        console.error('Error:', error.message)
    }
}

searchBibles('Message')
searchBibles('MSG')
