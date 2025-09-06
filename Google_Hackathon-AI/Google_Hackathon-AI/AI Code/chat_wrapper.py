
import sys
import json
import os
from chatbot import LegalDocumentChatbot

def main():
    if len(sys.argv) != 4:
        print(json.dumps({"success": False, "error": "Message, document ID, and mode required"}))
        sys.exit(1)
    
    message = sys.argv[1]
    document_id = sys.argv[2]
    mode = sys.argv[3]
    
    try:
        # Initialize chatbot
        gemini_api_key = os.getenv('GEMINI_API_KEY')
        if not gemini_api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
            
        chatbot = LegalDocumentChatbot(gemini_api_key=gemini_api_key)
        
        # Process the message
        if mode == 'qna':
            response = chatbot.answer_question(message)
        elif mode == 'summarize':
            response = chatbot.summarize_document()
        elif mode == 'explain':
            response = chatbot.explain_clause(message)
        else:
            response = chatbot.answer_question(message)
        
        result = {
            "success": True,
            "response": response,
            "sources": [],
            "mode": mode
        }
        print(json.dumps(result))
        
    except Exception as e:
        result = {
            "success": False,
            "error": str(e),
            "response": "I apologize, but I'm having trouble processing your request right now. Please try again later."
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
