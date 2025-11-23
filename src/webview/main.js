// Webview API (envía mensajes al backend)
const vscode = acquireVsCodeApi();

console.log("[Webview] main.js loaded");

// DOM references
const treeRoot = document.getElementById('tree-root');
const title = document.getElementById('title');

// Show loading indicator initially
treeRoot.innerHTML = `
    <div class="loading">
        <p>Loading Angular hierarchy...</p>
    </div>
`;

console.log("[Webview] Showing loading state");

// -----------------------------
// Notify backend when ready
// -----------------------------
window.addEventListener('DOMContentLoaded', () => {
    console.log("[Webview] DOMContentLoaded → sending READY to backend");
    vscode.postMessage({ type: 'ready' });
});

// -----------------------------
// Listen for messages from backend
// -----------------------------
window.addEventListener('message', event => {
    const message = event.data;

    console.log("[Webview] Message received:", message);

    if (!message || !message.type) {
        console.warn("[Webview] Message without type");
        return;
    }

    switch (message.type) {

        case 'treeData':
            console.log("[Webview] Received treeData");
            renderHierarchy(message.payload);
            break;

        default:
            console.warn("[Webview] Unknown message received:", message);
            break;
    }
});

/**
 * Render the Angular hierarchy using TreeRenderer
 */
function renderHierarchy(tree) {
    console.log("[Webview] renderHierarchy() called", tree);

    if (!tree) {
        treeRoot.innerHTML = `<p class="error">No hierarchy data received.</p>`;
        return;
    }

    // Clear container
    treeRoot.innerHTML = '';
    console.log("[Webview] container cleared, calling TreeRenderer");

    try {
        // TreeRenderer is loaded as a global class
        TreeRenderer.render(tree, treeRoot, vscode);

        console.log("[Webview] TreeRenderer.render() completed");

    } catch (err) {
        console.error('[Webview] Render error:', err);
        treeRoot.innerHTML = `
            <p class="error">Error rendering tree. Check console.</p>
        `;
    }
}
