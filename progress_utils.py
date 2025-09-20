import json
import time
import os

PROGRESS_FILE = "progress.json"

def init_progress():
    """Reset progress file to 0%."""
    with open(PROGRESS_FILE, "w") as f:
        json.dump({"progress": 0}, f)

def update_progress(step, total_steps):
    """Update progress.json with current percentage."""
    progress = int((step / total_steps) * 100)
    with open(PROGRESS_FILE, "w") as f:
        json.dump({"progress": progress}, f)

# Example usage inside ingestion
def process_document(chunks):
    init_progress()
    total = len(chunks)

    for i, chunk in enumerate(chunks, start=1):
        # ---- your processing logic here ----
        time.sleep(0.5)  # simulate work

        # update progress
        update_progress(i, total)
