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

        console.log("🟦 [HierarchyBuilder] Construyendo árbol...");
        console.log("📌 selectorRelations:", Object.fromEntries(selectorRelations));
        console.log("📌 importRelations:", Object.fromEntries(importRelations));
        console.log("📌 routeRelations (antes FIX):", Object.fromEntries(routeRelations));

        // ------------------------------------------------------------
        // 1. Encontrar el componente raíz (app-root)
        // ------------------------------------------------------------
        const appRoot = allMetadata.find(m => m.selector === "app-root");
        if (!appRoot) {
            console.error("❌ No se encontró componente con selector app-root");
            return null;
        }

        console.log(`🌳 [HierarchyBuilder] Root: ${appRoot.selector} ${appRoot.className}`);

        // ------------------------------------------------------------
        // 2. FIX: Convertir routeRelations["root"] en hijos del app-root
        // ------------------------------------------------------------
        const rootRouteChildren = routeRelations.get("root");

        if (rootRouteChildren && rootRouteChildren.length > 0) {
            console.log("📌 [HierarchyBuilder] Rutas detectadas bajo clave 'root':", rootRouteChildren);

            const existingForAppRoot = routeRelations.get(appRoot.id) ?? [];
            const merged = [...existingForAppRoot, ...rootRouteChildren];

            routeRelations.set(appRoot.id, merged);
            routeRelations.delete("root");

            console.log("📌 [HierarchyBuilder] Rutas reasignadas a AppComponent:", merged);
        } else {
            console.log("ℹ️ [HierarchyBuilder] No existen rutas en 'root'.");
        }

        console.log("📌 routeRelations (después FIX):", Object.fromEntries(routeRelations));

        // ------------------------------------------------------------
        // 3. Combinar todas las relaciones en un solo mapa
        // ------------------------------------------------------------
        const combinedRelations = new Map<string, string[]>();

        const addRelations = (from: Map<string, string[]>, label: string) => {
            console.log(`🔧 Añadiendo relaciones de tipo ${label}`);
            for (const [parentId, childrenIds] of from.entries()) {
                console.log(`   ${parentId} ->`, childrenIds);

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

        console.log("🌳 [HierarchyBuilder] Relaciones combinadas:", Object.fromEntries(combinedRelations));

        // ------------------------------------------------------------
        // 4. Construcción recursiva del árbol final
        // ------------------------------------------------------------
        const buildNode = (id: string): HierarchyNode => {
            const meta = allMetadata.find(m => m.id === id);
            if (!meta) {
                console.warn("⚠️ [HierarchyBuilder] ID sin metadata:", id);
                return {
                    id,
                    name: "Unknown",
                    selector: "unknown",
                    filePath: "",
                    children: []
                };
            }

            const childrenIds = combinedRelations.get(id) ?? [];
            console.log(`📂 [HierarchyBuilder] Expand ${meta.className}:`, childrenIds);

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

        console.log("✅ [HierarchyBuilder] Árbol final construido:", finalTree);
        return finalTree;
    }
}
