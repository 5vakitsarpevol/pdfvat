# Implementation Tasks & Milestone Logs

## Milestone 1: Interface Ingestion Architecture
* [ ] **Task 1.1:** Develop the parent structure containing both the API Gateway Config Dashboard and the main Document Interaction Frame.
* [ ] **Task 1.2:** Integrate fields into the configuration panel that accept custom target Endpoint Base URLs, Model Identifiers, and Security Tokens.
* [ ] **Task 1.3:** Implement automated routing configurations: if the custom credential form is empty, set up the system to automatically fall back to standard OpenAI configurations.

## Milestone 2: pdfprocessor Deployment & Extract Engineering
* [ ] **Task 2.1:** Embed the client-side `pdfjs-dist` script library inside the web page context to establish the local `pdfprocessor`.
* [ ] **Task 2.2:** Build an asynchronous file processing pipeline (`readPDFPages`) that iterates over individual pages and extracts pure text layers.
* [ ] **Task 2.3:** Add visual load indicators showing real-time feedback while the file scanner extracts document content.

## Milestone 3: Intelligent API Integration & Formatting
* [ ] **Task 3.1:** Write the asynchronous API calling function (`dispatchPromptRequest`) which automatically shifts destination paths based on the operational mode (Auto OpenAI vs. User Manual Credentials).
* [ ] **Task 3.2:** Structure the core extraction instructions, directing the AI model to locate missing VAT components from the invoice details on subsequent pages and compile the results into a valid JSON array.
* [ ] **Task 3.3:** Build a fallback processing layer that catches errors if an API model outputs raw text strings instead of standard JSON, cleanly parsing out matching blocks.

## Milestone 4: Interactive Matrix Rendering & VAT Logic
* [ ] **Task 4.1:** Code the data grid rendering block, appending columns for `VAT` and `Total (incl. VAT)` to the primary table fields.
* [ ] **Task 4.2:** Attach inline event listeners (`input` or `blur`) to tabular cells to recalculate individual row calculations dynamically if a user modifies values.
* [ ] **Task 4.3:** Build mathematical backup checks: if a transaction row returns with missing tax parameters, automatically apply local base equations (e.g., 15% VAT).

## Milestone 5: File Compiling & Validation Tests
* [ ] **Task 5.1:** Program a client-side CSV encoder utility to transform active table values into downloadable comma-separated data arrays.
* [ ] **Task 5.2:** Test the full processing loop using documents like the uploaded expense ledger to verify that text layers are extracted properly and missing tax details are mapped correctly.
