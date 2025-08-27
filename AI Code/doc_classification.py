from utils import DocumentProcessor
from crewai import Agent, Task, Crew, Process, LLM
from crewai.tools import BaseTool

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

# --- PDF Reader Tool --- #
class PDFReaderTool(BaseTool):
    name: str = "PDF Reader"
    description: str = "Reads PDF and extracts text"

    def _run(self, file_path: str) -> str:
        try:
            processor = DocumentProcessor()
            documents = processor.load_document(file_path)
            full_text = "\n".join([doc.page_content for doc in documents])
            return full_text
        except Exception as e:
            return f"Error reading PDF: {str(e)}"

# --- LLM-based Classifier Tool --- #
class LegalClassifierTool(BaseTool):
    name: str = "Legal Classifier"
    description: str = "Classifies legal document into one of 6 categories, returns only ONE WORD"

    def _run(self, document_text: str) -> str:
        try:
            llm = get_gemini_llm()
            prompt = (
                f"You are a legal expert. Classify the following document strictly into ONE category.\n\n"
                f"Categories and guidelines:\n{CATEGORY_GUIDELINES}\n\n"
                f"Document:\n{document_text[:4000]}\n\n"  # limit size for efficiency
                f"Output exactly ONE WORD from this list: {', '.join(CATEGORIES)}"
            )
            response = llm.predict(prompt)
            return response.strip().upper()
        except Exception as e:
            return f"Error in classification: {str(e)}"
import os
# --- Gemini Config --- #
def get_gemini_llm():
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    os.environ["GOOGLE_API_KEY"] = gemini_api_key
    return LLM(model="gemini/gemini-2.0-flash", temperature=0)

# --- Agent --- #
def create_classifier_agent(llm: LLM):
    # keep your LegalClassifierTool unchanged
    return Agent(
        role="Legal Classifier",
        goal="Return exactly ONE WORD category name for the legal document",
        backstory="You are an expert at identifying broad types of legal documents with clear distinctions.",
        tools=[PDFReaderTool(), LegalClassifierTool()],
        llm=llm,
        verbose=False,
        allow_delegation=False
    )

# --- Task --- #
def create_classification_task(pdf_path: str, llm: LLM):
    return Task(
        description=f"Classify the legal document at {pdf_path}. Output only one word: {', '.join(CATEGORIES)}.",
        expected_output="ONE WORD category name",
        agent=create_classifier_agent(llm)
    )

# --- Crew Runner --- #
def classify_document(pdf_path: str):
    llm = get_gemini_llm()
    task = create_classification_task(pdf_path, llm)
    crew = Crew(
        agents=[task.agent],
        tasks=[task],
        process=Process.sequential,
        manager_llm=llm,
        verbose=False
    )
    result = crew.kickoff()

    # enforce one clean word at the very end
    if isinstance(result, str):
        result = result.strip().upper().split()[0]
        if result not in CATEGORIES:
            result = "OTHERS"
    return result

# --- Example --- #
if __name__ == "__main__":    
    pdf = r"E:\SUMGRIND\SAMPLE LEGAL DOCS\legal_doc_conflict.txt"
    print("Classification:", classify_document(pdf))
