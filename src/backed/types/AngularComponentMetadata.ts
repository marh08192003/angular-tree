/**
 * Represents raw metadata extracted from an Angular component.
 * This is the internal structure used by the parser before the
 * hierarchy tree is constructed.
 */
export interface AngularComponentMetadata {
    /** Unique internal identifier (UUID or generated hash). */
    id: string;

    /** The component's TypeScript class name (e.g., UserCardComponent). */
    className: string;

    /** The Angular selector (e.g., 'app-user-card'). */
    selector: string;

    /** Absolute path to the .ts file of the component. */
    filePath: string;

    /** Absolute path to the component's HTML template file, if using templateUrl. */
    templatePath?: string;

    /** Inline template content, if the component uses `template: \`...\``. */
    template?: string;

    /**
     * Standalone component imports extracted from:
     * @Component({ standalone: true, imports: [...] })
     */
    imports: string[];

    /**
     * Selectors found in the HTML template (e.g., ['app-button', 'app-card']).
     * These indicate child components referenced inside the template.
     */
    usedSelectors: string[];
}
