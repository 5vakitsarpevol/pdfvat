/**
 * Main Application Entry Point
 * Initializes all modules and sets up the complete PDF VAT extraction application
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI Manager (handles all user interactions)
    uiManager.init();

    // Log initialization
    console.log('PDF VAT Extractor initialized successfully');
    console.log('Supported providers:', Object.keys(aiGateway.providerConfigs));
});

/**
 * Global error handler for uncaught errors
 */
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    uiManager.showError(
        'An unexpected error occurred',
        event.error?.stack || event.error?.message || String(event.error)
    );
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    uiManager.showError(
        'An unexpected error occurred',
        event.reason?.stack || event.reason?.message || String(event.reason)
    );
});