const vscode = acquireVsCodeApi();

console.log("[Webview] main.js loaded");

window.addEventListener("DOMContentLoaded", () => {

    const treeRoot = document.getElementById("tree-root");
    const savedState = vscode.getState();

    // 1️⃣ Si hay estado → render inmediato
    if (savedState?.tree) {
        console.log("[Webview] Restoring tree from persisted state");
        treeRoot.innerHTML = "";
        TreeRenderer.render(savedState.tree, treeRoot, vscode);
        return;
    }

    // 2️⃣ Si NO hay estado → loading + pedir data
    console.log("[Webview] No state found → requesting data");

    treeRoot.innerHTML = `
      <div class="loading">
        <p>Loading Angular hierarchy...</p>
      </div>
    `;

    vscode.postMessage({ type: "ready" });
});

// 3️⃣ Escuchar backend
window.addEventListener("message", event => {
    const message = event.data;
    if (!message?.type) return;

    if (message.type === "treeData") {
        console.log("[Webview] Received treeData");

        const treeRoot = document.getElementById("tree-root");

        vscode.setState({ tree: message.payload });

        treeRoot.innerHTML = "";
        TreeRenderer.render(message.payload, treeRoot, vscode);
    }
});
