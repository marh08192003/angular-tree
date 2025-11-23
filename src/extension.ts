import * as vscode from 'vscode';

import { AngularScanner } from './backed/AngularScanner';
import { AngularParser } from './backed/AngularParser';
import { TemplateParser } from './backed/TemplateParser';
import { ChildResolver } from './backed/ChildResolver';
import { ImportResolver } from './backed/ImportResolver';
import { RouterResolver } from './backed/RouterResolver';
import { HierarchyBuilder } from './backed/HierarchyBuilder';

export function activate(context: vscode.ExtensionContext) {

	/**
	 * ---------------------------------------------------------
	 * Command 1: Hello World (debug-only)
	 * ---------------------------------------------------------
	 */
	const helloCmd = vscode.commands.registerCommand('angular-tree.helloWorld', async () => {
		vscode.window.showInformationMessage('Scanning Angular components...');

		const scanner = new AngularScanner();
		const parser = new AngularParser();
		const templateParser = new TemplateParser();
		const childResolver = new ChildResolver();
		const importResolver = new ImportResolver();
		const routerResolver = new RouterResolver();
		const hierarchyBuilder = new HierarchyBuilder();

		try {
			const files = await scanner.scanComponents();
			console.log('[AngularTree] Component files:', files);

			const allMetadata = [];

			for (const file of files) {
				const meta = parser.parseComponent(file);
				if (!meta) continue;

				const metaWithSelectors = templateParser.parseTemplate(meta);
				allMetadata.push(metaWithSelectors);
			}

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

			console.log('[AngularTree] Final hierarchy tree:', tree);

			vscode.window.showInformationMessage('Hierarchy built successfully.');

		} catch (err) {
			console.error('[AngularTree] Error:', err);
			vscode.window.showErrorMessage('Error parsing Angular components.');
		}
	});

	context.subscriptions.push(helloCmd);


	/**
	 * ---------------------------------------------------------
	 * Command 2: Show Hierarchy Webview
	 * ---------------------------------------------------------
	 */
	const showHierarchyCmd = vscode.commands.registerCommand('angular-tree.showHierarchy', async () => {
		try {
			// Backend pipeline
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
				if (!meta) continue;

				const metaWithSelectors = templateParser.parseTemplate(meta);
				allMetadata.push(metaWithSelectors);
			}

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
			// Create Webview Panel
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
			// Load HTML
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
			// Send tree data to Webview
			// -------------------------------------------------
			panel.webview.postMessage({
				type: 'treeData',
				payload: tree
			});

			// -------------------------------------------------
			// Webview → Backend handlers
			// -------------------------------------------------
			panel.webview.onDidReceiveMessage(async msg => {
				if (msg.type === 'openFile') {
					const uri = vscode.Uri.file(msg.payload);
					const doc = await vscode.workspace.openTextDocument(uri);
					await vscode.window.showTextDocument(doc, { preview: false });
				}
			});

		} catch (err) {
			console.error('[AngularTree] Webview error:', err);
			vscode.window.showErrorMessage('Error while generating Angular hierarchy tree.');
		}
	});

	context.subscriptions.push(showHierarchyCmd);
}

export function deactivate() { }
