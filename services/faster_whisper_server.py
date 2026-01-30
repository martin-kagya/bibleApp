import sys
import json
import struct
import time
import threading
import queue
import numpy as np
import signal
import atexit
from faster_whisper import WhisperModel

# Configuration
MODEL_SIZE = "small.en"  # Balanced for speed and accuracy
DEVICE = "cpu"          # "cuda" if GPU is available
COMPUTE_TYPE = "int8"   # or "float32"
SAMPLE_RATE = 16000
CHANNELS = 1
BYTES_PER_SAMPLE = 2     # 16-bit
WINDOW_STEP = 0.2       # Transcribe every 0.2s of new audio (lowered from 0.4s) for faster feedback
INITIAL_PROMPT = "Pneuma World Ministries, Bishop Isaac Oti Boateng, Hallelujah, Amen, Scripture, Genesis, Revelation, Jesus Christ, Holy Spirit, Witnessing."

# Global State
audio_queue = queue.Queue()
running = True

def log(msg):
    sys.stderr.write(f"[Python] {msg}\n")
    sys.stderr.flush()

def safe_print(msg_obj):
    """Safely print JSON to stdout with error handling."""
    try:
        print(json.dumps(msg_obj), flush=True)
    except BrokenPipeError:
        log("Broken pipe on stdout, exiting...")
        global running
        running = False
    except Exception as e:
        log(f"Print error: {e}")

def read_stdin():
    """Reads audio from stdin and puts chunks into queue."""
    global running
    chunk_size = 4096
    while running:
        try:
            data = sys.stdin.buffer.read(chunk_size)
            if not data:
                log("Stdin closed, exiting...")
                break
            audio_queue.put(data)
        except EOFError:
            log("EOF on stdin, exiting...")
            break
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
        # Signal failure if possible
        try:
            print(json.dumps({"type": "error", "message": str(e)}), flush=True)
        except:
            pass
        return

    # Start reader thread
    reader_thread = threading.Thread(target=read_stdin, daemon=True)
    reader_thread.start()

    log("Ready to process audio.")
    safe_print({"type": "ready"})

    # Buffer for audio float32 (normalized)
    audio_buffer = np.array([], dtype=np.float32)
    
    last_transcription_time = time.time()
    last_audio_time = time.time()
    has_new_audio = False
    
    while running:
        # 1. Consume Queue
        new_data = bytearray()
        try:
            while not audio_queue.empty():
                new_data.extend(audio_queue.get())
                has_new_audio = True
                last_audio_time = time.time()
        except Exception as e:
            log(f"Queue Error: {e}")
        
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
            
            try:
                segments, info = model.transcribe(
                    audio_buffer, 
                    beam_size=1,
                    language="en", 
                    initial_prompt=INITIAL_PROMPT,
                    condition_on_previous_text=True, # Improved context
                    vad_filter=True,
                    vad_parameters=dict(
                        min_silence_duration_ms=400, # Faster VAD triggering
                        speech_pad_ms=200
                    )
                )
                
                segments = list(segments)
            except Exception as e:
                log(f"Transcription Error: {e}")
                continue
            
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
                safe_print(msg)
                
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
                safe_print(msg)
        
        time.sleep(0.01) # fast loop to drain queue

def signal_handler(sig, frame):
    log(f"Received signal {sig}, initiating shutdown...")
    global running
    running = False

def cleanup():
    log("Running cleanup...")
    # Add any specific model cleanup if required by Faster-Whisper
    # Currently, letting references go is usually enough, but explicit is better for multiproc
    log("Cleanup complete.")

if __name__ == "__main__":
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    atexit.register(cleanup)
    
    try:
        main()
    except KeyboardInterrupt:
        pass
    except Exception as e:
        log(f"FATAL: {e}")
    finally:
        log("Process exiting.")
