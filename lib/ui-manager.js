/**
 * UI Manager - Handle all UI state and interactive updates
 */

class UIManager {
    constructor() {
        this.initialized = false;
        this.isProcessing = false;
    }

    /**
     * Initialize UI
     */
    init() {
        if (this.initialized) return;

        this.setupLocalStorage();
        this.setupEventListeners();
        this.loadSavedConfig();

        this.initialized = true;
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Configuration
        document.getElementById('save-config-btn').addEventListener('click', 
            () => this.saveConfiguration());

        // File handling
        document.getElementById('file-input').addEventListener('change', 
            (e) => this.handleFileSelect(e));
        document.getElementById('file-input-btn').addEventListener('click', 
            () => document.getElementById('file-input').click());

        // Drop zone
        const dropZone = document.getElementById('drop-zone');
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            dropZone.addEventListener(event, (e) => this.handleDropEvent(e));
        });

        // Grid actions
        document.getElementById('export-csv-btn')?.addEventListener('click', 
            () => this.exportCSV());
        document.getElementById('clear-data-btn')?.addEventListener('click', 
            () => this.clearData());

        // Settings button
        document.getElementById('settings-btn')?.addEventListener('click', 
            () => this.toggleSettings());
    }

    /**
     * Setup local storage binding
     */
    setupLocalStorage() {
        // Storage keys
        this.storageKeys = {
            apiProvider: 'pdfvat_api_provider',
            apiKey: 'pdfvat_api_key',
            modelId: 'pdfvat_model_id',
            apiBaseUrl: 'pdfvat_api_base_url',
            vatRate: 'pdfvat_vat_rate'
        };
    }

    /**
     * Save configuration to localStorage
     */
    saveConfiguration() {
        const provider = document.getElementById('api-provider').value;
        const apiKey = document.getElementById('api-key').value;
        const modelId = document.getElementById('model-id').value;
        const apiBaseUrl = document.getElementById('api-base-url').value;
        const vatRate = document.getElementById('vat-rate').value;

        if (!apiKey.trim()) {
            this.showStatus('error', 'API key is required');
            return;
        }

        localStorage.setItem(this.storageKeys.apiProvider, provider);
        localStorage.setItem(this.storageKeys.apiKey, apiKey);
        localStorage.setItem(this.storageKeys.modelId, modelId);
        localStorage.setItem(this.storageKeys.apiBaseUrl, apiBaseUrl);
        localStorage.setItem(this.storageKeys.vatRate, vatRate);

        // Update instances
        aiGateway.updateConfig({
            provider: provider,
            apiKey: apiKey,
            modelId: modelId,
            apiBaseUrl: apiBaseUrl
        });

        dataProcessor.setDefaultVATRate(vatRate);

        this.showStatus('success', 'Configuration saved successfully');
    }

    /**
     * Load saved configuration
     */
    loadSavedConfig() {
        const provider = localStorage.getItem(this.storageKeys.apiProvider) || 'openai';
        const apiKey = localStorage.getItem(this.storageKeys.apiKey) || '';
        const modelId = localStorage.getItem(this.storageKeys.modelId) || '';
        const apiBaseUrl = localStorage.getItem(this.storageKeys.apiBaseUrl) || '';
        const vatRate = localStorage.getItem(this.storageKeys.vatRate) || '15';

        document.getElementById('api-provider').value = provider;
        document.getElementById('api-key').value = apiKey;
        document.getElementById('model-id').value = modelId;
        document.getElementById('api-base-url').value = apiBaseUrl;
        document.getElementById('vat-rate').value = vatRate;

        // Update instances
        if (apiKey) {
            aiGateway.updateConfig({
                provider: provider,
                apiKey: apiKey,
                modelId: modelId,
                apiBaseUrl: apiBaseUrl
            });
            dataProcessor.setDefaultVATRate(vatRate);
        }
    }

    /**
     * Handle file selection
     */
    async handleFileSelect(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        await this.processFile(files[0]);
    }

    /**
     * Handle drag and drop
     */
    handleDropEvent(event) {
        event.preventDefault();
        event.stopPropagation();

        const dropZone = document.getElementById('drop-zone');

        if (event.type === 'dragenter' || event.type === 'dragover') {
            dropZone.classList.add('drag-over');
        } else {
            dropZone.classList.remove('drag-over');
        }

        if (event.type === 'drop') {
            const files = event.dataTransfer.files;
            if (files && files.length > 0) {
                this.processFile(files[0]);
            }
        }
    }

    /**
     * Main file processing
     */
    async processFile(file) {
        try {
            this.setProcessing(true);
            this.clearError();

            // Validate API configuration
            if (!aiGateway.config.apiKey) {
                throw new Error('API key not configured. Please configure your API credentials in the settings panel.');
            }

            // Process file
            this.updateStatus('Processing file...');
            const fileContent = await pdfProcessor.processFile(file);

            // Send to LLM
            this.updateStatus('Sending to AI for analysis...');
            let llmContent;
            let isVision = false;

            // Prefer vision for PDFs with images
            if (fileContent.type === 'pdf' && fileContent.images && fileContent.images.length > 0) {
                isVision = true;
                llmContent = fileContent.images.map((img, idx) => ({
                    type: 'image_url',
                    image_url: {
                        url: `data:${img.mediaType};base64,${img.base64}`,
                        detail: 'high'
                    }
                }));
            } else if (fileContent.type === 'image') {
                isVision = true;
                llmContent = [
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:${fileContent.mediaType};base64,${fileContent.base64}`,
                            detail: 'high'
                        }
                    }
                ];
            } else {
                // Use text content
                llmContent = fileContent.text || fileContent.pageTexts.join('\n');
            }

            this.updateStatus('Parsing response...');
            const response = await aiGateway.extractFinancialData(llmContent, { isVisionRequest: isVision });

            // Process and display results
            this.updateStatus('Processing data...');
            const transactions = dataProcessor.processLLMResponse(response);

            this.displayData(transactions);
            this.setProcessing(false);

        } catch (error) {
            this.setProcessing(false);
            this.showError(error.message, error.stack);
        }
    }

    /**
     * Display transactions in grid
     */
    displayData(transactions) {
        const gridBody = document.getElementById('grid-body');
        const gridSection = document.getElementById('grid-section');
        const uploadSection = document.querySelector('.upload-section');

        gridBody.innerHTML = '';

        transactions.forEach((transaction, index) => {
            const row = this.createTableRow(transaction, index);
            gridBody.appendChild(row);
        });

        // Show grid, hide upload
        gridSection.classList.remove('hidden');
        uploadSection.style.display = 'none';

        // Update summary
        this.updateSummary();
    }

    /**
     * Create table row
     */
    createTableRow(transaction, index) {
        const row = document.createElement('tr');
        const totalPrice = (transaction.price_before_vat || 0) + (transaction.calculated_vat_amount || 0);

        row.innerHTML = `
            <td>${transaction.index}</td>
            <td><input type="text" class="table-input" data-field="date" value="${transaction.date}" 
                       onchange="uiManager.handleCellChange(${index}, 'date', this.value)"></td>
            <td><input type="text" class="table-input" data-field="description" value="${transaction.description}" 
                       onchange="uiManager.handleCellChange(${index}, 'description', this.value)"></td>
            <td><input type="number" class="table-input" data-field="quantity" value="${transaction.quantity}" 
                       step="0.01" onchange="uiManager.handleCellChange(${index}, 'quantity', this.value)"></td>
            <td><input type="number" class="table-input" data-field="price_before_vat" 
                       value="${(transaction.price_before_vat || 0).toFixed(2)}" step="0.01" 
                       onchange="uiManager.handleCellChange(${index}, 'price_before_vat', this.value)"></td>
            <td><input type="number" class="table-input" data-field="extracted_vat_rate_percent" 
                       value="${(transaction.extracted_vat_rate_percent || 0).toFixed(2)}" step="0.01" min="0" max="100"
                       onchange="uiManager.handleCellChange(${index}, 'extracted_vat_rate_percent', this.value)"></td>
            <td><input type="number" class="table-input" data-field="calculated_vat_amount" 
                       value="${(transaction.calculated_vat_amount || 0).toFixed(2)}" step="0.01" readonly style="background: #f5f5f5;"></td>
            <td>${totalPrice.toFixed(2)}</td>
            <td>${transaction.source_reference_page || '-'}</td>
            <td>
                <button class="btn-danger btn-small" onclick="uiManager.deleteRow(${index})">Delete</button>
            </td>
        `;

        return row;
    }

    /**
     * Handle cell changes
     */
    handleCellChange(index, field, value) {
        try {
            const updated = dataProcessor.updateTransaction(index, {
                [field]: value
            });

            // Refresh the row
            this.refreshRow(index, updated);
            this.updateSummary();

        } catch (error) {
            this.showError(`Validation error: ${error.message}`);
        }
    }

    /**
     * Refresh single row
     */
    refreshRow(index, transaction) {
        const gridBody = document.getElementById('grid-body');
        const oldRow = gridBody.children[index];
        const newRow = this.createTableRow(transaction, index);
        oldRow.replaceWith(newRow);
    }

    /**
     * Delete row
     */
    deleteRow(index) {
        if (!confirm('Delete this transaction?')) return;

        dataProcessor.deleteTransaction(index);

        // Refresh display
        if (dataProcessor.transactions.length > 0) {
            this.displayData(dataProcessor.transactions);
        } else {
            this.clearData();
        }
    }

    /**
     * Update summary statistics
     */
    updateSummary() {
        const summary = dataProcessor.getSummary();

        document.getElementById('summary-count').textContent = summary.count;
        document.getElementById('summary-subtotal').textContent = '$' + summary.subtotal.toFixed(2);
        document.getElementById('summary-vat').textContent = '$' + summary.totalVAT.toFixed(2);
        document.getElementById('summary-total').textContent = '$' + summary.grandTotal.toFixed(2);
    }

    /**
     * Export to CSV
     */
    exportCSV() {
        try {
            const url = dataProcessor.getDownloadURL();
            const link = document.createElement('a');
            link.href = url;
            link.download = `vat-extract-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            this.showError('Failed to export CSV: ' + error.message);
        }
    }

    /**
     * Clear all data
     */
    clearData() {
        if (!confirm('Clear all data and start over?')) return;

        dataProcessor.clear();

        const gridSection = document.getElementById('grid-section');
        const uploadSection = document.querySelector('.upload-section');

        gridSection.classList.add('hidden');
        uploadSection.style.display = 'flex';

        this.clearError();
        this.clearStatus();

        // Reset file input
        document.getElementById('file-input').value = '';
    }

    /**
     * Toggle settings sidebar
     */
    toggleSettings() {
        const sidebar = document.querySelector('.control-sidebar');
        sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
    }

    /**
     * Set processing state
     */
    setProcessing(isProcessing) {
        this.isProcessing = isProcessing;
        const processingSection = document.getElementById('processing-section');
        const uploadSection = document.querySelector('.upload-section');

        if (isProcessing) {
            uploadSection.style.display = 'none';
            processingSection.classList.remove('hidden');
        } else {
            processingSection.classList.add('hidden');
        }
    }

    /**
     * Update processing status message
     */
    updateStatus(message) {
        const statusEl = document.getElementById('processing-status');
        if (statusEl) {
            statusEl.textContent = message;
        }
    }

    /**
     * Show error
     */
    showError(message, details = '') {
        const errorBox = document.getElementById('error-display');
        const errorMessage = document.getElementById('error-message');
        const errorDetails = document.getElementById('error-details');

        errorMessage.textContent = message;
        errorDetails.value = details;

        errorBox.classList.remove('hidden');
    }

    /**
     * Clear error
     */
    clearError() {
        const errorBox = document.getElementById('error-display');
        errorBox.classList.add('hidden');
    }

    /**
     * Show status message
     */
    showStatus(type, message) {
        const statusEl = document.getElementById('config-status');
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;
        
        if (type === 'success') {
            setTimeout(() => {
                statusEl.className = 'status-message';
                statusEl.textContent = '';
            }, 3000);
        }
    }

    /**
     * Clear status
     */
    clearStatus() {
        const statusEl = document.getElementById('config-status');
        statusEl.className = 'status-message';
        statusEl.textContent = '';
    }
}

// Create global instance
const uiManager = new UIManager();