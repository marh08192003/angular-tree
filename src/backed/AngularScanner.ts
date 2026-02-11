import * as vscode from 'vscode';

/**
 * AngularScanner
 * ---------------
 * Scans the workspace for TypeScript files
 * and returns only those that contain @Component decorator.
 */
export class AngularScanner {

    public async scanComponents(): Promise<string[]> {

        const pattern = '**/*.ts';
        const files = await vscode.workspace.findFiles(pattern);

        const componentFiles: string[] = [];

        for (const file of files) {
            try {
                const document = await vscode.workspace.openTextDocument(file);
                const text = document.getText();

                // Detect Angular component decorator
                if (text.includes('@Component(')) {
                    componentFiles.push(file.fsPath);

                }
            } catch (err) {

            }
        }



        return componentFiles;
    }
}
