/**
 * PDF.js Utilities for PDF parsing and image conversion
 * Handles both text extraction and image generation from PDF documents
 */

class PDFProcessor {
    constructor() {
        // Set up PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.js';
        this.maxPages = 50; // Safety limit for processing
    }

    /**
     * Extract text from PDF document
     * @param {ArrayBuffer} pdfData - PDF file data
     * @returns {Promise<Object>} - { text: string, pageCount: number, pageTexts: string[] }
     */
    async extractTextFromPDF(pdfData) {
        try {
            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
            const pageCount = Math.min(pdf.numPages, this.maxPages);
            let fullText = '';
            const pageTexts = [];

            for (let i = 1; i <= pageCount; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map(item => item.str)
                    .join(' ');
                pageTexts.push(pageText);
                fullText += `\n--- PAGE ${i} ---\n${pageText}`;
            }

            return {
                text: fullText,
                pageCount: pageCount,
                pageTexts: pageTexts
            };
        } catch (error) {
            throw new Error(`PDF text extraction failed: ${error.message}`);
        }
    }

    /**
     * Convert PDF pages to base64-encoded images
     * @param {ArrayBuffer} pdfData - PDF file data
     * @param {number} maxPages - Maximum pages to convert (default: 5)
     * @returns {Promise<Array>} - Array of { pageNumber, base64, width, height }
     */
    async convertPDFToImages(pdfData, maxPages = 5) {
        try {
            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
            const pageCount = Math.min(pdf.numPages, Math.min(maxPages, this.maxPages));
            const images = [];

            for (let i = 1; i <= pageCount; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 2.0 });

                // Create canvas for rendering
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                // Render page to canvas
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                // Convert to base64
                const base64 = canvas.toDataURL('image/png').split(',')[1];

                images.push({
                    pageNumber: i,
                    base64: base64,
                    width: viewport.width,
                    height: viewport.height,
                    mediaType: 'image/png'
                });
            }

            return images;
        } catch (error) {
            throw new Error(`PDF to image conversion failed: ${error.message}`);
        }
    }

    /**
     * Convert image file to base64
     * @param {File} file - Image file
     * @returns {Promise<string>} - Base64-encoded image
     */
    async encodeImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Detect file type and content
     * @param {File} file - File to analyze
     * @returns {Promise<Object>} - { type: 'pdf'|'image', data: ArrayBuffer }
     */
    async detectFileType(file) {
        const buffer = await file.arrayBuffer();
        const view = new Uint8Array(buffer);

        // Check for PDF magic bytes (25 50 44 46)
        if (view[0] === 0x25 && view[1] === 0x50 && view[2] === 0x44 && view[3] === 0x46) {
            return { type: 'pdf', data: buffer };
        }

        // Check common image formats
        const isPNG = view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47;
        const isJPEG = view[0] === 0xFF && view[1] === 0xD8;
        const isGIF = view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46;

        if (isPNG || isJPEG || isGIF) {
            return { type: 'image', data: buffer };
        }

        throw new Error('Unsupported file type. Please upload a PDF or image file.');
    }

    /**
     * Process file and extract content
     * @param {File} file - File to process
     * @returns {Promise<Object>} - { type, text?, images?, pageCount? }
     */
    async processFile(file) {
        const { type, data } = await this.detectFileType(file);

        if (type === 'pdf') {
            // Try to extract text first
            const textResult = await this.extractTextFromPDF(data);
            // Also get images for better LLM processing
            const images = await this.convertPDFToImages(data, 10);
            
            return {
                type: 'pdf',
                text: textResult.text,
                pageTexts: textResult.pageTexts,
                pageCount: textResult.pageCount,
                images: images
            };
        } else {
            // For images, encode directly
            const base64 = await this.encodeImageToBase64(file);
            
            return {
                type: 'image',
                base64: base64,
                mediaType: file.type || 'image/png',
                fileName: file.name
            };
        }
    }
}

// Create global instance
const pdfProcessor = new PDFProcessor();