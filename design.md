# System Architecture & Technical Design: HTML/JS Document VAT Calculator

## 1. Technological Blueprint
* **View Layer:** Single-file semantic HTML5 canvas layout using native window DOM controls.
* **Parsing Component:** `pdfjs-dist` CDN script handles structural mapping of raw binary documents to extract line strings without external server proxies.
* **API Framework Adaptor:** Transforms standard `groq-sdk` Node import structures into structural JSON requests:
  ```javascript
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  ```

## 2. Dynamic Input/Output Payload Contract
The system formats the data extracted from all pages and pushes it directly into the chat prompt context window targeting `llama-3.3-70b-versatile`.

### Response Schema Standard
```json
{
  "transactions": [
    {
      "no": 1,
      "tanggal": "1 Jan 2026",
      "keterangan": "Al Ghamdi Resto, sarapan dan makan siang",
      "harga_sar": 32.00,
      "vat_sar": 4.80,
      "total_incl_vat": 36.80
    }
  ]
}
```

## 3. UI/UX Elements
* **Dashboard Control:** Text field input masks allowing instant updating of the Groq API key (`gsk_...`) and toggle selectors for designated inference models.
* **Data Presentation Engine:** An editable responsive spreadsheet layout allowing cells to instantly auto-compute balances when user changes occur.
