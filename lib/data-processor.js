/**
 * Data Processor - Handle parsing, validation, and calculation of financial data
 */

class DataProcessor {
    constructor() {
        this.transactions = [];
        this.defaultVATRate = 15;
    }

    /**
     * Set default VAT rate
     */
    setDefaultVATRate(rate) {
        this.defaultVATRate = parseFloat(rate) || 15;
    }

    /**
     * Parse and validate LLM response
     */
    parseResponse(response) {
        if (!response || !response.transactions) {
            throw new Error('Invalid response format: missing transactions array');
        }

        if (!Array.isArray(response.transactions)) {
            throw new Error('Invalid response format: transactions must be an array');
        }

        return response.transactions;
    }

    /**
     * Normalize transaction data
     */
    normalizeTransaction(raw, index) {
        const transaction = {
            index: index + 1,
            date: this.parseDate(raw.date) || 'Unknown Date',
            description: (raw.description || '').trim() || 'N/A',
            quantity: this.parseNumber(raw.quantity) || 1,
            price_before_vat: this.parseNumber(raw.price_before_vat),
            extracted_vat_rate_percent: this.parseNumber(raw.extracted_vat_rate_percent),
            calculated_vat_amount: null,
            source_reference_page: raw.source_reference_page || null
        };

        // Validate required field
        if (!transaction.price_before_vat && transaction.price_before_vat !== 0) {
            throw new Error(`Transaction ${index + 1}: Missing or invalid price_before_vat`);
        }

        // Handle VAT calculation
        if (transaction.extracted_vat_rate_percent || transaction.extracted_vat_rate_percent === 0) {
            // VAT rate is explicit
            transaction.calculated_vat_amount = this.calculateVAT(
                transaction.price_before_vat,
                transaction.extracted_vat_rate_percent
            );
        } else if (raw.calculated_vat_amount || raw.calculated_vat_amount === 0) {
            // VAT amount is provided, calculate rate
            transaction.calculated_vat_amount = this.parseNumber(raw.calculated_vat_amount);
            if (transaction.price_before_vat > 0) {
                transaction.extracted_vat_rate_percent = 
                    (transaction.calculated_vat_amount / transaction.price_before_vat) * 100;
            }
        } else {
            // Use default VAT rate
            transaction.extracted_vat_rate_percent = this.defaultVATRate;
            transaction.calculated_vat_amount = this.calculateVAT(
                transaction.price_before_vat,
                this.defaultVATRate
            );
        }

        return transaction;
    }

    /**
     * Calculate VAT amount
     */
    calculateVAT(price, rate) {
        const p = parseFloat(price) || 0;
        const r = parseFloat(rate) || 0;
        return Math.round(p * r / 100 * 100) / 100; // Round to 2 decimals
    }

    /**
     * Parse number safely
     */
    parseNumber(value) {
        if (value === null || value === undefined || value === '') return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }

    /**
     * Parse date string
     */
    parseDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return null;

        // Try to parse as is
        const date = new Date(dateStr);
        if (!isNaN(date)) {
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }

        return null;
    }

    /**
     * Process LLM response and build transaction list
     */
    processLLMResponse(response) {
        try {
            const rawTransactions = this.parseResponse(response);
            this.transactions = rawTransactions.map((raw, index) => {
                try {
                    return this.normalizeTransaction(raw, index);
                } catch (error) {
                    console.warn(`Warning processing transaction ${index + 1}:`, error.message);
                    return null;
                }
            }).filter(t => t !== null);

            if (this.transactions.length === 0) {
                throw new Error('No valid transactions extracted from document');
            }

            return this.transactions;
        } catch (error) {
            throw new Error(`Data processing error: ${error.message}`);
        }
    }

    /**
     * Update transaction in memory
     */
    updateTransaction(index, updates) {
        const transaction = this.transactions[index];
        if (!transaction) {
            throw new Error(`Transaction ${index} not found`);
        }

        // Update basic fields
        if (updates.date !== undefined) transaction.date = updates.date;
        if (updates.description !== undefined) transaction.description = updates.description;
        if (updates.quantity !== undefined) transaction.quantity = this.parseNumber(updates.quantity);

        // Handle price update
        if (updates.price_before_vat !== undefined) {
            transaction.price_before_vat = this.parseNumber(updates.price_before_vat);
        }

        // Handle VAT rate update
        if (updates.extracted_vat_rate_percent !== undefined) {
            transaction.extracted_vat_rate_percent = this.parseNumber(updates.extracted_vat_rate_percent);
        }

        // Handle VAT amount update
        if (updates.calculated_vat_amount !== undefined) {
            transaction.calculated_vat_amount = this.parseNumber(updates.calculated_vat_amount);
        }

        // Recalculate VAT if price or rate changed
        if (updates.price_before_vat !== undefined || updates.extracted_vat_rate_percent !== undefined) {
            if (transaction.price_before_vat && transaction.extracted_vat_rate_percent) {
                transaction.calculated_vat_amount = this.calculateVAT(
                    transaction.price_before_vat,
                    transaction.extracted_vat_rate_percent
                );
            }
        }

        return transaction;
    }

    /**
     * Delete transaction
     */
    deleteTransaction(index) {
        this.transactions.splice(index, 1);
        // Reindex
        this.transactions.forEach((t, i) => {
            t.index = i + 1;
        });
    }

    /**
     * Get summary statistics
     */
    getSummary() {
        return {
            count: this.transactions.length,
            subtotal: this.transactions.reduce((sum, t) => sum + (t.price_before_vat || 0), 0),
            totalVAT: this.transactions.reduce((sum, t) => sum + (t.calculated_vat_amount || 0), 0),
            grandTotal: this.transactions.reduce((sum, t) => 
                sum + (t.price_before_vat || 0) + (t.calculated_vat_amount || 0), 0
            )
        };
    }

    /**
     * Export as CSV
     */
    exportToCSV() {
        const headers = [
            'Index', 'Date', 'Description', 'Qty', 'Unit Price', 
            'VAT Rate %', 'VAT Amount', 'Total (incl. VAT)', 'Source Page'
        ];

        const rows = this.transactions.map(t => [
            t.index,
            t.date,
            `"${(t.description || '').replace(/"/g, '""')}"`, // Escape quotes
            t.quantity,
            (t.price_before_vat || 0).toFixed(2),
            (t.extracted_vat_rate_percent || 0).toFixed(2),
            (t.calculated_vat_amount || 0).toFixed(2),
            ((t.price_before_vat || 0) + (t.calculated_vat_amount || 0)).toFixed(2),
            t.source_reference_page || ''
        ]);

        // Add summary
        const summary = this.getSummary();
        rows.push([]);
        rows.push(['SUMMARY']);
        rows.push(['Total Items:', summary.count]);
        rows.push(['Subtotal:', summary.subtotal.toFixed(2)]);
        rows.push(['Total VAT:', summary.totalVAT.toFixed(2)]);
        rows.push(['Grand Total:', summary.grandTotal.toFixed(2)]);

        // Format CSV
        const csv = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        return csv;
    }

    /**
     * Create downloadable CSV blob
     */
    createCSVBlob() {
        const csv = this.exportToCSV();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        return blob;
    }

    /**
     * Create download URL
     */
    getDownloadURL() {
        const csv = this.exportToCSV();
        return 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    }

    /**
     * Clear all data
     */
    clear() {
        this.transactions = [];
    }
}

// Create global instance
const dataProcessor = new DataProcessor();