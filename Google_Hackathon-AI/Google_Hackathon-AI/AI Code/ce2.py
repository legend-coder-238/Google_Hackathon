"""
Optimized Legal Document Analyzer (Python)
Processes legal documents in 2-page batches using direct Gemini API calls.
Removes CrewAI overhead to reduce API quota usage.
"""

import os
import logging
import json
import time
from datetime import datetime
from typing import List, Dict, Any
from pydantic import BaseModel, Field, ValidationError
from dotenv import load_dotenv
import google.generativeai as genai
from utils import DocumentProcessor
from enum import Enum

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("Set GEMINI_API_KEY in your .env file.")

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Pydantic Models (UPDATED) ---
class RiskLevel(str, Enum):
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ClauseAnalysis(BaseModel):
    clause_title: str = Field(..., description="A short descriptive title of the clause")
    clause_summary: str = Field(..., description="A concise 2-3 sentence summary of the clause")
    risk_level: RiskLevel = Field(..., description="Risk level: HIGH or CRITICAL")
    risk_explanation: str = Field(..., description="Brief explanation for the assigned risk")
    page_number: int = Field(..., description="Page number where the clause appears")

# --- Analyzer Class ---
class OptimizedLegalAnalyzer:
    def __init__(self, model_name: str = "gemini-1.5-flash"):
        """Initialize with the faster, cheaper Flash model"""
        self.model = genai.GenerativeModel(model_name)
        self.doc_processor = DocumentProcessor()
        
        # Generation config for consistent, shorter responses
        self.generation_config = genai.types.GenerationConfig(
            temperature=0.1,
            top_p=0.8,
            max_output_tokens=2048
        )

    # --- NECESSARY CHANGE 1: A MUCH SMARTER PROMPT ---
    def _create_analysis_prompt(self, document_chunk: str) -> str:
        """Create a focused prompt with clear risk definitions and examples."""
        template = {
            "clauses": [
                {
                    "clause_title": "string",
                    "clause_summary": "string",
                    "risk_level": "HIGH|CRITICAL",
                    "risk_explanation": "string",
                    "page_number": 1
                }
            ]
        }
        
        return f"""You are a senior legal analyst reviewing a contract for your client. Your task is to identify only genuinely risky, one-sided, or ambiguous clauses.

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON matching this exact template:
{json.dumps(template, indent=2)}

ANALYSIS GUIDELINES:
1.  **Focus on True Risk:** A clause is risky if it is one-sided, ambiguous, or imposes an unfair burden on one party.
2.  **Ignore Standard Clauses:** Do NOT flag standard, mutual clauses that apply to "Either Party" (like standard termination for insolvency or basic confidentiality) unless they contain unusual, one-sided language.
3.  **Identify 3-5 Highest Risk Clauses Only:** Be selective. Only extract HIGH or CRITICAL risk items.

---
EXAMPLE OF A TRUE CRITICAL RISK (YOU SHOULD EXTRACT THIS):
- **Clause Text:** "Service Provider may amend the terms of this Agreement, including Fees, at any time upon providing five (5) days' notice to Client."
- **Why it's Risky:** This is a UNILATERAL AMENDMENT clause. It gives all power to one party, which is a critical risk.

EXAMPLE OF A FALSE POSITIVE (YOU SHOULD IGNORE THIS):
- **Clause Text:** "Either Party may terminate this Agreement immediately upon written notice if the other Party becomes insolvent or is subject to bankruptcy proceedings."
- **Why it's NOT Risky:** This is a STANDARD INSOLVENCY clause. It is mutual ("Either Party") and protects both sides. Do not flag it.
---

DOCUMENT CHUNK TO ANALYZE:
---
{document_chunk}
---

JSON OUTPUT:"""

    def _analyze_chunk(self, chunk_text: str, chunk_number: int) -> Dict[Any, Any]:
        """Analyze a single chunk using direct Gemini API"""
        try:
            prompt = self._create_analysis_prompt(chunk_text)
            
            logger.info(f"Analyzing chunk {chunk_number} (approx {len(chunk_text)} chars)...")
            
            response = self.model.generate_content(
                prompt,
                generation_config=self.generation_config
            )
            
            if not response.text:
                logger.error(f"Chunk {chunk_number}: Empty response from Gemini")
                return {}
            
            # Clean response text
            response_text = response.text.strip().replace('```json', '').replace('```', '').strip()
            
            # Parse JSON
            try:
                chunk_data = json.loads(response_text)
                
                if 'clauses' in chunk_data and isinstance(chunk_data['clauses'], list):
                    validated_clauses = []
                    for clause in chunk_data['clauses']:
                        try:
                            validated_clause = ClauseAnalysis(**clause)
                            validated_clauses.append(validated_clause.model_dump())
                        except ValidationError as ve:
                            logger.warning(f"Skipping invalid clause: {ve}")
                            continue
                    
                    chunk_data['clauses'] = validated_clauses
                    logger.info(f"Chunk {chunk_number}: Successfully analyzed {len(validated_clauses)} clauses")
                else:
                    logger.warning(f"Chunk {chunk_number}: No valid clauses found")
                    chunk_data['clauses'] = []
                
                return chunk_data
                
            except json.JSONDecodeError as e:
                logger.error(f"Chunk {chunk_number}: JSON parse error - {e}")
                logger.error(f"Raw response: {response_text[:500]}...")
                return {}
                
        except Exception as e:
            logger.error(f"Chunk {chunk_number}: API call failed - {e}")
            return {}

    def analyze_document(self, doc_path: str) -> Dict[str, Any]:
        """Main analysis function with optimized chunking"""
        if not os.path.exists(doc_path):
            raise FileNotFoundError(f"{doc_path} not found.")
        
        logger.info(f"Loading document: {doc_path}")
        pages = self.doc_processor.load_document(doc_path)
        
        # Create overlapping 2-page chunks with 1-page overlap
        chunks = []
        for i in range(0, len(pages), 1):
            chunk_end = min(i + 2, len(pages))
            chunk_pages = pages[i:chunk_end]
            
            if len(chunk_pages) == 1 and i > 0:
                continue
                
            chunk_text = "\n".join([
                f"--- PAGE {p.metadata.get('page', i+j+1)} ---\n{p.page_content}"
                for j, p in enumerate(chunk_pages)
            ])
            chunks.append(chunk_text)
            
            if chunk_end >= len(pages):
                break
        
        logger.info(f"Document split into {len(chunks)} overlapping chunk(s) of up to 2 pages each.")
        
        successful_reports = []
        for idx, chunk in enumerate(chunks):
            chunk_result = self._analyze_chunk(chunk, idx + 1)
            
            if chunk_result and 'clauses' in chunk_result:
                successful_reports.append(chunk_result)
            
            if idx < len(chunks) - 1:
                time.sleep(2)
        
        if not successful_reports:
            return {"error": "All chunk analyses failed. Check your API quota and document format."}
        
        logger.info(f"Aggregating {len(successful_reports)} successful chunk(s)...")
        return self._aggregate_reports(successful_reports)

    def _aggregate_reports(self, reports: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregate and filter to get only top 5-6 high-risk clauses with single summary"""
        if not reports:
            return {"error": "No reports to aggregate"}
        
        try:
            all_clauses = []
            seen_clauses = set()
            
            for report in reports:
                clauses = report.get("clauses", [])
                if isinstance(clauses, list):
                    for clause in clauses:
                        # --- NECESSARY CHANGE 2: MORE ROBUST DE-DUPLICATION LOGIC ---
                        # Use the summary for de-duplication, as titles can be inconsistent.
                        summary_start = clause.get('clause_summary', '').lower().strip()[:100]
                        clause_signature = (
                            summary_start,
                            clause.get('page_number', 0)
                        )
                        
                        risk_level = clause.get('risk_level', '').upper()
                        if risk_level in ['HIGH', 'CRITICAL'] and clause_signature not in seen_clauses:
                            seen_clauses.add(clause_signature)
                            all_clauses.append(clause)
            
            priority_order = {'CRITICAL': 0, 'HIGH': 1}
            all_clauses.sort(key=lambda x: (
                priority_order.get(x.get('risk_level', '').upper(), 2),
                x.get('page_number', 0)
            ))
            
            top_clauses = all_clauses[:6]
            
            overall_summary = self._generate_comprehensive_summary(reports, top_clauses)
            
            final_report = {
                "summary": overall_summary,
                "clauses": top_clauses
            }
            
            logger.info(f"Final report: {len(top_clauses)} high-risk clauses selected")
            return final_report
            
        except Exception as e:
            logger.error(f"Aggregation failed: {e}")
            return {
                "error": f"Failed to aggregate reports: {e}",
                "partial_data": reports
            }

    def _generate_comprehensive_summary(self, reports: List[Dict[str, Any]], clauses: List[Dict[str, Any]]) -> str:
        """Generate a comprehensive summary combining document info and risk analysis"""
        if not clauses:
            return "No high-risk clauses identified in the document based on the specified criteria."
        
        doc_title = "Legal Document"
        doc_type = "Contract"

        risk_counts = {}
        for clause in clauses:
            level = clause.get("risk_level", "UNKNOWN").upper()
            risk_counts[level] = risk_counts.get(level, 0) + 1
        
        summary_parts = [
            f"Document Analysis: {doc_title} ({doc_type})"
        ]
        
        if risk_counts:
            risk_desc = []
            if 'CRITICAL' in risk_counts:
                risk_desc.append(f"{risk_counts['CRITICAL']} critical")
            if 'HIGH' in risk_counts:
                risk_desc.append(f"{risk_counts['HIGH']} high-risk")
            
            if risk_desc:
                summary_parts.append(f"Identified {len(clauses)} concerning clauses: {', '.join(risk_desc)}.")
        
        critical_count = risk_counts.get("CRITICAL", 0)
        if critical_count > 0:
            summary_parts.append("This document contains critical issues requiring immediate legal review and likely negotiation before signing.")
        elif len(clauses) > 3:
            summary_parts.append("Multiple high-risk elements present - recommend thorough legal review before proceeding.")
        else:
            summary_parts.append("Document contains some concerning provisions that should be reviewed with legal counsel.")
        
        return " ".join(summary_parts)

# --- Main Function ---
def main():
    # IMPORTANT: Replace this with the actual path to your document
    doc_path = r"E:\SUMGRIND\SAMPLE LEGAL DOCS\sample_service_agreement_test.pdf"
    
    if not os.path.exists(doc_path) or doc_path == r"path\to\your\document.txt":
        print("❌ Please update the 'doc_path' variable in the main() function to point to your legal document.")
        return

    try:
        analyzer = OptimizedLegalAnalyzer()
        logger.info("Starting optimized document analysis...")
        
        report = analyzer.analyze_document(doc_path)
        
        print("\n" + "="*80)
        print("OPTIMIZED LEGAL DOCUMENT ANALYSIS REPORT")
        print("="*80)
        
        if "error" in report:
            print("❌ Error:", report["error"])
            if "partial_data" in report:
                print(f"Partial data available for {len(report['partial_data'])} chunks")
        else:
            print(json.dumps(report, indent=2, ensure_ascii=False))
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            outfile = f"legal_report_fast_{timestamp}.json"
            
            with open(outfile, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            
            print(f"\n✅ Report saved as {outfile}")
            print(f"📊 High-risk clauses analyzed: {len(report.get('clauses', []))}")
    
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        print(f"❌ Analysis failed: {e}")

if __name__ == "__main__":
    main()
