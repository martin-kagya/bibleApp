import sys
import json
import os
import signal
from vosk import Model, KaldiRecognizer

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Model path required"}))
        return

    model_path = sys.argv[1]
    if not os.path.exists(model_path):
        print(json.dumps({"error": f"Model not found at {model_path}"}))
        return

    try:
        model = Model(model_path)
        # Sample rate 16000 is standard for our app
        rec = KaldiRecognizer(model, 16000)
        
        # Signal that we are ready
        print(json.dumps({"status": "ready"}), flush=True)

        while True:
            # Read raw audio bytes from stdin (16000 samples, 16-bit, mono)
            # Each sample is 2 bytes, so for 400ms it's 0.4 * 16000 * 2 = 12800 bytes
            # But we can just read what's available
            data = sys.stdin.buffer.read(4000) 
            if not data:
                break
            
            # sys.stderr.write(f"Received {len(data)} bytes\n")
            # sys.stderr.flush()

            if rec.AcceptWaveform(data):
                result = json.loads(rec.Result())
                if result.get("text"):
                    print(json.dumps({"text": result["text"], "isFinal": True}), flush=True)
            else:
                result = json.loads(rec.PartialResult())
                if result.get("partial"):
                    print(json.dumps({"partial": result["partial"], "isFinal": False}), flush=True)

    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)

if __name__ == "__main__":
    main()
