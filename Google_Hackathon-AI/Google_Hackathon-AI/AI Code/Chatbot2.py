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
from langchain.chains.retrieval import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains.history_aware_retriever import create_history_aware_retriever
from langchain_community.vectorstores import FAISS
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI


# Local imports
from utils import DocumentProcessor, EmbeddingManager

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- PROMPT TEMPLATES (omitted for brevity) ---
PAGE_PROMPTS_BY_CATEGORY = {
    "TRANSACTIONAL": PromptTemplate(
        template=(
            "You are a legal expert specializing in transactional law, analyzing a single page of a larger document. "
            "Your task is to summarize the content of this page, focusing only on transactional details explicitly mentioned here. "
            "For each heading, provide the information if it is on this page. If not, state 'Not Mentioned on this Page'. "
            "Your entire response must be in plain text. Do not use Markdown, bolding, or numbered lists.\n\n"
            "## Document Page Content:\n\n{chunk}\n\n"
            "## Page Summary (Transactional):\n\n"
            "Document Type & Purpose:\n"
            "Parties Involved:\n"
            "Key Financial Terms:\n"
            "Core Obligations & Deliverables:\n"
            "Critical Dates & Deadlines:\n"
            "Governing Law & Jurisdiction:"
        ),
        input_variables=["chunk"],
    ),
    "DISPUTES": PromptTemplate(
        template=(
            "You are a litigation specialist analyzing a single page of a larger court or disputes document. "
            "Your task is to summarize the content of this page, focusing only on details relevant to the dispute mentioned here. "
            "For each heading, provide the information if it is on this page. If not, state 'Not Mentioned on this Page'. "
            "Your entire response must be in plain text. Do not use Markdown, bolding, or numbered lists.\n\n"
            "## Document Page Content:\n\n{chunk}\n\n"
            "## Page Summary (Disputes):\n\n"
            "Document Type:\n"
            "Case Information:\n"
            "Parties Involved:\n"
            "Core Allegations/Arguments:\n"
            "Relief Sought:\n"
            "Key Factual Allegations:"
        ),
        input_variables=["chunk"],
    ),
    "CORPORATE": PromptTemplate(
        template=(
            "You are a corporate lawyer analyzing a single page of a larger corporate governance document. "
            "Your task is to summarize this page, focusing on corporate actions and details explicitly mentioned here. "
            "For each heading, provide the information if it is on this page. If not, state 'Not Mentioned on this Page'. "
            "Your entire response must be in plain text. Do not use Markdown, bolding, or numbered lists.\n\n"
            "## Document Page Content:\n\n{chunk}\n\n"
            "## Page Summary (Corporate):\n\n"
            "Document Type:\n"
            "Entity Name:\n"
            "Governing Body & Parties:\n"
            "Core Actions or Agreements:\n"
            "Key Dates & Effective Terms:\n"
            "Voting or Approval Details:"
        ),
        input_variables=["chunk"],
    ),
    "REGULATORY": PromptTemplate(
        template=(
            "You are a regulatory compliance specialist analyzing a single page of a larger filing. "
            "Your task is to summarize the content of this page, focusing only on regulatory details explicitly mentioned here. "
            "For each heading, provide the information if it is on this page. If not, state 'Not Mentioned on this Page'. "
            "Your entire response must be in plain text. Do not use Markdown, bolding, or numbered lists.\n\n"
            "## Document Page Content:\n\n{chunk}\n\n"
            "## Page Summary (Regulatory):\n\n"
            "Document Type & Regulatory Body:\n"
            "Purpose of Filing/Report:\n"
            "Key Regulations or Statutes Cited:\n"
            "Compliance Requirements & Deadlines:\n"
            "Reported Data/Findings:\n"
            "Penalties for Non-Compliance (if mentioned):"
        ),
        input_variables=["chunk"],
    ),
    "INTELLECTUAL_PROPERTY": PromptTemplate(
        template=(
            "You are an intellectual property attorney analyzing a single page of a larger IP document. "
            "Your task is to summarize this page, focusing on IP details explicitly mentioned here. "
            "For each heading, provide the information if it is on this page. If not, state 'Not Mentioned on this Page'. "
            "Your entire response must be in plain text. Do not use Markdown, bolding, or numbered lists.\n\n"
            "## Document Page Content:\n\n{chunk}\n\n"
            "## Page Summary (Intellectual Property):\n\n"
            "Document Type:\n"
            "IP Asset in Question:\n"
            "Applicant/Owner & Assignee:\n"
            "Scope of Rights:\n"
            "Key Dates:\n"
            "Geographic Scope:"
        ),
        input_variables=["chunk"],
    ),
    "OTHERS": PromptTemplate(
        template=(
            "You are an expert legal analyst summarizing a single page of a legal document for a layperson. "
            "Your task is to extract the most critical information from this page only. "
            "For each heading, provide the information if it is on this page. If not, state 'Not Mentioned on this Page'. "
            "Your response must be in plain text. Do not use Markdown formatting like bolding. Use a hyphen (-) for bullet points in the 'Core Information' section if needed.\n\n"
            "## Document Page Content:\n\n{chunk}\n\n"
            "## Page Summary (General):\n\n"
            "Document Type:\n"
            "Main Purpose:\n"
            "Key Parties:\n"
            "Core Information:\n"
            "Important Dates & Numbers:"
        ),
        input_variables=["chunk"],
    ),
}

