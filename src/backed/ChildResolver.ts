import { AngularComponentMetadata } from './types/AngularComponentMetadata';

/**
 * ChildResolver
 * -------------
 * Determines parent-child relationships between Angular components
 * using their `selector` and their template-detected `usedSelectors`.
 *
 * This module returns a mapping:
 *    parent.id -> child.id[]
 *
 * The HierarchyBuilder will later use this to construct the full tree.
 */
export class ChildResolver {

    /**
     * Given all component metadata, determine the children of each component.
     *
     * @param allMetadata list of AngularComponentMetadata
     * @returns Map<string, string[]>  parentId -> childIds[]
     */
    public resolveChildren(allMetadata: AngularComponentMetadata[]): Map<string, string[]> {
        const selectorToId = new Map<string, string>();
        const parentToChildren = new Map<string, string[]>();

        // Create lookup: selector -> component.id
        for (const meta of allMetadata) {
            selectorToId.set(meta.selector, meta.id);
        }

        // Match usedSelectors[] of each component
        for (const parentMeta of allMetadata) {
            const children: string[] = [];

            for (const usedSelector of parentMeta.usedSelectors) {
                const childId = selectorToId.get(usedSelector);

                if (childId) {
                    children.push(childId);
                }
            }

            parentToChildren.set(parentMeta.id, children);
        }

        return parentToChildren;
    }
}
