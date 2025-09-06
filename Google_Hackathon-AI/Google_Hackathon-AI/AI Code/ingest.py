
"""
Document ingestion module for Legal Document Assistant
Handles loading, processing, and storing documents in vector databases
"""

import os
import logging
from typing import List, Optional, Dict, Any
from pathlib import Path

# LangChain imports
from langchain_core.documents import Document
from langchain_community.vectorstores import Pinecone, FAISS
from langchain_community.document_loaders import PyMuPDFLoader, TextLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Local imports
from utils import DocumentProcessor, EmbeddingManager, validate_file_type, create_metadata

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentIngester:
    """Handles document ingestion and storage"""
    
    def __init__(self, 
                 chunk_size: int = 1000, 
                 chunk_overlap: int = 200,
                 embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """
        Initialize document ingester
        
        Args:
            chunk_size: Size of text chunks
            chunk_overlap: Overlap between chunks
            embedding_model: Name of embedding model to use
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.embedding_model = embedding_model
        
        # Initialize processors
        self.doc_processor = DocumentProcessor()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        self.embedding_manager = EmbeddingManager(embedding_model)
        
        # Storage options
        self.pinecone_index = None
        self.faiss_index = None
        
    def _load_document(self, file_path: str) -> List[Document]:
        """Load document based on file type."""
        file_extension = Path(file_path).suffix.lower()
        
        try:
            if file_extension == '.pdf':
                loader = PyMuPDFLoader(file_path)
            elif file_extension == '.txt':
                loader = TextLoader(file_path, encoding='utf-8')
            elif file_extension in ['.doc', '.docx']:
                loader = Docx2txtLoader(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_extension}")
                
            return loader.load()
        except Exception as e:
            logger.error(f"Error loading document {file_path}: {str(e)}")
            raise
        
    def load_and_process_document(self, file_path: str) -> List[Document]:
        """
        Load and process a single document
        
        Args:
            file_path: Path to the document file
            
        Returns:
            List of processed document chunks
        """
        try:
            # Validate file type
            if not validate_file_type(file_path):
                raise ValueError(f"Unsupported file type: {Path(file_path).suffix}")
            
            # Load document
            logger.info(f"Loading document: {file_path}")
            documents = self._load_document(file_path)
            
            # Split into chunks
            logger.info(f"Splitting document into chunks")
            chunks = self.text_splitter.split_documents(documents)
            
            # Add metadata
            for chunk in chunks:
                chunk.metadata.update(create_metadata(chunk, file_path))
            
            logger.info(f"Processed {len(chunks)} chunks from {file_path}")
            return chunks
            
        except Exception as e:
            logger.error(f"Error processing document {file_path}: {str(e)}")
            raise
    
    def setup_pinecone(self, api_key: str, environment: str, index_name: str):
        """
        Setup Pinecone vector store
        
        Args:
            api_key: Pinecone API key
            environment: Pinecone environment
            index_name: Name of the Pinecone index
        """
        try:
            from pinecone import Pinecone
            
            pc = Pinecone(api_key=api_key)
            
            # Check if index exists, create if not
            existing_indexes = [index['name'] for index in pc.list_indexes()]
            if index_name not in existing_indexes:
                logger.info(f"Creating Pinecone index: {index_name}")
                from pinecone import ServerlessSpec
                pc.create_index(
                    name=index_name,
                    dimension=384,  # Dimension for all-MiniLM-L6-v2
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
            
            # Get index
            self.pinecone_index = pc.Index(index_name)
            logger.info(f"Connected to Pinecone index: {index_name}")
            
        except ImportError:
            logger.warning("Pinecone not installed. Install with: pip install pinecone-client")
            raise
        except Exception as e:
            logger.error(f"Error setting up Pinecone: {str(e)}")
            raise
    
    def store_in_pinecone(self, documents: List[Document], namespace: str = "legal_docs"):
        """
        Store documents in Pinecone
        
        Args:
            documents: List of document chunks
            namespace: Pinecone namespace
        """
        if not self.pinecone_index:
            raise ValueError("Pinecone not initialized. Call setup_pinecone() first.")
        
        try:
            # Create vector store
            vectorstore = Pinecone.from_documents(
                documents=documents,
                embedding=self.embedding_manager.get_embeddings(),
                index_name=self.pinecone_index.name,
                namespace=namespace
            )
            
            logger.info(f"Stored {len(documents)} documents in Pinecone namespace: {namespace}")
            return vectorstore
            
        except Exception as e:
            logger.error(f"Error storing documents in Pinecone: {str(e)}")
            raise
    
    def store_in_faiss(self, documents: List[Document], save_path: str = "faiss_index"):
        """
        Store documents in FAISS (local vector store)
        
        Args:
            documents: List of document chunks
            save_path: Path to save FAISS index
            
        Returns:
            FAISS vector store
        """
        try:
            # Create FAISS vector store
            vectorstore = FAISS.from_documents(
                documents=documents,
                embedding=self.embedding_manager.get_embeddings()
            )
            
            # Save to disk
            vectorstore.save_local(save_path)
            self.faiss_index = vectorstore
            
            logger.info(f"Stored {len(documents)} documents in FAISS at: {save_path}")
            return vectorstore
            
        except Exception as e:
            logger.error(f"Error storing documents in FAISS: {str(e)}")
            raise
    
    def load_faiss_index(self, load_path: str = "faiss_index"):
        """
        Load existing FAISS index
        
        Args:
            load_path: Path to FAISS index
            
        Returns:
            FAISS vector store
        """
        try:
            if os.path.exists(load_path):
                vectorstore = FAISS.load_local(load_path, self.embedding_manager.get_embeddings(), allow_dangerous_deserialization=True)
                self.faiss_index = vectorstore
                logger.info(f"Loaded FAISS index from: {load_path}")
                return vectorstore
            else:
                logger.warning(f"FAISS index not found at: {load_path}")
                return None
                
        except Exception as e:
            logger.error(f"Error loading FAISS index: {str(e)}")
            raise
    
    def ingest_document(self, 
                       file_path: str, 
                       storage_type: str = "faiss",
                       pinecone_config: Optional[Dict[str, str]] = None,
                       faiss_save_path: str = "faiss_index") -> Any:
        """
        Complete document ingestion pipeline
        
        Args:
            file_path: Path to document file
            storage_type: "pinecone" or "faiss"
            pinecone_config: Dictionary with api_key, environment, index_name
            faiss_save_path: Path to save FAISS index
            
        Returns:
            Vector store object
        """
        try:
            # Process document
            chunks = self.load_and_process_document(file_path)
            
            # Store in selected vector store
            if storage_type.lower() == "pinecone":
                if not pinecone_config:
                    raise ValueError("Pinecone config required for Pinecone storage")
                
                self.setup_pinecone(**pinecone_config)
                return self.store_in_pinecone(chunks)
                
            elif storage_type.lower() == "faiss":
                return self.store_in_faiss(chunks, faiss_save_path)
                
            else:
                raise ValueError(f"Unsupported storage type: {storage_type}")
                
        except Exception as e:
            logger.error(f"Error in document ingestion: {str(e)}")
            raise


# Create a simpler wrapper class for compatibility
class DocumentIngestor:
    """Simple wrapper for backward compatibility."""
    
    def __init__(self):
        self.ingester = DocumentIngester()
    
    def ingest_document(self, file_path: str, document_id: Optional[str] = None) -> dict:
        """Ingest a document and return success status."""
        try:
            result = self.ingester.ingest_document(file_path, storage_type="faiss")
            return {
                "success": True,
                "chunks_created": getattr(result, 'index', {}).get('count', 0) if result else 0
            }
        except Exception as e:
            logger.error(f"Document ingestion failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


if __name__ == "__main__":
    # Example usage
    ingester = DocumentIngester()
    

