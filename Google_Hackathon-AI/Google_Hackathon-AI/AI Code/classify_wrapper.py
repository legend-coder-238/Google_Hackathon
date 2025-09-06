
import sys
import json
import os
from doc_classification import DocumentClassifier

def main():
    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "File path required"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        classifier = DocumentClassifier()
        classification = classifier.classify_document(file_path)
        
        result = {
            "success": True,
            "classification": classification
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
