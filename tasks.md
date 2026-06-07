# Development Tasks & Implementation Roadmap

## Milestone 1: View Construction & Variable Mapping
* [ ] **Task 1.1:** Build the core HTML file and script sections containing layout forms for input keys and file attachment drops.
* [ ] **Task 1.2:** Bind local preferences to save and load configuration records securely from the user's browser `localStorage`.

## Milestone 2: Embedding Client-Side PDF Processors
* [ ] **Task 2.1:** Load `pdf.js` from an official CDN and initialize the script container cleanly inside the global layout canvas.
* [ ] **Task 2.2:** Write a recursive worker loop that reads all document lines and structures them chronologically by page number into a structured text variable array.

## Milestone 3: Connecting Client-Side Groq Interfacing
* [ ] **Task 3.1:** Write the asynchronous HTTP `fetch()` request block targeting the Groq API system.
* [ ] **Task 3.2:** Design a prompt instructing the model to review the summary rows against later receipt segments to calculate and extract missing VAT elements.
* [ ] **Task 3.3:** Parse the generated model answers into structural table matrices, incorporating calculation fallbacks if any fields are missing.
