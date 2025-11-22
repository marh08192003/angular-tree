import { AngularComponentMetadata } from './types/AngularComponentMetadata';
import { HierarchyNode } from './types/HierarchyNode';

/**
 * HierarchyBuilder
 * ----------------
 * Combines parent-child relations from selectors + imports,
 * then builds a clean hierarchical tree of HierarchyNode.
 *
 * This is the final step before sending data to the Webview.
 */
export class HierarchyBuilder {

    /**
     * Build the hierarchy tree.
     *
     * @param allMetadata Full metadata list for all components in the project.
     * @param selectorRelations Map<parentId, childIds[]> from ChildResolver.
     * @param importRelations   Map<parentId, childIds[]> from ImportResolver.
     */
    public buildHierarchy(
        allMetadata: AngularComponentMetadata[],
        selectorRelations: Map<string, string[]>,
        importRelations: Map<string, string[]>
    ): HierarchyNode | null {

        if (allMetadata.length === 0) return null;

        // -----------------------------------------------------------
        // 1. Build lookup: id -> metadata
        // -----------------------------------------------------------
        const idToMeta = new Map<string, AngularComponentMetadata>();
        for (const meta of allMetadata) {
            idToMeta.set(meta.id, meta);
        }

        // -----------------------------------------------------------
        // 2. Combine selectorRelations & importRelations
        // -----------------------------------------------------------
        const combinedRelations = new Map<string, Set<string>>();

        const addRelations = (map: Map<string, string[]>) => {
            for (const [parentId, childList] of map.entries()) {
                if (!combinedRelations.has(parentId)) {
                    combinedRelations.set(parentId, new Set());
                }
                const set = combinedRelations.get(parentId)!;
                for (const childId of childList) {
                    set.add(childId);
                }
            }
        };

        addRelations(selectorRelations);
        addRelations(importRelations);

        // -----------------------------------------------------------
        // 3. Detect root component
        //    Heurística: el que tiene selector 'app-root'
        // -----------------------------------------------------------
        let rootMeta =
            allMetadata.find(m => m.selector === 'app-root') ||
            allMetadata[0]; // fallback, por si acaso

        // -----------------------------------------------------------
        // 4. Build tree recursively (with cycle protection)
        // -----------------------------------------------------------
        const buildNode = (meta: AngularComponentMetadata, visited = new Set<string>()): HierarchyNode => {

            if (visited.has(meta.id)) {
                // Prevent infinite recursion in rare cyclic cases
                return {
                    id: meta.id,
                    name: meta.className,
                    selector: meta.selector,
                    filePath: meta.filePath,
                    children: []
                };
            }
            visited.add(meta.id);

            const childrenIds = combinedRelations.get(meta.id) ?? new Set();
            const childrenNodes: HierarchyNode[] = [];

            for (const childId of childrenIds) {
                const childMeta = idToMeta.get(childId);
                if (!childMeta) continue;
                childrenNodes.push(buildNode(childMeta, new Set(visited)));
            }

            return {
                id: meta.id,
                name: meta.className,
                selector: meta.selector,
                filePath: meta.filePath,
                children: childrenNodes
            };
        };

        // -----------------------------------------------------------
        // 5. Return final root node
        // -----------------------------------------------------------
        return buildNode(rootMeta);
    }
}
