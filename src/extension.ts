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

	const showHierarchyCmd = vscode.commands.registerCommand(
		'angular-tree.showHierarchy',
		async () => {

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

				const workspaceRoot =
					vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? "";

				// ❗❗❗ FIX CRÍTICO → usar await
				const routeRelationsObj =
					await routerResolver.resolveRoutes(allMetadata, workspaceRoot);

				console.log("📦 Relaciones de rutas:", routeRelationsObj);

				const routeRelations = new Map<string, string[]>(
					Object.entries(routeRelationsObj)
				);

				const tree = hierarchyBuilder.buildHierarchy(
					allMetadata,
					selectorRelations,
					importRelations,
					routeRelations
				);

				if (!tree) {
					vscode.window.showWarningMessage(
						'No Angular components detected.'
					);
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
							vscode.Uri.joinPath(
								context.extensionUri,
								'src',
								'webview'
							)
						]
					}
				);

				// -------------------------------------------------
				// CARGAR HTML
				// -------------------------------------------------
				const htmlUri = vscode.Uri.joinPath(
					context.extensionUri,
					'src',
					'webview',
					'index.html'
				);
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
				// WEBVIEW READY HANDLER
				// -------------------------------------------------
				let treeSent = false;

				panel.webview.onDidReceiveMessage(async msg => {
					console.log("[Extension] Mensaje desde Webview:", msg);

					if (msg.type === 'ready' && !treeSent) {
						console.log("[Extension] Webview READY → enviando árbol");
						treeSent = true;

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

				// Fallback si el webview no envía ready
				setTimeout(() => {
					if (!treeSent) {
						console.warn("[Extension] Webview no envió READY → enviando árbol por fallback");
						panel.webview.postMessage({
							type: "treeData",
							payload: tree
						});
					}
				}, 800);

				console.log("📤 [WebView] Árbol listo para envío.");

			} catch (err) {
				console.error("❌ [WebView] Error:", err);
				vscode.window.showErrorMessage(
					'Error while generating Angular hierarchy tree.'
				);
			}
		}
	);

	context.subscriptions.push(showHierarchyCmd);
}

export function deactivate() {
	console.log("🛑 [AngularTree] Extension desactivada.");
}
