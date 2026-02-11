import { AngularComponentMetadata } from "./types/AngularComponentMetadata";
import { HierarchyNode } from "./types/HierarchyNode";

export class HierarchyBuilder {

    /**
     * Construye el árbol jerárquico final combinando:
     *  - relaciones por selectores (child components usados en templates)
     *  - relaciones por imports (standalone imports)
     *  - relaciones por rutas (Angular router)
     */
    buildHierarchy(
        allMetadata: AngularComponentMetadata[],
        selectorRelations: Map<string, string[]>,
        importRelations: Map<string, string[]>,
        routeRelations: Map<string, string[]>
    ): HierarchyNode | null {


        // ------------------------------------------------------------
        // 1. Encontrar el componente raíz (app-root)
        // ------------------------------------------------------------
        const appRoot = allMetadata.find(m => m.selector === "app-root");
        if (!appRoot) {

            return null;
        }



        // ------------------------------------------------------------
        // 2. FIX: Convertir routeRelations["root"] en hijos del app-root
        // ------------------------------------------------------------
        const rootRouteChildren = routeRelations.get("root");

        if (rootRouteChildren && rootRouteChildren.length > 0) {


            const existingForAppRoot = routeRelations.get(appRoot.id) ?? [];
            const merged = [...existingForAppRoot, ...rootRouteChildren];

            routeRelations.set(appRoot.id, merged);
            routeRelations.delete("root");


        } else {

        }



        // ------------------------------------------------------------
        // 3. Combinar todas las relaciones en un solo mapa
        // ------------------------------------------------------------
        const combinedRelations = new Map<string, string[]>();

        const addRelations = (from: Map<string, string[]>, label: string) => {

            for (const [parentId, childrenIds] of from.entries()) {


                const current = combinedRelations.get(parentId) ?? [];
                const merged = [...current];

                for (const c of childrenIds) {
                    if (!merged.includes(c)) merged.push(c);
                }

                combinedRelations.set(parentId, merged);

            }
        };

        addRelations(selectorRelations, "selectores");
        addRelations(importRelations, "imports");
        addRelations(routeRelations, "rutas");



        // ------------------------------------------------------------
        // 4. Construcción recursiva del árbol final
        // ------------------------------------------------------------
        const buildNode = (id: string): HierarchyNode => {
            const meta = allMetadata.find(m => m.id === id);
            if (!meta) {

                return {
                    id,
                    name: "Unknown",
                    selector: "unknown",
                    filePath: "",
                    children: []
                };
            }

            const childrenIds = combinedRelations.get(id) ?? [];


            const children = childrenIds.map(childId => buildNode(childId));

            return {
                id: meta.id,
                name: meta.className,
                selector: meta.selector,
                filePath: meta.filePath,
                children
            };
        };

        // ------------------------------------------------------------
        // 5. Devolver árbol con AppComponent como raíz
        // ------------------------------------------------------------
        const finalTree = buildNode(appRoot.id);


        return finalTree;
    }
}
