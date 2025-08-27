import logging
import fitz  # PyMuPDF
from langchain_huggingface import HuggingFaceEmbeddings

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Handles PDF document processing like text extraction and page counting."""

    def get_page_count(self, pdf_path: str) -> int:
        """Gets the total number of pages in a PDF document."""
        try:
            with fitz.open(pdf_path) as doc:
                return doc.page_count
        except Exception as e:
            logger.error(f"Error getting page count for {pdf_path}: {e}")
            raise

    def get_full_text(self, pdf_path: str) -> str:
        """Extracts and concatenates text from all pages of a PDF."""
        try:
            with fitz.open(pdf_path) as doc:
                # Using a generator expression for memory efficiency
                return "\n\n".join(page.get_text() for page in doc)
        except Exception as e:
            logger.error(f"Error extracting full text from {pdf_path}: {e}")
            raise

    def get_text_from_page(self, pdf_path: str, page_number: int) -> str:
        """Extracts text from a specific page of a PDF."""
        try:
            with fitz.open(pdf_path) as doc:
                if not 0 <= page_number < doc.page_count:
                    raise ValueError("Page number out of bounds.")
                page = doc.load_page(page_number)
                return page.get_text()
        except Exception as e:
            logger.error(f"Error extracting text from page {page_number} of {pdf_path}: {e}")
            raise


class EmbeddingManager:
    """Manages embedding models."""

    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        """
        Initializes the EmbeddingManager.
        Args:
            model_name: The name of the sentence-transformer model to use.
        """
        self.model_name = model_name
        self._embeddings = None

    def get_embeddings(self):
        """Lazily loads and returns the embedding model instance."""
        if self._embeddings is None:
            self._embeddings = HuggingFaceEmbeddings(
                model_name=self.model_name,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )
            logger.info(f"Loaded embedding model: {self.model_name}")
        return self._embeddings
