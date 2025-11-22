import { AngularComponentMetadata } from './types/AngularComponentMetadata';

/**
 * ImportResolver
 * ---------------
 * Adds parent → child relationships based on Angular standalone imports.
 *
 * @Component({
 *   standalone: true,
 *   imports: [ChildAComponent, ChildBComponent]
 * })
 *
 * NOTE:
 * - imports[] contains *class names* of components
 * - selector-based children are resolved by ChildResolver
 * - this module only resolves standalone imports
 */
export class ImportResolver {

    /**
     * Builds a mapping:
     *   parentId → childIds[]
     * using standalone imports declared in each component.
     */
    public resolveImports(allMetadata: AngularComponentMetadata[]): Map<string, string[]> {
        const classToId = new Map<string, string>();
        const parentToChildren = new Map<string, string[]>();

        // Build dictionary: className -> componentId
        for (const meta of allMetadata) {
            classToId.set(meta.className, meta.id);
        }

        // Resolve imports for each component
        for (const parentMeta of allMetadata) {
            const childIds: string[] = [];

            for (const imported of parentMeta.imports) {
                const childId = classToId.get(imported);

                if (childId) {
                    childIds.push(childId);
                }
            }

            parentToChildren.set(parentMeta.id, childIds);
        }

        return parentToChildren;
    }
}
