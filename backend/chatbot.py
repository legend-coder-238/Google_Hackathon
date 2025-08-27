"""
RAG-powered chatbot for Legal Document Assistant
Implements three modes: Summarize, QnA, and Explain Clauses
"""

import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

from dotenv import load_dotenv

# LangChain imports
from langchain.chains import ConversationalRetrievalChain, RetrievalQA
from langchain.chains.question_answering import load_qa_chain
from langchain_community.vectorstores import Pinecone, FAISS
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferMemory

# Local imports
from utils import DocumentProcessor, EmbeddingManager

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- PROMPT TEMPLATES FOR SUMMARIZATION ---
PROMPT_TEMPLATES = {
    "TRANSACTIONAL": PromptTemplate(
        template=(
            "You are a legal expert specializing in transactional law. "
            "Summarize the following legal document content, focusing on key transactional details. "
            "Provide a structured summary under the following headings:\n"
            "1.  **Document Type & Purpose**: (e.g., Sales Agreement, Lease, Loan Agreement)\n"
            "2.  **Parties Involved**: (List all parties with their roles, e.g., Buyer, Seller, Lender)\n"
            "3.  **Key Financial Terms**: (e.g., Purchase Price, Loan Amount, Payment Schedule, Interest Rate)\n"
            "4.  **Core Obligations & Deliverables**: (What must each party do? What is being exchanged?)\n"
            "5.  **Critical Dates & Deadlines**: (e.g., Closing Date, Expiration Date, Notice Periods)\n"
            "6.  **Governing Law & Jurisdiction**: (e.g., State of Delaware, USA)\n\n"
            "## Document Content:\n\n{chunk}\n\n"
            "## Structured Summary:"
        ),
        input_variables=["chunk"],
    ),
    "LITIGATION": PromptTemplate(
        template=(
            "You are a senior litigator. Summarize the following legal document content, "
            "focusing on aspects relevant to litigation. Provide a structured summary under the following headings:\n"
            "1.  **Document Type**: (e.g., Complaint, Motion to Dismiss, Discovery Request)\n"
            "2.  **Case Information**: (Case Name, Court, Docket Number if available)\n"
            "3.  **Parties Involved**: (Plaintiff, Defendant, etc.)\n"
            "4.  **Core Allegations/Arguments**: (Summarize the main legal claims or arguments being made)\n"
            "5.  **Relief Sought**: (What is the filing party asking the court to do? e.g., Monetary Damages, Injunction)\n"
            "6.  **Key Factual Allegations**: (List the most important facts presented to support the arguments)\n\n"
            "## Document Content:\n\n{chunk}\n\n"
            "## Structured Summary:"
        ),
        input_variables=["chunk"],
    ),
    "REGULATORY": PromptTemplate(
        template=(
            "You are a regulatory compliance specialist. Summarize the following legal document content, "
            "focusing on compliance and regulatory requirements. Provide a structured summary under the following headings:\n"
            "1.  **Document Type & Regulatory Body**: (e.g., SEC Filing 10-K, EPA Compliance Report)\n"
            "2.  **Purpose of Filing/Report**: (What is the document's objective?)\n"
            "3.  **Key Regulations or Statutes Cited**: (List the primary laws or rules involved)\n"
            "4.  **Compliance Requirements & Deadlines**: (What actions are required and by when?)\n"
            "5.  **Reported Data/Findings**: (Summarize the key data or information being reported)\n"
            "6.  **Penalties for Non-Compliance (if mentioned)**: (What are the consequences of failure to comply?)\n\n"
            "## Document Content:\n\n{chunk}\n\n"
            "## Structured Summary:"
        ),
        input_variables=["chunk"],
    ),
    "INTELLECTUAL_PROPERTY": PromptTemplate(
        template=(
            "You are an intellectual property attorney. Summarize the following IP-related legal document content. "
            "Provide a structured summary under the following headings:\n"
            "1.  **Document Type**: (e.g., Patent Application, Trademark Filing, Licensing Agreement)\n"
            "2.  **IP Asset in Question**: (Describe the invention, brand name, or creative work)\n"
            "3.  **Applicant/Owner & Assignee**: (Who owns or is applying for the IP rights?)\n"
            "4.  **Scope of Rights**: (What protection is sought or granted? e.g., Claims of a patent, goods/services for a trademark)\n"
            "5.  **Key Dates**: (e.g., Filing Date, Priority Date, Expiration Date)\n"
            "6.  **Geographic Scope**: (In which countries or regions do the rights apply?)\n\n"
            "## Document Content:\n\n{chunk}\n\n"
            "## Structured Summary:"
        ),
        input_variables=["chunk"],
    ),
    "OTHERS": PromptTemplate(
        template=(
            "You are an expert legal analyst. Your task is to provide a clear, concise, and neutral summary of the provided legal document content. "
            "Focus on extracting the most critical information that a layperson can understand.\n\n"
            "Please structure your summary with the following sections:\n"
            "- **Document Type**: Identify the type of document (e.g., Contract, Will, Court Order, Policy Document).\n"
            "- **Main Purpose**: What is the primary goal or objective of this document?\n"
            "- **Key Parties**: Who are the main individuals or entities involved?\n"
            "- **Core Information**: Summarize the most important points, obligations, rights, and factual statements in bullet points.\n"
            "- **Important Dates & Numbers**: List any critical dates, deadlines, or monetary amounts mentioned.\n\n"
            "## Document Content:\n\n{chunk}\n\n"
            "## General Legal Summary:"
        ),
        input_variables=["chunk"],
    ),
}

