# System Architecture & Technical Design: PDF Core Table Converter

## 1. System Technology Blueprint
* **Client Interface:** Pure HTML5 structure paired with inline structural CSS rendering to guarantee cross-device framework speed.
* **PDF Engine Framework:** `pdfjs-dist` (Mozilla PDF.js library) integrated via client-side scripts to function as the core `pdfprocessor`.
* **API Ingestion Engine:** JavaScript native `Fetch API` wrapping multi-provider schema objects.

## 2. Structural Architecture & Core Data Lifecycles
```
+--------------------------------------------------------------------------+
|                            USER WEB CONSOLE                              |
|                                                                          |
|  +--------------------+     +--------------------+     +--------------+  |
|  | File Upload Node   | --> | pdfprocessor Core  | --> | Prompt Token |  |
|  | (Local Financial)  |     | (Extract Text/Img) |     | Synthesizer  |  |
|  +--------------------+     +--------------------+     +------+-------+  |
+---------------------------------------------------------------|----------+
                                                                |
                          Dynamic Target Verification Routing   v
+--------------------------------------------------------------------------+
|                     ENDPOINT LOGIC CONTROLLER                            |
|                                                                          |
|       /--------- User populated form input tokens detected? ---------\   |
|      /                                                                \  |
|     YES                                                               NO |
|      v                                                                v  |
|  [Route to Input Token Target]                      [Auto Route OpenAI]  |
+---------------------------------------------------------------|----------+
                                                                |
                                    Secure JSON Request Packets v
+--------------------------------------------------------------------------+
|                         CLOUD COMPUTE INSTANCE                           |
|                    (OpenAI Engine / Custom Provider)                     |
|                                                                          |
|  * Processes page 2 core lists against appended items.                  |
|  * Matches invoice entries to assign correct tax brackets.              |
+---------------------------------------------------------------|----------+
                                                                |
                                      Normalized JSON Response  v
+--------------------------------------------------------------------------+
|                             DOM DATA VISUALIZER                          |
|                                                                          |
|  +--------------------------+        +--------------------------------+  |
|  | Dynamic JSON Array Parse | -----> | Dynamic Data Grid Engine       |  |
|  | & Math Fallback Check    |        | (Editable Cells + New VAT Col) |  |
|  +--------------------------+        +--------------------------------+  |
+--------------------------------------------------------------------------+
```

## 3. Context Payload & Extraction Directives
The application feeds text chunks extracted by the `pdfprocessor` directly into the LLM system. The instruction array uses deterministic constraints:

```
"System Directive: Extract all ledger items listed on Page 2. Note that the cover matrix does not specify individual VAT amounts. Cross-reference all listed transaction keys against subsequent receipt fields found in later text chunks. Output a strict JSON structure containing the items and their verified tax parameters."
```

### JSON Format Schema Target:
```json
{
  "transactions": [
    {
      "id": 1,
      "date": "2026-01-01",
      "vendor_description": "Al Ghamdi Resto",
      "quantity": 1,
      "base_price": 32.00,
      "vat_rate_percentage": 15.00,
      "computed_vat_value": 4.80,
      "total_gross_value": 36.80
    }
  ]
}
```

## 4. UI Grid Interface Structure
The document grid is constructed dynamically via JavaScript:
`[ ID | Date | Item Description | Qty | Base Price | VAT (Added) | Total Gross | Actions ]`

Cells mapped to price inputs possess active listener variables (`contenteditable="true"` or element value binds) ensuring that typing modifications re-execute row equations immediately.
