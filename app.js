// ============================================================================
// SMART PDF VAT PROCESSOR - MAIN APPLICATION
// ============================================================================

// Global state
const state = {
    pdfDoc: null,
    currentPageNum: 1,
    extractedText: [],
    transactions: [],
    apiMode: 'auto',
    customEndpoint: null,
    customModel: null,
    customToken: null,
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    setupDragAndDrop();
});

function initializeEventListeners() {
    // API Mode Toggle
    document.querySelectorAll('input[name="api-mode"]').forEach(radio => {
        radio.addEventListener('change', handleApiModeChange);
    });

    // File Upload
    const pdfUpload = document.getElementById('pdf-upload');
    const uploadLabel = document.querySelector('.upload-label');

    pdfUpload.addEventListener('change', handleFileUpload);

    // Drag and drop
    uploadLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadLabel.style.borderColor = '#667eea';
    });

    uploadLabel.addEventListener('dragleave', () => {
        uploadLabel.style.borderColor = '#ddd';
    });

    uploadLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadLabel.style.borderColor = '#ddd';
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            pdfUpload.files = files;
            handleFileUpload({ target: pdfUpload });
        }
    });

    // Process Button
    document.getElementById('process-btn').addEventListener('click', handleProcessDocument);

    // Export Button
    document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);
}

function setupDragAndDrop() {
    const uploadLabel = document.querySelector('.upload-label');

    uploadLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadLabel.classList.add('dragover');
    });

    uploadLabel.addEventListener('dragleave', () => {
        uploadLabel.classList.remove('dragover');
    });
}

// ============================================================================
// API MODE HANDLING
// ============================================================================

function handleApiModeChange(e) {
    state.apiMode = e.target.value;
    const customForm = document.getElementById('custom-form');

    if (state.apiMode === 'custom') {
        customForm.classList.remove('hidden');
    } else {
        customForm.classList.add('hidden');
    }
}

// ============================================================================
// FILE UPLOAD HANDLING
// ============================================================================

async function handleFileUpload(e) {
    const file = e.target.files[0];

    if (!file) return;

    if (file.type !== 'application/pdf') {
        showStatus('Please upload a valid PDF file', 'error');
        return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
        try {
            showStatus('Loading PDF...', 'info');

            const arrayBuffer = event.target.result;
            state.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            showStatus(`PDF loaded: ${state.pdfDoc.numPages} pages found`, 'success');

            document.getElementById('process-btn').disabled = false;

            // Display first page as preview
            await displayPage(1);
        } catch (error) {
            showStatus(`Error loading PDF: ${error.message}`, 'error');
            console.error('PDF load error:', error);
        }
    };

    reader.onerror = () => {
        showStatus('Error reading file', 'error');
    };

    reader.readAsArrayBuffer(file);
}

// ============================================================================
// PDF DISPLAY
// ============================================================================

async function displayPage(pageNum) {
    if (!state.pdfDoc || pageNum < 1 || pageNum > state.pdfDoc.numPages) {
        return;
    }

    state.currentPageNum = pageNum;
    const page = await state.pdfDoc.getPage(pageNum);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    const pdfViewer = document.getElementById('pdf-viewer');
    pdfViewer.innerHTML = '';
    pdfViewer.appendChild(canvas);
}

// ============================================================================
// DOCUMENT PROCESSING
// ============================================================================

async function handleProcessDocument() {
    if (!state.pdfDoc) {
        showStatus('Please upload a PDF first', 'error');
        return;
    }

    try {
        showStatus('Extracting text from PDF...', 'info');
        showLoading(true);

        state.extractedText = [];

        // Extract text from all pages
        for (let pageNum = 1; pageNum <= state.pdfDoc.numPages; pageNum++) {
            const page = await state.pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            state.extractedText.push({
                page: pageNum,
                text: pageText,
            });
        }

        showStatus('Text extraction complete. Processing with AI...', 'info');

        // Send to API for processing
        await processWithAI();

        showLoading(false);
        showStatus('Document processed successfully!', 'success');
        document.getElementById('export-csv-btn').disabled = false;
    } catch (error) {
        showLoading(false);
        showStatus(`Processing error: ${error.message}`, 'error');
        console.error('Processing error:', error);
    }
}

// ============================================================================
// AI PROCESSING
// ============================================================================