MASTER_SUMMARY_PROMPT = PromptTemplate(
    template=(
        "You are a senior legal analyst responsible for synthesizing information from multiple sources. "
        "The following text consists of individual summaries from each page of a large legal document. "
        "Your task is to create a single, cohesive, and comprehensive master summary from these page summaries.\n\n"
        "Ensure the final summary is well-structured, easy to read, and accurately reflects the key information from across the entire document. "
        "Organize the summary logically, using the same headings as the page summaries if possible (e.g., Document Type, Parties, Key Obligations, etc.). "
        "Eliminate redundancy and connect related points from different pages.\n\n"
        "## Combined Page Summaries:\n\n{combined_summaries}\n\n"
        "## Final Master Summary:\n"
    ),
    input_variables=["combined_summaries"],
)

class LegalDocumentChatbot:
    """RAG-powered chatbot for legal document analysis"""
    
    def __init__(self, 
                 vectorstore_path: str = "faiss_index",
                 embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
                 gemini_api_key: str = None):
        """
        Initialize the legal document chatbot
        
        Args:
            vectorstore_path: Path to FAISS index or Pinecone index name
            embedding_model: Name of embedding model
            gemini_api_key: Gemini API key (required)
        """
        if not gemini_api_key:
            raise ValueError("Gemini API key is required. Please provide a valid API key.")
        
        self.vectorstore_path = vectorstore_path
        self.embedding_model = embedding_model
        self.gemini_api_key = gemini_api_key
        
        # Initialize components
        self.embedding_manager = EmbeddingManager(embedding_model)
        self.doc_processor = DocumentProcessor()
        self.vectorstore = None
        self.llm = None
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        # Load vector store
        self._load_vectorstore()
        
        # Initialize LLM
        self._initialize_llm()
        
        # Initialize chains
        self._initialize_chains()
    
    def _load_vectorstore(self):
        """Load the vector store"""
        try:
            # Try to load FAISS index
            if os.path.exists(self.vectorstore_path):
                self.vectorstore = FAISS.load_local(
                    self.vectorstore_path, 
                    self.embedding_manager.get_embeddings(),
                    allow_dangerous_deserialization=True
                )
                logger.info(f"Loaded FAISS index from: {self.vectorstore_path}")
            else:
                logger.warning(f"Vector store not found at: {self.vectorstore_path}")
                # Create empty FAISS index for demo
                self.vectorstore = FAISS.from_texts(
                    ["This is a placeholder document for demo purposes."],
                    self.embedding_manager.get_embeddings()
                )
                logger.info("Created placeholder vector store for demo")
                
        except Exception as e:
            logger.error(f"Error loading vector store: {str(e)}")
            raise
    
    def _initialize_llm(self):
        """Initialize the language model"""
        try:
            # Use real Gemini API
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.0-flash",
                google_api_key=self.gemini_api_key,
                temperature=0.3
            )
            logger.info("Initialized Gemini LLM with API key")
                
        except Exception as e:
            logger.error(f"Error initializing LLM: {str(e)}")
            raise
    
    def _initialize_chains(self):
        """Initialize the RAG chains"""
        # Custom prompts for different modes
        self.summarize_prompt = PromptTemplate(
            input_variables=["context"],
            template="""
            You are a legal document assistant. Based on the following legal document content, 
            provide a clear, concise summary that explains the key points in simple language.
            
            Document Content:
            {context}
            
            Please provide a summary that includes:
            1. Document type and purpose
            2. Key terms and conditions
            3. Important dates and amounts
            4. Rights and responsibilities of parties involved
            5. Any important clauses or conditions
            
            Summary:
            """
        )
        
        self.qa_prompt = PromptTemplate(
            input_variables=["context", "question"],
            template="""
            You are a legal document assistant. Answer the following question based on the 
            provided legal document content. Provide clear, accurate, and helpful information.
            
            Document Content:
            {context}
            
            Question: {question}
            
            Answer:
            """
        )
        
        self.explain_prompt = PromptTemplate(
            input_variables=["context", "clause"],
            template="""
            You are a legal document assistant. Explain the following legal clause or section 
            in simple, easy-to-understand language. Break down complex legal terms and explain 
            what they mean for the average person.
            
            Document Content:
            {context}
            
            Clause/Section to Explain: {clause}
            
            Explanation:
            """
        )
        
        # Initialize chains
        self.qa_chain = load_qa_chain(
            llm=self.llm,
            chain_type="stuff",
            prompt=self.qa_prompt
        )
        
        self.summarize_chain = load_qa_chain(
            llm=self.llm,
            chain_type="stuff",
            prompt=self.summarize_prompt
        )
        
        self.explain_chain = load_qa_chain(
            llm=self.llm,
            chain_type="stuff",
            prompt=self.explain_prompt
        )
    
    def answer_question(self, question: str, max_chunks: int = 5) -> str:
        """
        Answer a question based on the uploaded documents
        
        Args:
            question: User's question
            max_chunks: Maximum number of chunks to retrieve
            
        Returns:
            Answer to the question
        """
        try:
            if not self.vectorstore:
                return "No documents have been uploaded yet. Please upload a document first."
            
            if not question.strip():
                return "Please provide a question to answer."
            
            # Retrieve relevant chunks
            docs = self.vectorstore.similarity_search(
                question,
                k=max_chunks
            )
            
            # Generate answer
            response = self.qa_chain.run({
                "input_documents": docs,
                "question": question
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error answering question: {str(e)}")
            return f"Error answering question: {str(e)}"
    
    def explain_clause(self, clause: str, max_chunks: int = 5) -> str:
        """
        Explain a specific legal clause or section
        
        Args:
            clause: The clause or section to explain
            max_chunks: Maximum number of chunks to retrieve
            
        Returns:
            Explanation of the clause
        """
        try:
            if not self.vectorstore:
                return "No documents have been uploaded yet. Please upload a document first."
            
            if not clause.strip():
                return "Please provide a clause or section to explain."
            
            # Retrieve relevant chunks
            docs = self.vectorstore.similarity_search(
                clause,
                k=max_chunks
            )
            
            # Generate explanation
            response = self.explain_chain.run({
                "input_documents": docs,
                "clause": clause
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error explaining clause: {str(e)}")
            return f"Error explaining clause: {str(e)}"
    
    def get_document_info(self) -> Dict[str, Any]:
        """
        Get information about the loaded documents
        
        Returns:
            Dictionary with document information
        """
        try:
            if not self.vectorstore:
                return {"status": "No documents loaded"}
            
            # Get document count
            doc_count = len(self.vectorstore.docstore._dict)
            
            # Get sample documents
            sample_docs = self.vectorstore.similarity_search("", k=3)
            sources = list(set([doc.metadata.get('source', 'Unknown') for doc in sample_docs]))
            
            return {
                "status": "Documents loaded",
                "document_count": doc_count,
                "sources": sources,
                "vectorstore_type": type(self.vectorstore).__name__
            }
            
        except Exception as e:
            logger.error(f"Error getting document info: {str(e)}")
            return {"status": f"Error: {str(e)}"}
            
    def summarize_document(self, pdf_path: str, category: Optional[str] = None) -> str:
        """
        Summarizes a legal document, choosing a strategy based on its length.

        Args:
            pdf_path: The path to the PDF document.
            category: The legal category of the document (e.g., "TRANSACTIONAL"). 
                      If None, it will be classified automatically.

        Returns:
            A string containing the summary.
        """
        if not self.llm:
            return "LLM not initialized. Cannot summarize."

        # 1. Classify document if category is not provided
        if not category:
            try:
                # This assumes doc_classification.py exists and is correct
                from doc_classification import classify_document
                category = classify_document(pdf_path)
                logger.info(f"Document classified as: {str(category)}")
            except (ImportError, ModuleNotFoundError):
                logger.warning(
                    "'doc_classification' module not found. Defaulting to 'OTHERS'."
                )
                category = "OTHERS"
            except Exception as e:
                logger.error(f"Error during document classification: {e}")
                logger.warning("Defaulting to 'OTHERS' category due to classification error.")
                category = "OTHERS"

        prompt = PROMPT_TEMPLATES.get(str(category), PROMPT_TEMPLATES["OTHERS"])

        try:
            page_count = self.doc_processor.get_page_count(pdf_path)
            logger.info(f"Document '{os.path.basename(pdf_path)}' has {page_count} pages.")

            # 2. Choose summarization strategy based on page count
            if page_count < 10:
                logger.info("Document is short (<10 pages). Using single-pass summarization.")
                full_text = self.doc_processor.get_full_text(pdf_path)
                
                chain = prompt | self.llm | StrOutputParser()
                summary = chain.invoke({"chunk": full_text})
                return summary
            else:
                logger.info("Document is long (>=10 pages). Using map-reduce summarization.")
                page_summaries = []
                page_summary_chain = prompt | self.llm | StrOutputParser()

                for i in range(page_count):
                    page_text = self.doc_processor.get_text_from_page(pdf_path, i)
                    if page_text.strip():
                        page_summary = page_summary_chain.invoke({"chunk": page_text})
                        page_summaries.append(page_summary)
                        logger.info(f"Generated summary for page {i + 1}/{page_count}")
                
                logger.info("Combining page summaries to create a master summary...")
                combined_summaries = "\n\n---\n\n".join(page_summaries)
                master_summary_chain = MASTER_SUMMARY_PROMPT | self.llm | StrOutputParser()
                final_summary = master_summary_chain.invoke({"combined_summaries": combined_summaries})
                return final_summary

        except Exception as e:
            logger.error(f"An error occurred during summarization: {e}")
            return f"Error: Could not summarize the document. {e}"

def create_chatbot(api_key: str):
    """Create a chatbot instance with the provided API key"""
    return LegalDocumentChatbot(
        vectorstore_path="legal_docs_faiss",
        gemini_api_key=api_key
    )

if __name__ == "__main__":
    # Add project root to path for direct execution
    if __package__ is None:
        import sys
        sys.path.append(str(Path(__file__).parent.parent))

    # Example usage - requires API key
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        exit(1)
    

    chatbot = create_chatbot(api_key)
    
    # Test different modes
    print("\n=== Document Summary ===")
    summary = chatbot.summarize_document(pdf_path=r"E:\SUMGRIND\SAMPLE LEGAL DOCS\DUMMYDOCS.txt")
    print(summary)
    
    print("\n=== Question Answering ===")
    answer = chatbot.answer_question("What is the monthly rent?")
    print(answer)
    
    print("\n=== Clause Explanation ===")
    explanation = chatbot.explain_clause("termination clause")
    print(explanation)
    
    print("\n=== Document Info ===")
    info = chatbot.get_document_info()
    print(info)