MASTER_SUMMARY_PROMPTS = {
    "TRANSACTIONAL": PromptTemplate(
        template=(
            "You are a legal expert specializing in transactional law. "
            "You have been provided with a series of page-by-page summaries from a single legal contract. "
            "Synthesize all of this information into a single, comprehensive, and structured master summary. "
            "Your response must be in plain text. Do not use Markdown or bolding.\n\n"
            "## Combined Summaries:\n\n{combined_summaries}\n\n"
            "## Final Master Summary (Transactional):\n\n"
            "Document Type & Purpose:\n"
            "Parties Involved:\n"
            "Key Financial Terms:\n"
            "Core Obligations & Deliverables:\n"
            "Critical Dates & Deadlines:\n"
            "Governing Law & Jurisdiction:"
        ),
        input_variables=["combined_summaries"],
    ),
    "DISPUTES": PromptTemplate(
        template=(
            "You are a litigation specialist. "
            "You have been provided with a series of page-by-page summaries from a single disputes document. "
            "Synthesize all of this information into a single, comprehensive, and structured master summary. "
            "Your response must be in plain text. Do not use Markdown or bolding.\n\n"
            "## Combined Summaries:\n\n{combined_summaries}\n\n"
            "## Final Master Summary (Disputes):\n\n"
            "Document Type:\n"
            "Case Information:\n"
            "Parties Involved:\n"
            "Core Allegations/Arguments:\n"
            "Relief Sought:\n"
            "Key Factual Allegations:"
        ),
        input_variables=["combined_summaries"],
    ),
    "CORPORATE": PromptTemplate(
        template=(
            "You are a corporate lawyer. "
            "You have been provided with a series of page-by-page summaries from a single corporate governance document. "
            "Synthesize all of this information into a single, comprehensive, and structured master summary. "
            "Your response must be in plain text. Do not use Markdown or bolding.\n\n"
            "## Combined Summaries:\n\n{combined_summaries}\n\n"
            "## Final Master Summary (Corporate):\n\n"
            "Document Type:\n"
            "Entity Name:\n"
            "Governing Body & Parties:\n"
            "Core Actions or Agreements:\n"
            "Key Dates & Effective Terms:\n"
            "Voting or Approval Details:"
        ),
        input_variables=["combined_summaries"],
    ),
    "REGULATORY": PromptTemplate(
        template=(
            "You are a regulatory compliance specialist. "
            "You have been provided with a series of page-by-page summaries from a single regulatory document. "
            "Synthesize all of this information into a single, comprehensive, and structured master summary. "
            "Your response must be in plain text. Do not use Markdown or bolding.\n\n"
            "## Combined Summaries:\n\n{combined_summaries}\n\n"
            "## Final Master Summary (Regulatory):\n\n"
            "Document Type & Regulatory Body:\n"
            "Purpose of Filing/Report:\n"
            "Key Regulations or Statutes Cited:\n"
            "Compliance Requirements & Deadlines:\n"
            "Reported Data/Findings:\n"
            "Penalties for Non-Compliance (if mentioned):"
        ),
        input_variables=["combined_summaries"],
    ),
    "INTELLECTUAL_PROPERTY": PromptTemplate(
        template=(
            "You are an intellectual property attorney. "
            "You have been provided with a series of page-by-page summaries from a single IP document. "
            "Synthesize all of this information into a single, comprehensive, and structured master summary. "
            "Your response must be in plain text. Do not use Markdown or bolding.\n\n"
            "## Combined Summaries:\n\n{combined_summaries}\n\n"
            "## Final Master Summary (Intellectual Property):\n\n"
            "Document Type:\n"
            "IP Asset in Question:\n"
            "Applicant/Owner & Assignee:\n"
            "Scope of Rights:\n"
            "Key Dates:\n"
            "Geographic Scope:"
        ),
        input_variables=["combined_summaries"],
    ),
    "OTHERS": PromptTemplate(
        template=(
            "You are an expert legal analyst. "
            "You have been provided with a series of page-by-page summaries from a single legal document. "
            "Synthesize all of this information into a final, comprehensive, and structured master summary suitable for a layperson. "
            "Your response must be in plain text. Use a hyphen (-) for bullet points in the 'Core Information' section if needed.\n\n"
            "## Combined Summaries:\n\n{combined_summaries}\n\n"
            "## Final Master Summary (General):\n\n"
            "Document Type:\n"
            "Main Purpose:\n"
            "Key Parties:\n"
            "Core Information:\n"
            "Important Dates & Numbers:"
        ),
        input_variables=["combined_summaries"],
    ),
}

