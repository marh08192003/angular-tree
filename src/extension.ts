import * as vscode from 'vscode';

import { AngularScanner } from './backed/AngularScanner';
import { AngularParser } from './backed/AngularParser';
import { TemplateParser } from './backed/TemplateParser';
import { ChildResolver } from './backed/ChildResolver';
import { ImportResolver } from './backed/ImportResolver';
import { RouterResolver } from './backed/RouterResolver';
import { HierarchyBuilder } from './backed/HierarchyBuilder';

export function activate(context: vscode.ExtensionContext) {

	console.log("🔌 [AngularTree] Extension activada.");

	/**
	 * ===========================================================
	 * COMMAND 1: angular-tree.helloWorld
	 * Debug: Ejecuta el pipeline y solo imprime el árbol en consola
	 * ===========================================================
	 */
	const helloCmd = vscode.commands.registerCommand('angular-tree.helloWorld', async () => {

		console.log("----------------------------------------------------");
		console.log("🚀 [Hello] Iniciando pipeline de análisis Angular...");
		console.log("----------------------------------------------------");

		const scanner = new AngularScanner();
		const parser = new AngularParser();
		const templateParser = new TemplateParser();
		const childResolver = new ChildResolver();
		const importResolver = new ImportResolver();
		const routerResolver = new RouterResolver();
		const hierarchyBuilder = new HierarchyBuilder();

		try {
			console.log("📡 [Pipeline] Escaneando componentes...");

			const files = await scanner.scanComponents();
			console.log("📂 [Pipeline] Archivos encontrados:", files.length);

			const allMetadata = [];

			for (const file of files) {
				console.log("🔍 [Pipeline] Analizando archivo:", file);

				const meta = parser.parseComponent(file);
				if (!meta) {
					console.warn("⚠️ [Pipeline] No es componente:", file);
					continue;
				}

				const enrichedMeta = templateParser.parseTemplate(meta);
				allMetadata.push(enrichedMeta);
			}

			console.log("📊 [Pipeline] Total metadata generada:", allMetadata.length);

			const selectorRelations = childResolver.resolveChildren(allMetadata);
			const importRelations = importResolver.resolveImports(allMetadata);

			const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? "";
			const routeRelationsObj = routerResolver.resolveRoutes(allMetadata, workspaceRoot);

			// Convertimos Record<string, string[]> a Map<string,string[]>
			const routeRelations = new Map<string, string[]>(Object.entries(routeRelationsObj));

			const tree = hierarchyBuilder.buildHierarchy(
				allMetadata,
				selectorRelations,
				importRelations,
				routeRelations
			);

			console.log("🌳 [Pipeline] Árbol final:", tree);

			vscode.window.showInformationMessage('Hierarchy built successfully.');

		} catch (err) {
			console.error("❌ [Hello] Error en pipeline:", err);
			vscode.window.showErrorMessage('Error parsing Angular components.');
		}
	});

	context.subscriptions.push(helloCmd);


	/**
	 * ===========================================================
	 * COMMAND 2: angular-tree.showHierarchy
	 * Genera la WebView con el árbol renderizado con D3.js
	 * ===========================================================
	 */
	const showHierarchyCmd = vscode.commands.registerCommand('angular-tree.showHierarchy', async () => {

		console.log("====================================================");
		console.log("📡 [WebView] Generando Angular Hierarchy Tree...");
		console.log("====================================================");

		try {
			// -------------------------------------------------
			// BACKEND PIPELINE
			// -------------------------------------------------
			const scanner = new AngularScanner();
			const parser = new AngularParser();
			const templateParser = new TemplateParser();
			const childResolver = new ChildResolver();
			const importResolver = new ImportResolver();
			const routerResolver = new RouterResolver();
			const hierarchyBuilder = new HierarchyBuilder();

			const files = await scanner.scanComponents();
			console.log("📁 [WebView] Componentes identificados:", files.length);

			const allMetadata = [];

			for (const file of files) {
				const meta = parser.parseComponent(file);
				if (!meta) continue;
				allMetadata.push(templateParser.parseTemplate(meta));
			}

			console.log("📊 [WebView] Metadata total:", allMetadata.length);

			const selectorRelations = childResolver.resolveChildren(allMetadata);
			const importRelations = importResolver.resolveImports(allMetadata);

			const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? "";
			const routeRelationsObj = routerResolver.resolveRoutes(allMetadata, workspaceRoot);

			const routeRelations = new Map<string, string[]>(Object.entries(routeRelationsObj));

			const tree = hierarchyBuilder.buildHierarchy(
				allMetadata,
				selectorRelations,
				importRelations,
				routeRelations
			);

			if (!tree) {
				vscode.window.showWarningMessage('No Angular components detected.');
				return;
			}

			// -------------------------------------------------
			// WEBVIEW PANEL
			// -------------------------------------------------
			const panel = vscode.window.createWebviewPanel(
				'angularHierarchyView',
				'Angular Hierarchy Tree',
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					localResourceRoots: [
						vscode.Uri.joinPath(context.extensionUri, 'src', 'webview')
					]
				}
			);

			// -------------------------------------------------
			// LOAD HTML TEMPLATE
			// -------------------------------------------------
			const htmlUri = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'index.html');
			let html = (await vscode.workspace.fs.readFile(htmlUri)).toString();

			const webviewRoot = vscode.Uri.joinPath(context.extensionUri, "src", "webview");

			const stylesCss = panel.webview.asWebviewUri(
				vscode.Uri.joinPath(webviewRoot, "styles.css")
			);
			const d3Js = panel.webview.asWebviewUri(
				vscode.Uri.joinPath(webviewRoot, "d3.min.js")
			);
			const treeRenderer = panel.webview.asWebviewUri(
				vscode.Uri.joinPath(webviewRoot, "TreeRenderer.js")
			);
			const mainJs = panel.webview.asWebviewUri(
				vscode.Uri.joinPath(webviewRoot, "main.js")
			);

			html = html
				.replace("{{stylesCss}}", stylesCss.toString())
				.replace("{{d3Js}}", d3Js.toString())
				.replace("{{treeRenderer}}", treeRenderer.toString())
				.replace("{{mainJs}}", mainJs.toString());

			panel.webview.html = html;

			// -------------------------------------------------
			// SEND TREE DATA TO WEBVIEW
			// -------------------------------------------------
			let isWebviewReady = false;

			// 1. Escuchar por mensajes del webview
			panel.webview.onDidReceiveMessage(async msg => {
				console.log("[Extension] Message received from Webview:", msg);

				if (msg.type === 'ready') {
					console.log("[Extension] Webview is READY. Sending tree data...");
					isWebviewReady = true;

					panel.webview.postMessage({
						type: "treeData",
						payload: tree
					});
				}

				if (msg.type === 'openFile') {
					const uri = vscode.Uri.file(msg.payload);
					const doc = await vscode.workspace.openTextDocument(uri);
					await vscode.window.showTextDocument(doc, { preview: false });
				}
			});

			// 2. Retry in case ready arrives late
			setTimeout(() => {
				if (!isWebviewReady) {
					console.warn("[Extension] Webview did not send 'ready' in time. Sending tree anyway.");
					panel.webview.postMessage({
						type: "treeData",
						payload: tree
					});
				}
			}, 800);


			console.log("📤 [WebView] Árbol enviado al front.");

			// -------------------------------------------------
			// HANDLE MESSAGES FROM WEBVIEW
			// -------------------------------------------------
			panel.webview.onDidReceiveMessage(async msg => {
				if (msg.type === 'openFile') {
					const uri = vscode.Uri.file(msg.payload);
					const doc = await vscode.workspace.openTextDocument(uri);
					await vscode.window.showTextDocument(doc, { preview: false });
				}
			});

		} catch (err) {
			console.error("❌ [WebView] Error:", err);
			vscode.window.showErrorMessage('Error while generating Angular hierarchy tree.');
		}

	});

	context.subscriptions.push(showHierarchyCmd);
}

export function deactivate() {
	console.log("🛑 [AngularTree] Extension desactivada.");
}
