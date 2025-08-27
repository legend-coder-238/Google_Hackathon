import os
from dotenv import load_dotenv
load_dotenv()
gemini_api_key = os.getenv("GEMINI_API_KEY")
os.environ["GEMINI_API_KEY"] = gemini_api_key
import logging
from typing import Optional
 
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
 
from chatbot import LegalDocumentChatbot
from utils import DocumentProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

# --- Start of your provided code ---
# (I've kept your prompt templates as they are)

PROMPT_TEMPLATES = {
    "TRANSACTIONAL": PromptTemplate(
        template=(
            "You are a senior paralegal at a top-tier law firm, tasked with creating a preliminary summary for a senior partner. "
            "Your summary must be precise and well-structured.\n\n"
            "Carefully analyze the following text from a transactional document and extract the key information. "
            "Format your summary in Markdown with the following headings:\n\n"
            "- **Document Type:** (e.g., Master Service Agreement, NDA, Loan Agreement)\n"
            "- **Parties:** List the names and roles of each party (e.g., 'Buyer: Acme Corp.', 'Seller: Beta Inc.').\n"
            "- **Effective Date & Term:** State the start date, end date, or duration of the agreement.\n"
            "- **Key Obligations:** In bullet points, list the primary responsibilities and duties of each party.\n"
            "- **Payment Terms:** Detail any financial considerations, such as amounts, payment schedules, or conditions.\n"
            "- **Governing Law:** Identify the jurisdiction's law that governs the agreement.\n\n"
            "**Constraint:** If any of the above information is not present in the chunk, explicitly state 'Not Found' for that heading. "
            "Base your summary *only* on the text provided below.\n\n"
            "## Document Text:\n\n{chunk}"
        )
    ),
    "DISPUTES": PromptTemplate(
        template=(
            "You are a litigation analyst preparing a case brief for a legal team meeting. The summary must be clear, objective, and logically structured.\n\n"
            "Review the following text from a dispute-related document and summarize its core components. "
            "Format your summary in Markdown with the following headings:\n\n"
            "- **Case Information:** Case name, number, and the court or tribunal.\n"
            "- **Parties:** Identify the Plaintiff/Claimant and Defendant/Respondent.\n"
            "- **Core Issue/Claim:** Briefly describe the central legal question or cause of action.\n"
            "- **Key Arguments:** In bullet points, summarize the main arguments for each party mentioned in the text.\n"
            "- **Requested Relief/Outcome:** State the specific remedy or decision being sought.\n\n"
            "**Constraint:** If any information is not available in the text, write 'Not Found' for that section. "
            "Derive your analysis *only* from the provided text.\n\n"
            "## Document Text:\n\n{chunk}"
        )
    ),
    "CORPORATE": PromptTemplate(
        template=(
            "You are a corporate governance specialist summarizing a document for a company's board of directors. The summary must be concise and highlight key actions.\n\n"
            "Analyze the following text from a corporate document. "
            "Present your summary in Markdown under these headings:\n\n"
            "- **Entity Name:** The name of the corporation or entity involved.\n"
            "- **Document Type:** (e.g., Board Minutes, Articles of Incorporation, Shareholder Resolution).\n"
            "- **Key Governance Actions:** In bullet points, list significant decisions, appointments, or structural changes mentioned.\n"
            "- **Decisions/Resolutions Passed:** Detail any formal votes or resolutions and their outcomes.\n"
            "- **Next Steps/Action Items:** List any tasks assigned or future actions required.\n\n"
            "**Constraint:** If a specific piece of information is not in the text, use 'Not Found'. "
            "Your summary must be based exclusively on the provided chunk.\n\n"
            "## Document Text:\n\n{chunk}"
        )
    ),
    "REGULATORY": PromptTemplate(
        template=(
            "You are a compliance officer briefing the management team on a regulatory matter. The summary needs to be clear, actionable, and focused on risk.\n\n"
            "Examine the following text from a regulatory document. "
            "Structure your summary in Markdown using these headings:\n\n"
            "- **Governing Body/Agency:** The name of the regulatory authority (e.g., SEBI, RBI, CCI).\n"
            "- **Regulation/Statute:** The specific law, rule, or code being referenced.\n"
            "- **Key Compliance Requirements:** In bullet points, list the primary obligations, prohibitions, or standards.\n"
            "- **Affected Parties:** Identify who must comply with these regulations.\n"
            "- **Deadlines & Penalties:** Note any critical dates for compliance and the consequences of non-compliance.\n\n"
            "**Constraint:** For any missing information, state 'Not Found'. "
            "Confine your analysis strictly to the text provided.\n\n"
            "## Document Text:\n\n{chunk}"
        )
    ),
    "INTELLECTUAL_PROPERTY": PromptTemplate(
        template=(
            "You are an IP counsel providing an overview of an intellectual property document for an in-house legal team. The summary must be precise and technically accurate.\n\n"
            "Review the following text from an IP-related document. "
            "Format your findings in Markdown with these headings:\n\n"
            "- **IP Type:** (e.g., Patent, Trademark, Copyright, Trade Secret).\n"
            "- **Owner/Applicant:** The individual or entity holding or applying for the IP rights.\n"
            "- **Identifier:** The patent number, trademark serial number, or other unique identifier.\n"
            "- **Scope of Rights:** In bullet points, describe the key protections, claims, or rights granted or discussed.\n"
            "- **Key Provisions:** Summarize any terms related to licensing, assignment, or infringement.\n\n"
            "**Constraint:** If a heading's information is absent, write 'Not Found'. "
            "Base the summary *only* on the provided text.\n\n"
            "## Document Text:\n\n{chunk}"
        )
    ),
    "OTHERS": PromptTemplate(
        template=(
            "You are an expert legal summarizer tasked with making sense of a miscellaneous legal document for a junior associate.\n\n"
            "First, analyze the provided text to infer its likely purpose. "
            "Then, create a concise, well-structured summary in Markdown under the following headings:\n\n"
            "- **Probable Document Type:** Your best guess of the document's classification (e.g., Will, Internal Memo, Demand Letter).\n"
            "- **Key Points:** In bullet points, list the most critical pieces of information or main ideas.\n"
            "- **Identified Entities:** List any people, companies, or organizations central to the document.\n"
            "- **Apparent Purpose:** Briefly state the document's main goal or objective.\n\n"
            "**Constraint:** Ensure the summary is clear and derived exclusively from the text below.\n\n"
            "## Document Text:\n\n{chunk}"
        )
    ),
}

