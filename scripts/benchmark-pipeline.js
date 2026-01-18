const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { FasterWhisperService } = require('../services/fasterWhisperService');
const { parallelSearchService } = require('../services/parallelSearchService');
const { vectorDbService } = require('../services/vectorDbService');

// Config
const AUDIO_FILE = path.join(__dirname, '..', 'Bishop Isaac Oti Boateng – 15th January 2026-Acknowledge The Witnessing Of The Spirit-5 Minutes….mp3');

async function benchmark() {
    console.log('🏁 Starting Pipeline Benchmark (Robust Version)...');
    console.log(`📂 Audio: ${path.basename(AUDIO_FILE)}`);

    if (!fs.existsSync(AUDIO_FILE)) {
        console.error('❌ Audio file not found at:', AUDIO_FILE);
        process.exit(1);
    }

    // 1. Pre-load Models
    console.log('🧠 Pre-loading models for accurate latency measurement...');
    await vectorDbService.init();
    await vectorDbService.ensureExtractor('bge-base');
    console.log('✅ Models loaded.');

    const fasterWhisper = new FasterWhisperService();
    fasterWhisper.init();

    return new Promise((resolve) => {
        fasterWhisper.on('ready', () => {
            console.log('✅ Transcription Service Ready. Streaming audio...');

            const startTimestamp = Date.now();
            let resultCount = 0;
            let totalSearchLatency = 0;
            let pendingSearches = 0;
            let audioFinished = false;
            const resultsFoundTrace = [];

            // Stream audio via ffmpeg
            // Using -re to simulate real-time
            const ffmpeg = spawn('ffmpeg', [
                '-re',
                '-i', AUDIO_FILE,
                '-f', 's16le',
                '-ac', '1',
                '-ar', '16000',
                'pipe:1'
            ]);

            ffmpeg.stdout.on('data', (chunk) => {
                fasterWhisper.writeAudio(chunk);
            });

            fasterWhisper.on('transcript', (data) => {
                const now = Date.now();
                const totalElapsed = (now - startTimestamp) / 1000;

                if (data.isFinal) {
                    console.log(`[${totalElapsed.toFixed(1)}s] ✅ FINAL: "${data.text}"`);
                    const searchStart = Date.now();
                    pendingSearches++;

                    parallelSearchService.search(data.text, (type, searchData) => {
                        if (type === 'fast' || type === 'smart') {
                            const searchEnd = Date.now();
                            const latency = searchEnd - searchStart;

                            const res = searchData.results[0];
                            if (res) {
                                resultCount++;
                                totalSearchLatency += latency;
                                pendingSearches--;

                                const record = `   🔎 [${latency}ms] Ref: ${res.reference} (${res.confidence.toFixed(2)}) Source: ${searchData.source || 'llm'}`;
                                console.log(record);
                                resultsFoundTrace.push({
                                    timestamp: totalElapsed,
                                    text: data.text,
                                    result: res.reference,
                                    confidence: res.confidence,
                                    latency: latency,
                                    source: searchData.source || 'llm'
                                });
                            }
                        } else if (type === 'status' && searchData.state === 'idle') {
                            // Search finished with no results
                            pendingSearches--;
                        }
                    }, { isFinal: true });
                }
            });

            ffmpeg.stderr.on('data', () => { });

            ffmpeg.on('close', () => {
                console.log('🏁 Audio stream reached EOF.');
                audioFinished = true;

                // Wait for trailing results with a longer timeout
                const checkFinished = setInterval(() => {
                    if (pendingSearches <= 0) {
                        clearInterval(checkFinished);
                        finish();
                    }
                }, 1000);

                // Absolute timeout for safety
                setTimeout(() => {
                    if (audioFinished) finish();
                }, 60000);
            });

            function finish() {
                if (resolve.done) return;
                resolve.done = true;

                console.log('\n📊 Benchmark Summary:');
                console.log(`   - Total elapsed time: ${((Date.now() - startTimestamp) / 1000).toFixed(1)}s`);
                console.log(`   - Total results found: ${resultsFoundTrace.length}`);
                if (resultsFoundTrace.length > 0) {
                    console.log(`   - Avg Search Latency: ${(totalSearchLatency / resultsFoundTrace.length).toFixed(0)}ms`);
                    console.log('\n📈 Key Results Found:');
                    resultsFoundTrace.slice(0, 15).forEach(r => {
                        console.log(`     [${r.timestamp.toFixed(1)}s] ${r.result} (${r.confidence.toFixed(2)}) Source: ${r.source} | "${r.text.substring(0, 50)}..."`);
                    });
                }
                fasterWhisper.shutdown();
                resolve();
            }
        });
    });
}

benchmark().catch(console.error);
