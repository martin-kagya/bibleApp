import sys
import json
import struct
import time
import threading
import queue
import numpy as np
from faster_whisper import WhisperModel

# Configuration
MODEL_SIZE = "base.en"  # "tiny", "base", "small", "medium", "large-v3"
DEVICE = "cpu"          # "cuda" if GPU is available (mac: "cpu" usually, or "mps" but CTranslate2 might need specific build)
COMPUTE_TYPE = "int8"   # or "float32"
SAMPLE_RATE = 16000
CHANNELS = 1
BYTES_PER_SAMPLE = 2     # 16-bit
WINDOW_STEP = 0.5       # Transcribe every 0.5s of new audio

# Global State
audio_queue = queue.Queue()
running = True

def log(msg):
    sys.stderr.write(f"[Python] {msg}\n")
    sys.stderr.flush()

def read_stdin():
    """Reads audio from stdin and puts chunks into queue."""
    global running
    chunk_size = 4096
    while running:
        try:
            data = sys.stdin.buffer.read(chunk_size)
            if not data:
                break
            audio_queue.put(data)
        except Exception as e:
            log(f"Stdin Error: {e}")
            break
    running = False

def main():
    log(f"Loading Faster-Whisper model: {MODEL_SIZE} on {DEVICE}...")
    try:
        model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
        log("Model loaded successfully.")
    except Exception as e:
        log(f"Failed to load model: {e}")
        return

    # Start reader thread
    reader_thread = threading.Thread(target=read_stdin, daemon=True)
    reader_thread.start()

    log("Ready to process audio.")
    print(json.dumps({"type": "ready"}), flush=True)

    # Buffer for audio float32 (normalized)
    audio_buffer = np.array([], dtype=np.float32)
    
    last_transcription_time = time.time()
    last_audio_time = time.time()
    has_new_audio = False
    
    while running:
        # 1. Consume Queue
        new_data = bytearray()
        while not audio_queue.empty():
            new_data.extend(audio_queue.get())
            has_new_audio = True
            last_audio_time = time.time()
        
        if new_data:
            # Convert PCM16 -> Float32
            short_count = len(new_data) // 2
            if short_count > 0:
                valid_len = short_count * 2
                shorts = struct.unpack(f"{short_count}h", new_data[:valid_len])
                floats = np.array(shorts, dtype=np.float32) / 32768.0
                audio_buffer = np.concatenate((audio_buffer, floats))

        # 2. Check if we should transcribe
        now = time.time()
        silence_duration = now - last_audio_time
        
        # Conditions to transcribe:
        # A) We have new data and enough time passed (0.5s)
        # B) We have a buffer, it's been silent for > 2s, and we haven't finalized it yet.
        
        should_transcribe = False
        force_finalize = False
        
        if len(audio_buffer) > 0:
            if has_new_audio and (now - last_transcription_time > WINDOW_STEP):
                should_transcribe = True
            elif silence_duration > 2.0: # Silence timeout
                should_transcribe = True
                force_finalize = True
        
        if should_transcribe:
            last_transcription_time = now
            has_new_audio = False # Reset flag
            
            segments, info = model.transcribe(
                audio_buffer, 
                beam_size=1,
                language="en", 
                condition_on_previous_text=False,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            
            segments = list(segments)
            
            if not segments:
                if force_finalize:
                    audio_buffer = np.array([], dtype=np.float32) # Clear empty buffer
                continue

            final_segments_count = 0
            if force_finalize:
                final_segments_count = len(segments) # Finalize EVERYTHING
            elif len(segments) > 1:
                final_segments_count = len(segments) - 1
            elif len(audio_buffer) > 10 * SAMPLE_RATE:
                final_segments_count = 1
            
            # Process Finals
            for i in range(final_segments_count):
                seg = segments[i]
                msg = {"type": "final", "text": seg.text.strip(), "start": seg.start, "end": seg.end}
                print(json.dumps(msg), flush=True)
                log(f"Final: {seg.text}")
                
            # Remove finalized audio from buffer
            if final_segments_count > 0:
                if force_finalize:
                    audio_buffer = np.array([], dtype=np.float32)
                else:
                    last_final_seg = segments[final_segments_count - 1]
                    cut_sample = int(last_final_seg.end * SAMPLE_RATE)
                    cut_sample = min(cut_sample, len(audio_buffer))
                    audio_buffer = audio_buffer[cut_sample:]

            # Process Partial (Last segment)
            if not force_finalize and final_segments_count < len(segments):
                partial_seg = segments[-1]
                msg = {"type": "partial", "text": partial_seg.text.strip()}
                print(json.dumps(msg), flush=True)
        
        time.sleep(0.01) # fast loop to drain queue

if __name__ == "__main__":
    main()
