// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';

import { AngularScanner } from './backed/AngularScanner';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "angular-tree" is now active!');

	// Register command
	const disposable = vscode.commands.registerCommand('angular-tree.helloWorld', async () => {
		// Display message
		vscode.window.showInformationMessage('Hello World from Angular Tree!');

		// --- NEW: Run AngularScanner ---
		try {
			const scanner = new AngularScanner();
			const componentFiles = await scanner.scanComponents();

			console.log('[AngularTree] Found components:', componentFiles);

			vscode.window.showInformationMessage(
				`Found ${componentFiles.length} Angular components`
			);

		} catch (err) {
			console.error('[AngularTree] Error scanning components', err);
			vscode.window.showErrorMessage('Error scanning Angular components. Check console.');
		}
		// ---------------------------------
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
