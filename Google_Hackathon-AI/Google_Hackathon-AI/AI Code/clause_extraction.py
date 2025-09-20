"""
CrewAI Legal Document Analyzer (Python)
Processes legal documents in 5-page batches, extracts clauses with summaries and risk levels.
Uses CrewAI agents + Gemini LLM and outputs a validated JSON report.
"""

import os
import logging
import json
import time
from datetime import datetime
from typing import List
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from utils import DocumentProcessor  # your doc processor
from crewai import Agent, Task, Crew, Process, LLM

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("Set GEMINI_API_KEY in your .env file.")
os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Pydantic Models ---
class ClauseAnalysis(BaseModel):
    clause_title: str = Field(..., description="A short descriptive title of the clause, e.g., 'Limitation of Liability'.")
    clause_summary: str = Field(..., description="A concise 2-3 sentence summary of the clause.")
    risk_level: str = Field(..., description="Risk level: LOW, MEDIUM, HIGH, CRITICAL.")
    risk_explanation: str = Field(..., description="Brief explanation for the assigned risk.")
    page_number: int = Field(..., description="Page number where the clause appears.")

class DocumentAnalysisReport(BaseModel):
    document_title: str = Field(..., description="Inferred title of the legal document.")
    document_type: str = Field(..., description="Type of document, e.g., 'Rental Agreement'.")
    overall_risk_summary: str = Field(..., description="High-level summary of overall document risk.")
    clauses: List[ClauseAnalysis] = Field(..., description="List of all analyzed clauses.")

# --- Analyzer Class ---
class LegalDocumentAnalyzer:
    def __init__(self, model_name: str = "gemini/gemini-1.5-pro-latest"):
        self.llm = LLM(model=model_name, temperature=0.7)
        self.doc_processor = DocumentProcessor()

    def _create_analysis_crew(self) -> Crew:
        agent = Agent(
            role="Senior Legal Analyst",
            goal="Analyze text chunk and extract clauses with summaries and risk levels.",
            backstory="20+ years in contract law. Identify key clauses, their risk, and page numbers.",
            llm=self.llm,
            verbose=False
        )

        template = {
            "document_title": "string",
            "document_type": "string",
            "overall_risk_summary": "string",
            "clauses": [
                {
                    "clause_title": "string",
                    "clause_summary": "string",
                    "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
                    "risk_explanation": "string",
                    "page_number": 1
                }
            ]
        }

        task = Task(
            description=f"""
You are to output ONLY valid JSON in the format of this template:
{json.dumps(template, indent=2)}

Analyze the following document chunk. Identify key clauses, summarize each in 2-3 sentences, assign a risk level, explain the risk, and provide the page number. For the document_title, document_type, and overall_risk_summary, provide a preliminary assessment based on this chunk alone.

Document Chunk:
---
{{document_chunk}}
---
FINAL OUTPUT MUST BE A single JSON object matching the template.
""",
            agent=agent,
            expected_output="JSON matching DocumentAnalysisReport",
            output_pydantic=DocumentAnalysisReport
        )

        return Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)

    def analyze_document_sequentially(self, doc_path: str) -> dict:
        if not os.path.exists(doc_path):
            raise FileNotFoundError(f"{doc_path} not found.")
        logger.info(f"Loading document: {doc_path}")

        pages = self.doc_processor.load_document(doc_path)

        # Split into 5-page chunks
        chunks = []
        for i in range(0, len(pages), 5):
            chunk_pages = pages[i:i+5]
            text = "\n".join([f"--- PAGE {p.metadata.get('page', i+j+1)} ---\n{p.page_content}"
                              for j, p in enumerate(chunk_pages)])
            chunks.append(text)
        logger.info(f"Document split into {len(chunks)} chunk(s) of up to 5 pages each.")

        partial_reports = []
        for idx, chunk in enumerate(chunks):
            logger.info(f"Analyzing chunk {idx+1}/{len(chunks)}...")
            crew = self._create_analysis_crew()
            try:
                result = crew.kickoff(inputs={"document_chunk": chunk})
                if isinstance(result, DocumentAnalysisReport):
                    partial_reports.append(result.model_dump())
                else:
                    logger.warning(f"Chunk {idx+1} did not return expected format.")
            except Exception as e:
                logger.error(f"Chunk {idx+1} analysis failed: {e}")
            
            # Avoid rate limit
            if idx < len(chunks) - 1:
                logger.info("Waiting 20s before next chunk...")
                time.sleep(20)

        if not partial_reports:
            return {"error": "All chunk analyses failed."}

        # If there's only one chunk, the report is already complete
        if len(partial_reports) == 1:
            logger.info("Only one chunk processed, no aggregation needed.")
            return partial_reports[0]

        # --- MODIFIED PART: Aggregate using Python instead of an LLM ---
        logger.info("Aggregating partial reports using Python...")

        try:
            # Take metadata from the first report
            final_report_data = {
                "document_title": partial_reports[0].get("document_title", "Untitled Document"),
                "document_type": partial_reports[0].get("document_type", "Unknown"),
                "clauses": []
            }

            # Combine all clauses from all reports
            all_clauses = []
            for report in partial_reports:
                if "clauses" in report and isinstance(report["clauses"], list):
                    all_clauses.extend(report["clauses"])
            final_report_data["clauses"] = sorted(all_clauses, key=lambda x: x.get('page_number', 0))

            # Generate a final summary programmatically
            num_clauses = len(all_clauses)
            risk_counts = {}
            for clause in all_clauses:
                level = clause.get("risk_level", "UNKNOWN")
                risk_counts[level] = risk_counts.get(level, 0) + 1

            summary_parts = [f"The document analysis identified {num_clauses} key clauses."]
            if risk_counts:
                risk_distribution = ", ".join([f"{count} {level}" for level, count in risk_counts.items()])
                summary_parts.append(f"The overall risk distribution is: {risk_distribution}.")
            
            final_report_data["overall_risk_summary"] = " ".join(summary_parts)

            # Validate with Pydantic one last time to ensure conformity
            final_report = DocumentAnalysisReport(**final_report_data)
            return final_report.model_dump()
            
        except Exception as e:
            logger.error(f"Failed to aggregate report in Python: {e}")
            return {"error": f"Failed to aggregate and validate the final report: {e}", "partial_data": partial_reports}


# --- Main Function ---
def main():
    # Make sure to use a raw string (r"...") or forward slashes for the path
    doc_path = r"E:\SUMGRIND\SAMPLE LEGAL DOCS\DUMMYDOCS.txt"
    analyzer = LegalDocumentAnalyzer()
    report = analyzer.analyze_document_sequentially(doc_path)

    print("\n" + "="*80)
    print("LEGAL DOCUMENT ANALYSIS REPORT")
    print("="*80)
    if "error" in report:
        print("❌", report["error"])
        if "raw_output" in report:
            print(report["raw_output"])
    else:
        print(json.dumps(report, indent=2))
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        outfile = f"legal_report_{timestamp}.json"
        with open(outfile, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"\n✅ Report saved as {outfile}")

if __name__ == "__main__":
    main()