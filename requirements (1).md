# Requirements Specification: Smart PDF Document Processor & Dynamic VAT Reconciler

## 1. Introduction & Project Overview
Many financial transaction log files feature a simplified general ledger table on the cover/first page that completely omits Value Added Tax (VAT) indicators, while the detailed itemized individual receipts containing implicit or explicit VAT amounts are appended on downstream pages (pages 2+). This single-page application built using HTML5 and JavaScript acts as an automated tool to ingest text layers or images from multi-page PDFs, dynamically pull VAT mappings either by performing cross-page reference mapping or auto-calculating tax constants, and render a complete dataset with calculated tax values.

## 2. Core Features & Scope
* **Intelligent Local PDF Processing:** Embedded document reading engine (`pdfjs-dist`) that parses pages safely inside the user's browser runtime environment.
* **Autonomous & Managed API Layer:**
  * **Automated Mode:** Programmatic integration capable of dynamically interacting with OpenAI's API interface standard.
  * **Manual Form Overrides:** Full operational override forms accepting API Endpoint URLs, specific Model IDs (e.g., `gpt-4o`, `claude-3-5-sonnet`), and Custom Bearer tokens.
* **Cross-Page Data Fusion (Cover vs Receipts):** Orchestrates advanced prompting techniques instructing the model to correlate initial transaction tables (Page 2) with the image markers/invoice breakdowns on following pages to retrieve corresponding VAT entries.
* **Enriched Data Grid UI:** Populates a live table appending two newly calculated parameters: `VAT (SAR/Rp)` and `Total Cost (incl. VAT)`.
* **Instant Inline Adjustments:** Fully active tabular text cells enabling immediate field updates by the user with real-time horizontal calculations.

## 3. User Stories
* **As a Financial Reviewer**, I want to drop an un-itemized expense report summary into the interface so that the application extracts matching tax breakdowns buried deep inside the receipts without manual cross-checking.
* **As an independent Auditor**, I want the flexibility to use standard out-of-the-box configurations or override the engine using my secure custom API gateway fields to process sensitive documents.
* **As an Operations Assistant**, I want to export the finalized grid directly into a standard format file (.csv) after verifying the numbers match up.

## 4. Functional Requirements
* **FR-1: PDF Parsing Runtime (pdfprocessor):** The app must instantiate Mozilla's PDF.js processor stack locally to cycle through pages, extracting raw text and scaling canvas vectors.
* **FR-2: Dynamic Endpoint Router:** The system must validate user form inputs. If the form fields are blank, it activates automated fallbacks; otherwise, it dynamically reroutes the outbound JSON payload requests to the newly declared bearer target.
* **FR-3: Cross-Page Discrepancy Prompting:** The prompt compilation array must enforce systematic structural layout maps, forcing the engine to track and append missing tax percentages to specific target rows.
* **FR-4: Interactive Sheet Redraws:** Editing any values within columns `Unit Price`, `Qty`, or `VAT` must trigger instant math normalization events across the host row array block.
* **FR-5: Data Output Serializer:** Provides one-click compilation functions translating current DOM table grid text data nodes into fully formatted CSV file downloads.

## 5. Non-Functional Requirements
* **NFR-1: Stateless Client Performance:** Payload processing must run directly inside the browser framework to maintain user confidentiality and avoid data persistence leaks.
* **NFR-2: Graceful Connection Handling:** If internet degradation or rate limits occur during the API sequence, the application must catch the status fault and provide clear debug messages on screen.
