
import sys
import json
import os
from ingest import DocumentIngestor

def main():
    if len(sys.argv) != 3:
        print(json.dumps({"success": False, "error": "File path and document ID required"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    document_id = sys.argv[2]
    
    try:
        ingestor = DocumentIngestor()
        result = ingestor.ingest_document(file_path, document_id)
        
        response = {
            "success": True,
            "document_id": document_id,
            "chunks_created": result.get('chunks_created', 0)
        }
        print(json.dumps(response))
        
    except Exception as e:
        response = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(response))
        sys.exit(1)

if __name__ == "__main__":
    main()
