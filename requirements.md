# Requirements Specification: Browser-Based PDF VAT Table Extractor

## 1. Introduction & Project Overview
This application is a local, client-side web utility built with HTML5 and JavaScript. It allows users to drop multi-page financial documents (such as `-DONE 730511 Beban Rumah Tangga.pdf`) directly into their browser. The application extracts textual summaries from the initial pages, reads supporting receipts from subsequent pages, and communicates with the **Groq API** to build a normalized data grid featuring a newly calculated or extracted **Value Added Tax (VAT)** column that was missing from the initial statement overview.

## 2. Core Features & Scope
* **Direct Browser File Loading:** Zero-server architecture parsing local files via standard web interfaces.
* **Integrated Groq API Gateway:** Directly leverages the Groq Cloud endpoint with models like `llama-3.3-70b-versatile` or custom configurations via standard `fetch` mapping.
* **Missing VAT Reconstruction:** Intelligently checks the sub-pages of the document to extract hidden or explicit tax items, appending a `VAT` and `Total (incl. VAT)` column directly onto the transaction table row layouts.
* **On-the-Fly Configuration Panel:** Input field form allowing real-time entry or overriding of API keys, base URLs, and target structural models.

## 3. Functional Requirements
* **FR-1: PDF JavaScript Processing Library:** The app must load a valid browser-compatible script (`pdf.js` via CDN) to map incoming binary file data into clean textual blocks page-by-page.
* **FR-2: Groq Engine Interfacing:** Rather than using Node modules, the app must translate the provided SDK design pattern into a secure browser-compliant native `fetch()` call pointed at `https://api.groq.com/openai/v1/chat/completions`.
* **FR-3: Context Injection & Parsing Prompt:** The system instruction must mandate that the model cross-reference page 1 lists against subsequent page items to safely discover the missing tax figures.
* **FR-4: Clean Table Structure Mapping:** The response must come back as an extractable JSON array formatted precisely with numerical keys for programmatic spreadsheet grid handling.
