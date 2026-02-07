import * as vscode from 'vscode';

import { AngularScanner } from './backed/AngularScanner';
import { AngularParser } from './backed/AngularParser';
import { TemplateParser } from './backed/TemplateParser';
import { ChildResolver } from './backed/ChildResolver';
import { ImportResolver } from './backed/ImportResolver';
import { RouterResolver } from './backed/RouterResolver';
import { HierarchyBuilder } from './backed/HierarchyBuilder';

let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {

	console.log("🔌 [AngularTree] Extension activada.");

	const showHierarchyCmd = vscode.commands.registerCommand(
		'angular-tree.showHierarchy',
		async () => {

			console.log("📡 Generando Angular Hierarchy Tree...");

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

			const allMetadata = [];
			for (const file of files) {
				const meta = parser.parseComponent(file);
				if (meta) {
					allMetadata.push(templateParser.parseTemplate(meta));
				}
			}

			const selectorRelations = childResolver.resolveChildren(allMetadata);
			const importRelations = importResolver.resolveImports(allMetadata);

			const workspaceRoot =
				vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? "";

			const routeRelationsObj =
				await routerResolver.resolveRoutes(allMetadata, workspaceRoot);

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
				vscode.window.showWarningMessage('No Angular components detected.');
				return;
			}

			// -------------------------------------------------
			// REUTILIZAR PANEL SI EXISTE
			// -------------------------------------------------
			if (panel) {
				panel.reveal(vscode.ViewColumn.One);
				panel.webview.postMessage({
					type: "treeData",
					payload: tree
				});
				return;
			}

			// -------------------------------------------------
			// CREAR PANEL
			// -------------------------------------------------
			panel = vscode.window.createWebviewPanel(
				'angularHierarchyView',
				'Angular Hierarchy Tree',
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					retainContextWhenHidden: true,
					localResourceRoots: [
						vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')
					]
				}
			);

			panel.onDidDispose(() => {
				panel = undefined;
			});

			// -------------------------------------------------
			// HTML
			// -------------------------------------------------
			const webviewRoot = vscode.Uri.joinPath(
				context.extensionUri,
				'dist',
				'webview'
			);

			let html = (
				await vscode.workspace.fs.readFile(
					vscode.Uri.joinPath(webviewRoot, 'index.html')
				)
			).toString();

			html = html
				.replace("{{stylesCss}}",
					panel.webview.asWebviewUri(vscode.Uri.joinPath(webviewRoot, 'styles.css')).toString()
				)
				.replace("{{d3Js}}",
					panel.webview.asWebviewUri(vscode.Uri.joinPath(webviewRoot, 'd3.min.js')).toString()
				)
				.replace("{{treeRenderer}}",
					panel.webview.asWebviewUri(vscode.Uri.joinPath(webviewRoot, 'TreeRenderer.js')).toString()
				)
				.replace("{{mainJs}}",
					panel.webview.asWebviewUri(vscode.Uri.joinPath(webviewRoot, 'main.js')).toString()
				);

			panel.webview.html = html;

			// -------------------------------------------------
			// MENSAJES
			// -------------------------------------------------
			panel.webview.onDidReceiveMessage(async msg => {

				if (msg.type === 'openFile') {
					const uri = vscode.Uri.file(msg.payload);
					const doc = await vscode.workspace.openTextDocument(uri);
					await vscode.window.showTextDocument(doc, { preview: false });
				}

			});

			// -------------------------------------------------
			// ENVÍO DIRECTO (SIN READY)
			// -------------------------------------------------
			panel.webview.postMessage({
				type: "treeData",
				payload: tree
			});

		}
	);

	context.subscriptions.push(showHierarchyCmd);
}

export function deactivate() {
	console.log("🛑 [AngularTree] Extension desactivada.");
}
