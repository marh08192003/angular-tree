import * as vscode from 'vscode';
import { AngularScanner } from './backed/AngularScanner';
import { AngularParser } from './backed/AngularParser';

export function activate(context: vscode.ExtensionContext) {

	const disposable = vscode.commands.registerCommand('angular-tree.helloWorld', async () => {
		vscode.window.showInformationMessage('Scanning Angular components...');

		const scanner = new AngularScanner();
		const parser = new AngularParser();

		const files = await scanner.scanComponents();

		console.log('[AngularTree] Component files:', files);

		// (Opcional) probar el parser ahora mismo:
		for (const file of files) {
			const meta = parser.parseComponent(file);
			console.log('Parsed metadata:', meta);
		}

		vscode.window.showInformationMessage(`Found ${files.length} Angular components`);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }
