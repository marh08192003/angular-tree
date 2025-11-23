import * as vscode from 'vscode';

/**
 * AngularScanner
 * ---------------
 * Scans the workspace for Angular component files (*.component.ts)
 * and returns their absolute paths.
 *
 * This is the first step of the metadata extraction pipeline.
 */
export class AngularScanner {

    public async scanComponents(): Promise<string[]> {
        console.log("----------------------------------------------------");
        console.log("📡 [Scanner] Buscando *.component.ts ...");

        const pattern = '**/*.component.ts';
        const files = await vscode.workspace.findFiles(pattern);

        console.log(`📁 [Scanner] Archivos encontrados (${files.length}):`);
        files.forEach(f => console.log("   -", f.fsPath));

        const filePaths = files.map(f => f.fsPath);

        console.log("----------------------------------------------------");
        return filePaths;
    }
}