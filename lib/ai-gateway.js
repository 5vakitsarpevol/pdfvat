/**
 * AI Gateway - Unified connector for multiple LLM providers
 * Routes requests to OpenAI, Anthropic, Groq, or Gemini
 */

class AIGateway {
    constructor(config = {}) {
        this.config = {
            provider: 'openai',
            apiKey: '',
            modelId: 'gpt-4-vision',
            apiBaseUrl: '',
            ...config
        };

        this.providerConfigs = {
            openai: {
                defaultModel: 'gpt-4-vision',
                defaultBaseUrl: 'https://api.openai.com/v1',
                supportsVision: true,
                supportsJsonMode: true
            },
            anthropic: {
                defaultModel: 'claude-3-sonnet-20240229',
                defaultBaseUrl: 'https://api.anthropic.com',
                supportsVision: true,
                supportsJsonMode: false
            },
            groq: {
                defaultModel: 'mixtral-8x7b-32768',
                defaultBaseUrl: 'https://api.groq.com/openai/v1',
                supportsVision: false,
                supportsJsonMode: true
            },
            gemini: {
                defaultModel: 'gemini-1.5-flash',
                defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
                supportsVision: true,
                supportsJsonMode: false
            }
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Build system prompt for financial document parsing
     */
    buildSystemPrompt() {
        return `You are an expert financial document analyzer specialized in extracting transaction data from receipts, invoices, and expense reports.

Your task is to extract all financial line items from the provided document(s) and return them as structured JSON.

CRITICAL INSTRUCTIONS:
1. Extract ALL transaction rows from the document
2. Note that the first/summary page often OMITS VAT details and tax amounts
3. Look at SUBSEQUENT PAGES for raw receipt data with actual VAT amounts
4. For each transaction, extract or calculate the following fields:
   - date: Transaction date (format: "DD Mon YYYY")
   - description: Item or service description (be concise)
   - quantity: Item quantity (default: 1)
   - price_before_vat: Price before any taxes
   - extracted_vat_rate_percent: VAT/Tax percentage (if not explicit, use 15 as default)
   - calculated_vat_amount: VAT amount = price_before_vat * extracted_vat_rate_percent / 100
   - source_reference_page: Which page this item came from

5. ALWAYS return valid JSON with proper formatting
6. If a field cannot be extracted, use null
7. Include ALL line items you find, even if partially unclear

Return ONLY valid JSON in this exact format:
{
  "transactions": [
    {
      "index": 1,
      "date": "1 Jan 2026",
      "description": "Item description",
      "quantity": 1,
      "price_before_vat": 32.00,
      "extracted_vat_rate_percent": 15.0,
      "calculated_vat_amount": 4.80,
      "source_reference_page": 2
    }
  ]
}`;
    }

    /**
     * Extract text content and prepare for OpenAI
     */
    async callOpenAI(content, isVisionRequest = false) {
        const endpoint = this.config.apiBaseUrl || this.providerConfigs.openai.defaultBaseUrl;
        const url = `${endpoint}/chat/completions`;

        const messages = [
            {
                role: 'system',
                content: this.buildSystemPrompt()
            },
            {
                role: 'user',
                content: isVisionRequest ? content : [
                    {
                        type: 'text',
                        text: `Extract financial data from this document:\n\n${content}`
                    }
                ]
            }
        ];

        // Handle vision requests with images
        if (isVisionRequest && Array.isArray(content)) {
            messages[1].content = [
                {
                    type: 'text',
                    text: 'Please analyze these document images and extract all transaction data as structured JSON.'
                },
                ...content
            ];
        }

        const requestBody = {
            model: this.config.modelId || this.providerConfigs.openai.defaultModel,
            messages: messages,
            temperature: 0.2,
            max_tokens: 4000,
            response_format: { type: 'json_object' }
        };

        return await this.fetchAPI(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        }, 'openai');
    }

    /**
     * Call Anthropic Claude API
     */
    async callAnthropic(content, isVisionRequest = false) {
        const endpoint = this.config.apiBaseUrl || this.providerConfigs.anthropic.defaultBaseUrl;
        const url = `${endpoint}/v1/messages`;

        let messageContent = [];

        if (isVisionRequest && Array.isArray(content)) {
            messageContent = content;
        } else if (typeof content === 'string') {
            messageContent = [
                {
                    type: 'text',
                    text: `Extract financial data from this document:\n\n${content}`
                }
            ];
        }

        const requestBody = {
            model: this.config.modelId || this.providerConfigs.anthropic.defaultModel,
            max_tokens: 4000,
            system: this.buildSystemPrompt(),
            messages: [
                {
                    role: 'user',
                    content: messageContent
                }
            ]
        };

        return await this.fetchAPI(url, {
            method: 'POST',
            headers: {
                'x-api-key': this.config.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        }, 'anthropic');
    }

    /**
     * Call Groq API (OpenAI-compatible)
     */
    async callGroq(content) {
        const endpoint = this.config.apiBaseUrl || this.providerConfigs.groq.defaultBaseUrl;
        const url = `${endpoint}/chat/completions`;

        const requestBody = {
            model: this.config.modelId || this.providerConfigs.groq.defaultModel,
            messages: [
                {
                    role: 'system',
                    content: this.buildSystemPrompt()
                },
                {
                    role: 'user',
                    content: `Extract financial data from this document:\n\n${content}`
                }
            ],
            temperature: 0.2,
            max_tokens: 4000,
            response_format: { type: 'json_object' }
        };

        return await this.fetchAPI(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        }, 'groq');
    }

    /**
     * Call Google Gemini API
     */
    async callGemini(content, isVisionRequest = false) {
        const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${this.config.apiKey}`;

        let messages = [
            {
                role: 'system',
                content: this.buildSystemPrompt()
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Please analyze these documents and extract all transaction data as valid JSON.'
                    }
                ]
            }
        ];

        if (isVisionRequest && Array.isArray(content)) {
            messages[1].content.push(...content);
        } else if (typeof content === 'string') {
            messages[1].content.push({
                type: 'text',
                text: `Document content:\n${content}`
            });
        }

        const requestBody = {
            model: this.config.modelId || this.providerConfigs.gemini.defaultModel,
            messages: messages,
            temperature: 0.2,
            max_tokens: 4000
        };

        return await this.fetchAPI(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        }, 'gemini');
    }

    /**
     * Generic fetch wrapper with error handling
     */
    async fetchAPI(url, options, provider) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(
                    `${provider.toUpperCase()} API Error (${response.status}): ${
                        errorData.error?.message || errorData.message || JSON.stringify(errorData)
                    }`
                );
            }

            return await response.json();
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error(`Network error calling ${provider}: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Main method - route to appropriate provider and format response
     */
    async extractFinancialData(content, options = {}) {
        const { isVisionRequest = false } = options;

        if (!this.config.apiKey) {
            throw new Error('API key not configured. Please set your API credentials.');
        }

        let response;

        switch (this.config.provider) {
            case 'openai':
                response = await this.callOpenAI(content, isVisionRequest);
                break;
            case 'anthropic':
                response = await this.callAnthropic(content, isVisionRequest);
                break;
            case 'groq':
                response = await this.callGroq(content);
                break;
            case 'gemini':
                response = await this.callGemini(content, isVisionRequest);
                break;
            default:
                throw new Error(`Unknown provider: ${this.config.provider}`);
        }

        // Extract content based on provider response format
        let responseText = this.extractResponseText(response, this.config.provider);

        // Parse JSON from response
        return this.parseJsonResponse(responseText);
    }

    /**
     * Extract text from provider-specific response format
     */
    extractResponseText(response, provider) {
        switch (provider) {
            case 'openai':
            case 'groq':
            case 'gemini':
                return response.choices?.[0]?.message?.content || '';
            case 'anthropic':
                return response.content?.[0]?.text || '';
            default:
                return '';
        }
    }

    /**
     * Parse JSON from LLM response (handles partial/wrapped JSON)
     */
    parseJsonResponse(text) {
        if (!text) {
            throw new Error('Empty response from LLM');
        }

        // Try direct JSON parse
        try {
            return JSON.parse(text);
        } catch (e) {
            // Try to extract JSON from text (handle markdown code blocks)
            const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[1]);
                } catch (e2) {
                    // Continue to next attempt
                }
            }

            // Try to find JSON object
            const objectMatch = text.match(/\{[\s\S]*\}/);
            if (objectMatch) {
                try {
                    return JSON.parse(objectMatch[0]);
                } catch (e3) {
                    // Continue
                }
            }

            throw new Error(`Failed to parse LLM response as JSON: ${text.substring(0, 200)}`);
        }
    }
}

// Create global instance
const aiGateway = new AIGateway();