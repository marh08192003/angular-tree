import * as vscode from 'vscode';

import { AngularScanner } from './backed/AngularScanner';
import { AngularParser } from './backed/AngularParser';
import { TemplateParser } from './backed/TemplateParser';
import { ChildResolver } from './backed/ChildResolver';
import { ImportResolver } from './backed/ImportResolver';

export function activate(context: vscode.ExtensionContext) {

	const disposable = vscode.commands.registerCommand('angular-tree.helloWorld', async () => {
		vscode.window.showInformationMessage('Scanning Angular components...');

		const scanner = new AngularScanner();
		const parser = new AngularParser();
		const templateParser = new TemplateParser();
		const childResolver = new ChildResolver();
		const importResolver = new ImportResolver();

		try {
			// ----------------------------------------
			// 1. Scan for .component.ts files
			// ----------------------------------------
			const files = await scanner.scanComponents();
			console.log('[AngularTree] Component files:', files);

			// ----------------------------------------
			// 2. Parse each component
			// ----------------------------------------
			const allMetadata = [];

			for (const file of files) {
				const meta = parser.parseComponent(file);

				if (!meta) {
					console.warn('[AngularTree] Skipped non-component file:', file);
					continue;
				}

				// ----------------------------------------
				// 3. Handle template parsing (inline or external)
				// ----------------------------------------
				const metaWithSelectors = templateParser.parseTemplate(meta);

				allMetadata.push(metaWithSelectors);

				console.log('[AngularTree] Parsed metadata:', metaWithSelectors);
			}

			// ----------------------------------------
			// 4. Resolve children by template selectors
			// ----------------------------------------
			const selectorRelations = childResolver.resolveChildren(allMetadata);
			console.log('[AngularTree] Relations from selectors:', selectorRelations);

			// ----------------------------------------
			// 5. Resolve children by standalone imports
			// ----------------------------------------
			const importRelations = importResolver.resolveImports(allMetadata);
			console.log('[AngularTree] Relations from imports:', importRelations);

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