# --- End of your provided code ---

# New prompt for creating a master summary from page summaries
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


def summarize_short_document(
    llm: ChatGoogleGenerativeAI, prompt: PromptTemplate, document_text: str
) -> str:
    """Summarizes a short document (<10 pages) by feeding all its text at once."""
    logging.info("Running single-pass summarization...")
    chain = prompt | llm | StrOutputParser()
    summary = chain.invoke({"chunk": document_text})
    return summary


def summarize_long_document(
    llm: ChatGoogleGenerativeAI,
    page_prompt: PromptTemplate,
    master_prompt: PromptTemplate,
    pdf_path: str,
    page_count: int,
    doc_processor: DocumentProcessor,
) -> str:
    """Summarizes a long document (>=10 pages) using a map-reduce approach."""
    logging.info("Running map-reduce summarization...")
    page_summaries = []
    page_summary_chain = page_prompt | llm | StrOutputParser()

    for i in range(page_count):
        try:
            page_text = doc_processor.get_text_from_page(pdf_path, i)
            if page_text.strip():  # only summarize non-empty pages
                summary = page_summary_chain.invoke({"chunk": page_text})
                page_summaries.append(summary)
                logging.info(f"Generated summary for page {i + 1}/{page_count}")
        except Exception as e:
            logging.error(f"Could not summarize page {i + 1}: {e}")
            continue

    logging.info("Combining page summaries to create a master summary...")
    combined_summaries = "\n\n---\n\n".join(page_summaries)

    master_summary_chain = master_prompt | llm | StrOutputParser()
    final_summary = master_summary_chain.invoke(
        {"combined_summaries": combined_summaries}
    )
    return final_summary


def summarize_document(pdf_path: str, category: Optional[str] = None) -> str:
    """
    Orchestrates the summarization process based on document length and category.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")

    # Initialize components
    legaldoc = LegalDocumentChatbot(gemini_api_key=api_key)
    doc_processor = DocumentProcessor()
    llm = legaldoc.llm

    # Classify document if category is not provided
    if not category:
        try:
            from doc_classification import classify_document
            category = classify_document(pdf_path)
        except ImportError:
            logging.warning("'doc_classification' not found. Defaulting to 'OTHERS'.")
            category = "OTHERS"

    prompt = PROMPT_TEMPLATES.get(category, PROMPT_TEMPLATES["OTHERS"])
    logging.info(f"Using template for category: {category}")

    try:
        page_count = doc_processor.get_page_count(pdf_path)
        logging.info(f"Document '{os.path.basename(pdf_path)}' has {page_count} pages.")

        if page_count < 10:
            full_text = doc_processor.get_full_text(pdf_path)
            return summarize_short_document(llm, prompt, full_text)
        else:
            return summarize_long_document(
                llm, prompt, MASTER_SUMMARY_PROMPT, pdf_path, page_count, doc_processor
            )
    except Exception as e:
        logging.error(f"An error occurred during summarization: {e}")
        return f"Error: Could not summarize the document. {e}"


if __name__ == "__main__":
    # Example Usage: Replace with the actual path to your PDF
    # Make sure to set the GEMINI_API_KEY environment variable.
    pdf_file_path = r"E:\SUMGRIND\SAMPLE LEGAL DOCS\DUMMYDOCS.txt"

    if not os.path.exists(pdf_file_path):
        print(f"\nERROR: PDF file not found at '{pdf_file_path}'.")
        print("Please update the 'pdf_file_path' variable in the script.")
    else:
        final_summary = summarize_document(pdf_file_path)
        print("\n--- FINAL DOCUMENT SUMMARY ---")
        print(final_summary)