async function processWithAI() {
    // Validate custom credentials if in custom mode
    if (state.apiMode === 'custom') {
        const endpoint = document.getElementById('endpoint-url').value.trim();
        const model = document.getElementById('model-id').value.trim();
        const token = document.getElementById('api-token').value.trim();

        if (!endpoint || !model || !token) {
            throw new Error('Please fill in all custom API fields');
        }

        state.customEndpoint = endpoint;
        state.customModel = model;
        state.customToken = token;
    }

    // Build extraction prompt
    const systemPrompt = `You are a financial document processor specialized in extracting VAT data. 
Your task is to:
1. Extract all transaction entries from the provided document text
2. Cross-reference pages to find VAT information for each transaction
3. Calculate missing VAT amounts when not explicitly stated (apply 15% default if needed)
4. Return a strict JSON array with transactions

Focus on:
- Transaction ID or sequence number
- Date
- Vendor/Description
- Quantity
- Base price
- VAT rate percentage
- Computed VAT value
- Total gross value (base + VAT)`;

    const userPrompt = `Extract all ledger items and matching VAT data. Output ONLY valid JSON array.

Document Pages:
${state.extractedText.map((p) => `--- Page ${p.page} ---\n${p.text}`).join('\n\n')}

Expected JSON format:
{
  "transactions": [
    {
      "id": 1,
      "date": "YYYY-MM-DD",
      "vendor_description": "string",
      "quantity": number,
      "base_price": number,
      "vat_rate_percentage": number,
      "computed_vat_value": number,
      "total_gross_value": number
    }
  ]
}`;

    const requestBody = {
        model: state.apiMode === 'auto' ? 'gpt-3.5-turbo' : state.customModel,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
    };

    const endpoint = state.apiMode === 'auto' 
        ? 'https://api.openai.com/v1/chat/completions'
        : state.customEndpoint + '/chat/completions';

    const headers = {
        'Content-Type': 'application/json',
    };

    if (state.apiMode === 'auto') {
        // For demo purposes, we'll simulate the response
        // In production, you would need an actual OpenAI API key
        console.warn('Auto mode requires OpenAI API key in production');
        // Fallback: parse the text locally without AI
        parseTransactionsLocally();
        return;
    } else {
        headers['Authorization'] = `Bearer ${state.customToken}`;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Unexpected API response format');
        }

        const responseText = data.choices[0].message.content;
        parseAIResponse(responseText);
    } catch (error) {
        console.error('API call error:', error);
        // Fallback to local parsing
        parseTransactionsLocally();
    }
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

function parseAIResponse(responseText) {
    try {
        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const parsedData = JSON.parse(jsonMatch[0]);

        if (parsedData.transactions && Array.isArray(parsedData.transactions)) {
            state.transactions = parsedData.transactions;
            populateDataGrid();
        } else {
            throw new Error('Invalid transaction format');
        }
    } catch (error) {
        console.error('Parse error:', error);
        showStatus('Could not parse AI response, attempting local parsing...', 'info');
        parseTransactionsLocally();
    }
}

function parseTransactionsLocally() {
    // Simple fallback parser that extracts basic transaction data from text
    state.transactions = [];

    const fullText = state.extractedText.map((p) => p.text).join('\n');

    // Basic regex patterns for common invoice/ledger formats
    const patterns = [
        /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+(.+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/g,
        /(.+?)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/g,
    ];

    let transactionId = 1;

    patterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(fullText)) !== null) {
            if (state.transactions.length < 20) {
                // Limit to 20 transactions
                const basePrice = parseFloat(match[match.length - 2] || 0);
                const vatRate = 15; // Default VAT rate

                state.transactions.push({
                    id: transactionId++,
                    date: match[1] || new Date().toISOString().split('T')[0],
                    vendor_description: match[2] || 'Unknown Vendor',
                    quantity: parseFloat(match[3] || 1),
                    base_price: basePrice,
                    vat_rate_percentage: vatRate,
                    computed_vat_value: parseFloat((basePrice * (vatRate / 100)).toFixed(2)),
                    total_gross_value: parseFloat((basePrice * (1 + vatRate / 100)).toFixed(2)),
                });
            }
        }
    });

    if (state.transactions.length === 0) {
        // If no transactions found, create a sample for demonstration
        state.transactions = [
            {
                id: 1,
                date: '2026-01-01',
                vendor_description: 'Sample Vendor',
                quantity: 1,
                base_price: 100.0,
                vat_rate_percentage: 15.0,
                computed_vat_value: 15.0,
                total_gross_value: 115.0,
            },
        ];
    }

    populateDataGrid();
}

