import * as vscode from 'vscode';

import { AngularScanner } from './backed/AngularScanner';
import { AngularParser } from './backed/AngularParser';
import { TemplateParser } from './backed/TemplateParser';
import { ChildResolver } from './backed/ChildResolver';  

export function activate(context: vscode.ExtensionContext) {

	const disposable = vscode.commands.registerCommand('angular-tree.helloWorld', async () => {
		vscode.window.showInformationMessage('Scanning Angular components...');

		const scanner = new AngularScanner();
		const parser = new AngularParser();
		const templateParser = new TemplateParser();
		const childResolver = new ChildResolver(); 

		try {
			// 1. Scan for .component.ts files
			const files = await scanner.scanComponents();
			console.log('[AngularTree] Component files:', files);

			// Store parsed metadata
			const allMetadata = [];

			// 2. Parse each component
			for (const file of files) {
				const meta = parser.parseComponent(file);

				if (!meta) {
					console.warn('[AngularTree] Skipped non-component file:', file);
					continue;
				}

				// 3. Parse inline or external template and extract used selectors
				const metaWithSelectors = templateParser.parseTemplate(meta);

				allMetadata.push(metaWithSelectors);

				console.log('[AngularTree] Parsed metadata:', metaWithSelectors);
			}

			// 4. Resolve parent → child relationships (NEW)
			const relations = childResolver.resolveChildren(allMetadata);
			console.log('[AngularTree] Parent → Child relations:', relations);

			vscode.window.showInformationMessage(
				`Scanning complete. Found ${allMetadata.length} Angular components.`
			);

		} catch (err) {
			console.error('[AngularTree] Error:', err);
			vscode.window.showErrorMessage('Error parsing Angular components. Check console.');
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }
