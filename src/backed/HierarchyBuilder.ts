import { AngularComponentMetadata } from './types/AngularComponentMetadata';
import { HierarchyNode } from './types/HierarchyNode';

/**
 * HierarchyBuilder
 * ----------------
 * Combina relaciones:
 *  - Selectores detectados en plantillas
 *  - imports[] de standalone components
 *  - Rutas detectadas en RouterResolver
 * Además, conecta <router-outlet> con los componentes de rutas.
 */
export class HierarchyBuilder {

    public buildHierarchy(
        allMetadata: AngularComponentMetadata[],
        selectorRelations: Map<string, string[]>,
        importRelations: Map<string, string[]>,
        routeRelations: Map<string, string[]>
    ): HierarchyNode | null {

        if (allMetadata.length === 0) return null;

        console.log("🏗 [HierarchyBuilder] Construyendo árbol...");

        // ---------------------------------------------------------------------
        // 1. Crear lookup id -> metadata
        // ---------------------------------------------------------------------
        const idToMeta = new Map<string, AngularComponentMetadata>();
        for (const meta of allMetadata) {
            idToMeta.set(meta.id, meta);
        }

        // ---------------------------------------------------------------------
        // 2. Combinar TODAS las relaciones en un solo mapa
        //    Map<parentId -> Set<childIds>>
        // ---------------------------------------------------------------------
        const combinedRelations = new Map<string, Set<string>>();

        const addRelations = (map: Map<string, string[]>, label: string) => {
            console.log(`📌 [HierarchyBuilder] Añadiendo relaciones desde ${label}`);
            for (const [parentId, childList] of map.entries()) {

                if (!combinedRelations.has(parentId)) {
                    combinedRelations.set(parentId, new Set());
                }
                const set = combinedRelations.get(parentId)!;

                for (const childId of childList) {
                    set.add(childId);
                    console.log(`   ➕ ${label}: ${parentId} -> ${childId}`);
                }
            }
        };

        addRelations(selectorRelations, "selectors");
        addRelations(importRelations, "imports");
        addRelations(routeRelations, "routes");

        // ---------------------------------------------------------------------
        // 2.5. Conectar router-outlet con las rutas detectadas
        // ---------------------------------------------------------------------
        const routeRootIds = routeRelations.get("root") ?? [];

        console.log("🔍 [HierarchyBuilder] Rutas raíz detectadas:", routeRootIds);

        for (const meta of allMetadata) {
            if (meta.usedSelectors.includes("router-outlet")) {

                console.log(`🔗 [HierarchyBuilder] Conectando router-outlet en ${meta.className}`);

                if (!combinedRelations.has(meta.id)) {
                    combinedRelations.set(meta.id, new Set());
                }

                const set = combinedRelations.get(meta.id)!;

                for (const routeId of routeRootIds) {
                    console.log(`   📎 router-outlet -> ${routeId}`);
                    set.add(routeId);
                }
            }
        }

        // ---------------------------------------------------------------------
        // 3. Determinar raíz del árbol
        // ---------------------------------------------------------------------
        let rootMeta =
            allMetadata.find(m => m.selector === 'app-root') ||
            allMetadata[0];

        console.log("🌳 [HierarchyBuilder] Root:", rootMeta.selector, rootMeta.className);

        // ---------------------------------------------------------------------
        // 4. Función recursiva para construir el árbol (evita ciclos)
        // ---------------------------------------------------------------------
        const buildNode = (meta: AngularComponentMetadata, visited = new Set<string>()): HierarchyNode => {

            if (visited.has(meta.id)) {
                return {
                    id: meta.id,
                    name: meta.className,
                    selector: meta.selector,
                    filePath: meta.filePath,
                    children: []
                };
            }
            visited.add(meta.id);

            const childIds = combinedRelations.get(meta.id) ?? new Set();
            const childrenNodes: HierarchyNode[] = [];

            console.log(`📂 [HierarchyBuilder] Expand ${meta.className}:`, Array.from(childIds));

            for (const childId of childIds) {
                const childMeta = idToMeta.get(childId);
                if (!childMeta) {
                    console.warn("⚠️ [HierarchyBuilder] childId sin metadata:", childId);
                    continue;
                }
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

        // ---------------------------------------------------------------------
        // 5. Construir árbol final
        // ---------------------------------------------------------------------
        const finalTree = buildNode(rootMeta);

        console.log("✅ [HierarchyBuilder] Árbol final construido:", finalTree);

        return finalTree;
    }
}
