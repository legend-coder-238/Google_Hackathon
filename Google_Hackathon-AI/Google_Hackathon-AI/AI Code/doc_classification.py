import os
import logging
from typing import Optional
from pathlib import Path
from utils import DocumentProcessor

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # dotenv not available, continue without it
    pass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import LangChain components
ChatGoogleGenerativeAI = None
PromptTemplate = None
StrOutputParser = None

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.prompts import PromptTemplate
    from langchain_core.output_parsers import StrOutputParser
    logger.info("LangChain imports successful")
except ImportError as e:
    logger.warning(f"LangChain imports failed: {e}. Using simple classification only.")
    ChatGoogleGenerativeAI = None
    PromptTemplate = None
    StrOutputParser = None

# --- Categories --- #
CATEGORIES = [
    "TRANSACTIONAL", 
    "DISPUTES", 
    "CORPORATE", 
    "REGULATORY", 
    "INTELLECTUAL_PROPERTY", 
    "OTHERS"
]

CATEGORY_GUIDELINES = """
- TRANSACTIONAL: Contracts, leases, employment offers, agreements between private parties.
- DISPUTES: Litigation, arbitration, lawsuits, court orders, complaints, judgments.
- CORPORATE: ONLY internal governance docs like incorporation papers, bylaws, board resolutions, shareholder agreements. 
             NEVER compliance filings, never contracts.
- REGULATORY: Statutory filings, permits, licenses, compliance documents submitted to regulators or government. 
              NOT corporate governance.
- INTELLECTUAL_PROPERTY: Patents, trademarks, copyrights, IP-related agreements.
- OTHERS: Anything else (newsletters, opinions, academic or training docs).
"""

# Simple classification prompt template
CLASSIFICATION_PROMPT = """
You are a legal document classifier. Analyze the following document text and classify it into exactly ONE of these categories:

{categories}

Classification Guidelines:
{guidelines}

Document Text (first 3000 characters):
{document_text}

Respond with exactly ONE WORD from the categories list above. No explanation needed.
Classification:
"""

def get_gemini_llm():
    """Initialize Gemini LLM with error handling."""
    try:
        # Try multiple ways to get the API key
        gemini_api_key = (
            os.getenv("GEMINI_API_KEY") or 
            os.getenv("GOOGLE_API_KEY") or
            None
        )
        
        # If still no key, try loading from parent directory .env
        if not gemini_api_key:
            try:
                env_path = Path(__file__).parent.parent.parent.parent / ".env"
                if env_path.exists():
                    with open(env_path, 'r') as f:
                        for line in f:
                            if line.startswith('GEMINI_API_KEY='):
                                gemini_api_key = line.split('=', 1)[1].strip()
                                break
            except Exception as e:
                logger.debug(f"Could not read .env file: {e}")
        
        if not gemini_api_key:
            logger.warning("GEMINI_API_KEY not found in environment variables")
            return None
        
        if ChatGoogleGenerativeAI is None:
            logger.warning("LangChain Google GenAI not available")
            return None
        
        # Set environment variable for Google API
        os.environ["GOOGLE_API_KEY"] = gemini_api_key
        
        # Try to create the LLM instance
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",  # Updated model name
            temperature=0,
            google_api_key=gemini_api_key
        )
        
        logger.info("Gemini LLM initialized successfully")
        return llm
        
    except Exception as e:
        logger.error(f"Failed to initialize Gemini LLM: {str(e)}")
        return None

