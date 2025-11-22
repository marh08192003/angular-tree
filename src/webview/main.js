// Webview API (envía mensajes al backend)
const vscode = acquireVsCodeApi();

// DOM references
const treeRoot = document.getElementById('tree-root');
const title = document.getElementById('title');

// Show loading indicator initially
treeRoot.innerHTML = `
    <div class="loading">
        <p>Loading Angular hierarchy...</p>
    </div>
`;

// Listen for messages from extension host
window.addEventListener('message', event => {
    const message = event.data;

    if (!message || !message.type) return;

    switch (message.type) {

        case 'treeData':
            renderHierarchy(message.payload);
            break;

        default:
            console.warn('Unknown message received:', message);
            break;
    }
});

/**
 * Renders the tree hierarchy using TreeRenderer.
 */
function renderHierarchy(tree) {
    if (!tree) {
        treeRoot.innerHTML = `<p class="error">No hierarchy data received.</p>`;
        return;
    }

    // Clear container
    treeRoot.innerHTML = '';

    try {
        // TreeRenderer is loaded as a global class
        TreeRenderer.render(tree, treeRoot, vscode);

    } catch (err) {
        console.error('[AngularTree] Render error:', err);
        treeRoot.innerHTML = `
            <p class="error">Error rendering tree. Check console.</p>
        `;
    }
}
