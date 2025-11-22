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

    /**
     * Scans the workspace for Angular components.
     * @returns Promise<string[]> List of absolute file paths
     */
    public async scanComponents(): Promise<string[]> {
        const pattern = '**/*.component.ts';

        // Search all matching files in the workspace
        const files = await vscode.workspace.findFiles(pattern);

        // Convert Uri → absolute file path
        const filePaths = files.map(f => f.fsPath);

        return filePaths;
    }
}