def classify_document_simple(document_text: str) -> str:
    """Simple rule-based classification as fallback."""
    if not document_text or not document_text.strip():
        return "OTHERS"
        
    text_lower = document_text.lower()
    
    # Enhanced keyword-based classification with more keywords
    transactional_keywords = ['contract', 'agreement', 'lease', 'employment', 'service', 'purchase', 'sale', 'rental', 'vendor', 'supplier']
    disputes_keywords = ['lawsuit', 'litigation', 'court', 'plaintiff', 'defendant', 'judgment', 'dispute', 'arbitration', 'mediation', 'settlement']
    corporate_keywords = ['incorporation', 'bylaws', 'board', 'shareholder', 'resolution', 'articles', 'charter', 'governance', 'director']
    regulatory_keywords = ['permit', 'license', 'compliance', 'regulatory', 'filing', 'regulation', 'statute', 'code', 'ordinance']
    ip_keywords = ['patent', 'trademark', 'copyright', 'intellectual', 'ip', 'invention', 'design', 'trade secret']
    
    # Count keyword matches for more accurate classification
    transactional_score = sum(1 for word in transactional_keywords if word in text_lower)
    disputes_score = sum(1 for word in disputes_keywords if word in text_lower)
    corporate_score = sum(1 for word in corporate_keywords if word in text_lower)
    regulatory_score = sum(1 for word in regulatory_keywords if word in text_lower)
    ip_score = sum(1 for word in ip_keywords if word in text_lower)
    
    # Return category with highest score
    scores = {
        'TRANSACTIONAL': transactional_score,
        'DISPUTES': disputes_score,
        'CORPORATE': corporate_score,
        'REGULATORY': regulatory_score,
        'INTELLECTUAL_PROPERTY': ip_score
    }
    
    max_score = max(scores.values())
    if max_score > 0:
        for category, score in scores.items():
            if score == max_score:
                return category
    
    return "OTHERS"

def classify_document_with_ai(document_text: str) -> str:
    """AI-powered classification using Gemini."""
    try:
        llm = get_gemini_llm()
        if llm is None:
            logger.warning("LLM not available, using simple classification")
            return classify_document_simple(document_text)
        
        if PromptTemplate is None or StrOutputParser is None:
            logger.warning("LangChain components not available, using simple classification")
            return classify_document_simple(document_text)
        
        # Create prompt
        prompt_template = PromptTemplate(
            input_variables=["categories", "guidelines", "document_text"],
            template=CLASSIFICATION_PROMPT
        )
        
        # Create chain
        chain = prompt_template | llm | StrOutputParser()
        
        # Run classification
        result = chain.invoke({
            "categories": ", ".join(CATEGORIES),
            "guidelines": CATEGORY_GUIDELINES,
            "document_text": document_text[:3000]  # Limit text length
        })
        
        # Clean and validate result
        classification = result.strip().upper().split()[0]
        if classification in CATEGORIES:
            logger.info(f"AI classification successful: {classification}")
            return classification
        else:
            logger.warning(f"Invalid classification '{classification}', defaulting to OTHERS")
            return "OTHERS"
            
    except Exception as e:
        logger.error(f"AI classification failed: {str(e)}")
        return classify_document_simple(document_text)

def classify_document(file_path: str) -> str:
    """Main classification function that handles any supported file type."""
    try:
        logger.info(f"Starting classification for document: {file_path}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return "OTHERS"
        
        # Validate file type
        file_extension = Path(file_path).suffix.lower()
        supported_extensions = {'.pdf', '.txt', '.doc', '.docx'}
        if file_extension not in supported_extensions:
            logger.error(f"Unsupported file type: {file_extension}")
            return "OTHERS"
        
        # Load document
        processor = DocumentProcessor()
        documents = processor.load_document(file_path)
        
        if not documents:
            logger.error("No content found in document")
            return "OTHERS"
        
        # Combine all text
        full_text = "\n".join([doc.page_content for doc in documents if doc.page_content])
        
        if len(full_text.strip()) == 0:
            logger.error("Document contains no readable text")
            return "OTHERS"
        
        logger.info(f"Document loaded successfully, text length: {len(full_text)}")
        
        # Try AI classification first, fallback to simple
        classification = classify_document_with_ai(full_text)
        logger.info(f"Classification result: {classification}")
        return classification
        
    except Exception as e:
        logger.error(f"Document processing failed: {str(e)}")
        logger.exception("Full error traceback:")
        return "OTHERS"

# --- DocumentClassifier Class for Wrapper Compatibility --- #
class DocumentClassifier:
    """Document classifier with improved error handling and logging."""
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.DocumentClassifier")
        self.logger.info("DocumentClassifier initialized")
    
    def classify_document(self, file_path: str) -> str:
        """Classify document with consistent interface."""
        try:
            result = classify_document(file_path)
            self.logger.info(f"Classification completed for {file_path}: {result}")
            return result
        except Exception as e:
            self.logger.error(f"Classification failed for {file_path}: {str(e)}")
            return "OTHERS"

# --- Example --- #
if __name__ == "__main__":    
    pdf = r"E:\SUMGRIND\SAMPLE LEGAL DOCS\legal_doc_conflict.txt"
    print("Classification:", classify_document(pdf))