CONCISE_SUMMARY_PROMPT = PromptTemplate(
    input_variables=["detailed_summary"],
    template=(
        "You are an expert legal assistant. Your task is to convert the following structured, detailed summary of a single document page into a concise, easy-to-read paragraph. "
        "The paragraph should be approximately 5-6 sentences long. "
        "Use simple and clear language, avoiding complex legal jargon. "
        "Focus only on the most critical points mentioned in the detailed summary and do not add any new information.\n\n"
        "## Detailed Summary:\n\n{detailed_summary}\n\n"
        "## Concise Paragraph Summary:"
    )
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
        
        # >>>>> CHANGE 1: Initialize page_summaries attribute here <<<<<
        self.page_summaries: List[str] = [] 
        
        # --- MODERN CONVERSATIONAL APPROACH ---
        # No need for a separate memory object. We will manage history manually.
        self.chat_history: List = [] 
        self.rag_chain = None # The new, combined RAG chain
        
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
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash", # Use the latest powerful flash model
                google_api_key=self.gemini_api_key,
                temperature=0.2 # Slightly lower for more factual answers
            )
            logger.info("Initialized Gemini LLM with API key")
                
        except Exception as e:
            logger.error(f"Error initializing LLM: {str(e)}")
            raise
    
    def _initialize_chains(self):
        """Initialize the RAG chains using the modern LangChain approach"""
        if not self.vectorstore:
            logger.error("Vector store not initialized. Cannot create conversational chain.")
            return

        retriever = self.vectorstore.as_retriever(search_kwargs={"k": 4})

        # 1. Chain to rephrase the follow-up question
        rephrase_prompt = ChatPromptTemplate.from_messages([
            ("system", "Given a chat history and the latest user question "
                     "which might reference context in the chat history, "
                     "formulate a standalone question which can be understood "
                     "without the chat history. Do NOT answer the question, "
                     "just reformulate it if needed and otherwise return it as is."),
            ("placeholder", "{chat_history}"),
            ("human", "{input}"),
        ])
        
        context_retriever = create_history_aware_retriever(
            self.llm, retriever, rephrase_prompt
        )


        qa_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a legal document assistant. Answer the following question based on the "
                    "provided legal document content. Provide clear, accurate, and helpful information. "
                    "When asked to explain a specific article or clause, ensure your answer is comprehensive. "
                    "Include all relevant sub-sections, parts, and conditions mentioned in the provided text. Do not omit details. "
                    "If the information is not in the context, say that you cannot find the answer in the document.\n\n"
                    "**IMPORTANT: Your entire response must be in plain text. Do not use any Markdown formatting like asterisks for bolding or bullet points.**\n\n"
                    "Document Content:\n{context}"),
            ("placeholder", "{chat_history}"),
            ("human", "{input}"),
        ])
        
        question_answer_chain = create_stuff_documents_chain(self.llm, qa_prompt)

        # 3. Combine them into the final RAG chain
        self.rag_chain = create_retrieval_chain(context_retriever, question_answer_chain)
        logger.info("Initialized modern RAG chain (create_retrieval_chain)")
        
    def answer_question(self, question: str) -> str:
        """
        Answer a question based on the uploaded documents, maintaining conversation history.
        
        Args:
            question: User's question
            
        Returns:
            Answer to the question
        """
        try:
            if not self.rag_chain:
                return "The Question-Answering system is not initialized. Please upload a document first."
            
            if not question.strip():
                return "Please provide a question to answer."

            # Invoke the modern RAG chain with the current chat history
            response = self.rag_chain.invoke({
                "chat_history": self.chat_history,
                "input": question
            })
            
            # Update the chat history
            self.chat_history.append(HumanMessage(content=question))
            self.chat_history.append(AIMessage(content=response["answer"]))
            
            return response.get('answer', "Sorry, I couldn't generate an answer.")
            
        except Exception as e:
            logger.error(f"Error answering question: {str(e)}")
            return f"Error answering question: {str(e)}"
    
    def get_document_info(self) -> Dict[str, Any]:
        """
        Get information about the loaded documents
        
        Returns:
            Dictionary with document information
        """
        try:
            if not self.vectorstore:
                return {"status": "No documents loaded"}
            
            doc_count = len(self.vectorstore.docstore._dict)
            
            sample_docs = self.vectorstore.similarity_search("", k=5)
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
            
    def summarize_document(self, pdf_path: str, category: Optional[str] = None) -> Dict[str, Any]:
        """
        Summarizes each page of a legal document and also generates a master summary.
        """
        if not self.llm:
            raise ValueError("LLM not initialized. Cannot summarize.")

        if not category:
            try:
                from doc_classification import classify_document
                category = classify_document(pdf_path)
            except (ImportError, ModuleNotFoundError):
                category = "OTHERS"
            except Exception:
                category = "OTHERS"

        prompt = PAGE_PROMPTS_BY_CATEGORY.get(str(category), PAGE_PROMPTS_BY_CATEGORY["OTHERS"])
        master_prompt = MASTER_SUMMARY_PROMPTS.get(str(category), MASTER_SUMMARY_PROMPTS["OTHERS"])

        # >>>>> CHANGE 2: Assign the generated summaries to self.page_summaries <<<<<
        self.page_summaries = [] 
        page_summary_chain = prompt | self.llm | StrOutputParser()

        page_count = self.doc_processor.get_page_count(pdf_path)

        for i in range(page_count):
            page_text = self.doc_processor.get_text_from_page(pdf_path, i)
            if page_text.strip():
                summary = page_summary_chain.invoke({"chunk": page_text})
                self.page_summaries.append(summary)

        combined_summaries = "\n\n---\n\n".join(self.page_summaries)
        master_summary_chain = master_prompt | self.llm | StrOutputParser()
        master_summary = master_summary_chain.invoke({"combined_summaries": combined_summaries})

        return {
            "page_summaries": self.page_summaries,
            "master_summary": master_summary
        }
    
    def get_concise_page_summary(self, page_number: int) -> str:
        """
        Generates a concise, 5-6 sentence summary for a single, specific page.
        """
        if not self.page_summaries:
            return "Error: Please summarize a document first before requesting a page summary."

        index = page_number - 1
        if not (0 <= index < len(self.page_summaries)):
            return f"Error: Invalid page number. Please provide a number between 1 and {len(self.page_summaries)}."

        try:
            detailed_summary = self.page_summaries[index]
            concise_chain = CONCISE_SUMMARY_PROMPT | self.llm | StrOutputParser()
            concise_summary = concise_chain.invoke({"detailed_summary": detailed_summary})
            return concise_summary
        except Exception as e:
            logger.error(f"Error generating concise summary for page {page_number}: {str(e)}")
            return f"An error occurred while summarizing page {page_number}."

