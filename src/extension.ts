import * as vscode from 'vscode';

import { AngularScanner } from './backed/AngularScanner';
import { AngularParser } from './backed/AngularParser';
import { TemplateParser } from './backed/TemplateParser';
import { ChildResolver } from './backed/ChildResolver';
import { ImportResolver } from './backed/ImportResolver';
import { HierarchyBuilder } from './backed/HierarchyBuilder';

export function activate(context: vscode.ExtensionContext) {

	/**
	 * ---------------------------------------------------------
	 * Command 1 (existing): Hello World
	 * ---------------------------------------------------------
	 */
	const helloCmd = vscode.commands.registerCommand('angular-tree.helloWorld', async () => {
		vscode.window.showInformationMessage('Scanning Angular components...');

		const scanner = new AngularScanner();
		const parser = new AngularParser();
		const templateParser = new TemplateParser();
		const childResolver = new ChildResolver();
		const importResolver = new ImportResolver();
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

			const tree = hierarchyBuilder.buildHierarchy(
				allMetadata,
				selectorRelations,
				importRelations
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
	 * Command 2 (NEW): Show Hierarchy Webview
	 * ---------------------------------------------------------
	 */
	const showHierarchyCmd = vscode.commands.registerCommand('angular-tree.showHierarchy', async () => {
		try {
			// -------------------------------------------------
			// 1. Run backend pipeline to build the tree
			// -------------------------------------------------
			const scanner = new AngularScanner();
			const parser = new AngularParser();
			const templateParser = new TemplateParser();
			const childResolver = new ChildResolver();
			const importResolver = new ImportResolver();
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

			const tree = hierarchyBuilder.buildHierarchy(
				allMetadata,
				selectorRelations,
				importRelations
			);

			if (!tree) {
				vscode.window.showWarningMessage('No Angular components detected.');
				return;
			}

			// -------------------------------------------------
			// 2. Create Webview Panel
			// -------------------------------------------------
			const panel = vscode.window.createWebviewPanel(
				'angularHierarchyView',                // internal ID
				'Angular Hierarchy Tree',             // title shown to user
				vscode.ViewColumn.One,                // where to show the panel
				{
					enableScripts: true,               // allow JS
					localResourceRoots: [
						vscode.Uri.joinPath(context.extensionUri, 'dist'),
						vscode.Uri.joinPath(context.extensionUri, 'src', 'webview')
					]
				}
			);

			// -------------------------------------------------
			// 3. Load index.html from /src/webview/
			// -------------------------------------------------
			const htmlUri = vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'index.html');

			let html = (await vscode.workspace.fs.readFile(htmlUri)).toString();

			// Fix resource loading (scripts, css)
			const webviewUri = panel.webview.asWebviewUri(
				vscode.Uri.joinPath(context.extensionUri, 'src', 'webview')
			);

			html = html
				.replace(/{{webviewRoot}}/g, webviewUri.toString());

			panel.webview.html = html;

			// -------------------------------------------------
			// 4. Send tree data to Webview
			// -------------------------------------------------
			panel.webview.postMessage({
				type: 'treeData',
				payload: tree
			});

			// -------------------------------------------------
			// 5. Listen to messages FROM Webview (openFile, etc.)
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