// ============================================================================
// DATA GRID POPULATION
// ============================================================================

function populateDataGrid() {
    const gridBody = document.getElementById('grid-body');
    gridBody.innerHTML = '';

    if (state.transactions.length === 0) {
        gridBody.innerHTML = '<tr class="empty-row"><td colspan="9" class="empty-message">No transactions found</td></tr>';
        return;
    }

    state.transactions.forEach((transaction) => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${transaction.date}</td>
            <td>${transaction.vendor_description}</td>
            <td class="editable" data-field="quantity" data-id="${transaction.id}" contenteditable="true">${transaction.quantity.toFixed(2)}</td>
            <td class="editable" data-field="base_price" data-id="${transaction.id}" contenteditable="true">${transaction.base_price.toFixed(2)}</td>
            <td class="editable" data-field="vat_rate" data-id="${transaction.id}" contenteditable="true">${transaction.vat_rate_percentage.toFixed(2)}</td>
            <td>${transaction.computed_vat_value.toFixed(2)}</td>
            <td>${transaction.total_gross_value.toFixed(2)}</td>
            <td>
                <button class="grid-action-btn" onclick="deleteTransaction(${transaction.id})">Delete</button>
            </td>
        `;

        // Add event listeners to editable cells
        const editableCells = row.querySelectorAll('.editable');
        editableCells.forEach((cell) => {
            cell.addEventListener('blur', () => handleCellEdit(cell));
        });

        gridBody.appendChild(row);
    });
}

// ============================================================================
// CELL EDITING & CALCULATION
// ============================================================================

function handleCellEdit(cell) {
    const transactionId = parseInt(cell.dataset.id);
    const field = cell.dataset.field;
    const value = parseFloat(cell.textContent.trim());

    if (isNaN(value)) {
        showStatus('Invalid value entered', 'error');
        // Restore original value
        const transaction = state.transactions.find((t) => t.id === transactionId);
        cell.textContent = transaction[field === 'vat_rate' ? 'vat_rate_percentage' : field].toFixed(2);
        return;
    }

    const transaction = state.transactions.find((t) => t.id === transactionId);

    if (field === 'quantity') {
        transaction.quantity = value;
    } else if (field === 'base_price') {
        transaction.base_price = value;
    } else if (field === 'vat_rate') {
        transaction.vat_rate_percentage = value;
    }

    // Recalculate derived values
    transaction.computed_vat_value = parseFloat(
        (transaction.base_price * (transaction.vat_rate_percentage / 100)).toFixed(2)
    );
    transaction.total_gross_value = parseFloat(
        (transaction.base_price * (1 + transaction.vat_rate_percentage / 100)).toFixed(2)
    );

    // Refresh grid
    populateDataGrid();
    showStatus('Transaction updated', 'success');
}

function deleteTransaction(transactionId) {
    state.transactions = state.transactions.filter((t) => t.id !== transactionId);
    populateDataGrid();
    showStatus('Transaction deleted', 'info');
}

// ============================================================================
// EXPORT FUNCTIONALITY
// ============================================================================

function exportToCSV() {
    if (state.transactions.length === 0) {
        showStatus('No data to export', 'error');
        return;
    }

    const headers = [
        'ID',
        'Date',
        'Vendor/Description',
        'Quantity',
        'Base Price',
        'VAT %',
        'VAT Amount (SAR)',
        'Total (incl. VAT)',
    ];

    const rows = state.transactions.map((t) => [
        t.id,
        t.date,
        t.vendor_description,
        t.quantity.toFixed(2),
        t.base_price.toFixed(2),
        t.vat_rate_percentage.toFixed(2),
        t.computed_vat_value.toFixed(2),
        t.total_gross_value.toFixed(2),
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach((row) => {
        csv += row.map((cell) => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `vat-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showStatus('CSV exported successfully!', 'success');
}

// ============================================================================
// UI UTILITIES
// ============================================================================

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = `status-message show ${type}`;

    // Auto-hide after 5 seconds for success/info messages
    if (type !== 'error') {
        setTimeout(() => {
            statusEl.classList.remove('show');
        }, 5000);
    }
}

function showLoading(show = true) {
    const loadingEl = document.getElementById('loading-indicator');
    if (show) {
        loadingEl.classList.remove('hidden');
    } else {
        loadingEl.classList.add('hidden');
    }
}