def create_chatbot(api_key: str):
    """Create a chatbot instance with the provided API key"""
    return LegalDocumentChatbot(
        vectorstore_path="legal_docs_faiss",
        gemini_api_key=api_key
    )

if __name__ == "__main__":
    if __package__ is None:
        import sys
        sys.path.append(str(Path(__file__).parent.parent))

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        exit(1)
    
    chatbot = create_chatbot(api_key)
    
    # --- Example Usage ---
    pdf_for_summary = r"path/to/your/document.pdf" # <-- IMPORTANT: SET YOUR PDF PATH HERE
    
    if os.path.exists(pdf_for_summary):
        print("\n=== Document Summary ===")
        summary_data = chatbot.summarize_document(pdf_path=pdf_for_summary)
        print("--- MASTER SUMMARY ---")
        print(summary_data["master_summary"])
        print("\n--- CONCISE SUMMARY FOR PAGE 1 ---")
        concise_summary = chatbot.get_concise_page_summary(page_number=1)
        print(concise_summary)
    else:
        print(f"File not found: {pdf_for_summary}. Skipping summarization test.")

    print("\n=== Question Answering (with Memory) ===")
    
    # First question
    question1 = "explain article 7"
    print(f"User: {question1}")
    answer1 = chatbot.answer_question(question1)
    print(f"Chatbot: {answer1}")
    
    # Second question that relies on the context of the first
    question2 = "what is most important thing about above question answer??"
    print(f"\nUser: {question2}")
    answer2 = chatbot.answer_question(question2)
    print(f"Chatbot: {answer2}")
