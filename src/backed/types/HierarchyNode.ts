/**
 * Represents the final hierarchical structure of the Angular application.
 * This tree is what gets sent to the Webview for rendering.
 */
export interface HierarchyNode {
    /** Unique internal identifier corresponding to AngularComponentMetadata.id */
    id: string;

    /** Component class name (e.g., DashboardComponent). */
    name: string;

    /** Angular selector (e.g., 'app-dashboard'). */
    selector: string;

    /** Absolute path to the component's .ts file. */
    filePath: string;

    /** Child components in the hierarchy. */
    children: HierarchyNode[];
}
