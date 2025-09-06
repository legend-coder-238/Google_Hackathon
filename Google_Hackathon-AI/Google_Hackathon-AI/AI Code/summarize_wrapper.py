
import sys
import json
import os
from summarize import DocumentSummarizer

def main():
    if len(sys.argv) != 3:
        print(json.dumps({"success": False, "error": "File path and classification required"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    classification = sys.argv[2]
    
    try:
        summarizer = DocumentSummarizer()
        summary = summarizer.summarize(file_path, classification)
        
        result = {
            "success": True,
            "summary": summary
        }
        print(json.dumps(result))
        
    except Exception as e:
        result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
