import os
import sys
import urllib.request
import urllib.error
import time

FILES = [
    ("config.json", "https://huggingface.co/Xenova/bge-small-en-v1.5/resolve/main/config.json"),
    ("tokenizer.json", "https://huggingface.co/Xenova/bge-small-en-v1.5/resolve/main/tokenizer.json"),
    ("tokenizer_config.json", "https://huggingface.co/Xenova/bge-small-en-v1.5/resolve/main/tokenizer_config.json"),
    ("special_tokens_map.json", "https://huggingface.co/Xenova/bge-small-en-v1.5/resolve/main/special_tokens_map.json"),
    ("onnx/model_quantized.onnx", "https://huggingface.co/Xenova/bge-small-en-v1.5/resolve/main/onnx/model_quantized.onnx"),
]

BASE_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "models", "Xenova", "bge-small-en-v1.5")

def download_file(rel_path, url):
    dest_path = os.path.join(BASE_DIR, rel_path.replace("/", os.sep))
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 100:
        print(f"Already exists: {rel_path} ({os.path.getsize(dest_path)} bytes)")
        return True

    print(f"Downloading {rel_path} from {url}...")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    req = urllib.request.Request(url, headers=headers)
    max_retries = 3
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, timeout=120) as response, open(dest_path, "wb") as out_file:
                total_size = int(response.headers.get("Content-Length", 0))
                downloaded = 0
                chunk_size = 64 * 1024
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0 and downloaded % (1024 * 1024) < chunk_size:
                        percent = (downloaded / total_size) * 100
                        print(f"  {rel_path}: {downloaded / 1024 / 1024:.1f} MB / {total_size / 1024 / 1024:.1f} MB ({percent:.1f}%)")
            print(f"Successfully saved {rel_path} ({os.path.getsize(dest_path)} bytes)")
            return True
        except Exception as e:
            print(f"Error on attempt {attempt + 1}: {e}")
            if os.path.exists(dest_path):
                os.remove(dest_path)
            time.sleep(2)
    return False

def main():
    print(f"Target directory: {BASE_DIR}")
    for rel_path, url in FILES:
        success = download_file(rel_path, url)
        if not success:
            print(f"Failed to download {rel_path}")
            sys.exit(1)
    print("All model assets downloaded successfully!")

if __name__ == "__main__":
    main()
