const axios = require('axios')
require('dotenv').config()

const BIBLE_API_KEY = process.env.BIBLE_API_KEY
const BIBLE_API_BASE_URL = 'https://api.scripture.api.bible/v1'

async function listVersions() {
    try {
        const response = await axios.get(`${BIBLE_API_BASE_URL}/bibles`, {
            headers: { 'api-key': BIBLE_API_KEY },
            params: { language: 'eng' }
        })

        const versions = response.data.data
        console.log('Available English Versions:')
        versions.forEach(v => {
            console.log(`${v.abbreviation}: ${v.name} (${v.id})`)
        })
    } catch (error) {
        console.error('Error:', error.message)
        if (error.response) console.error(error.response.data)
    }
}

listVersions()
