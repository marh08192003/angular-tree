import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import { AngularComponentMetadata } from "./types/AngularComponentMetadata";

export class RouterResolver {

    async resolveRoutes(
        allMetadata: AngularComponentMetadata[],
        workspaceRoot: string
    ): Promise<Record<string, string[]>> {

        console.log("🔍 [RouterResolver] ====== INICIO RESOLVER RUTAS ======");
        console.log("📁 Workspace root:", workspaceRoot);

        const routes: Record<string, string[]> = {};

        // Mapa rápido filePath → componentId
        const fileToComponentId = new Map<string, string>();
        console.log("📌 [RouterResolver] Mapeando metadata...");

        allMetadata.forEach(m => {
            const normalized = m.filePath.replace(/\\/g, "/").toLowerCase();
            fileToComponentId.set(normalized, m.id);
            console.log("   •", normalized, "→", m.id);
        });

        // Limitar búsqueda
        const appRoot = path.join(workspaceRoot, "src", "app");
        console.log("📂 Directorio objetivo para buscar rutas:", appRoot);

        const routeFiles = await this.findRouteFiles(appRoot);

        console.log("📄 Archivos .routes.ts encontrados:", routeFiles);

        const routeRelations = new Map<string, string[]>();

        for (const file of routeFiles) {
            console.log("➡️ [RouterResolver] === Analizando archivo:", file, "===");
            await this.processRouteFile(file, allMetadata, routeRelations);
        }

        console.log("🧪 [RouterResolver] RELATIONS MAP:", routeRelations);

        for (const [k, v] of routeRelations.entries()) {
            console.log("   •", k, "→", v);
            routes[k] = v;
        }

        console.log("🌳 [RouterResolver] ====== FIN RESOLVER RUTAS ======");
        return routes;
    }

    // -------------------------------------------------------------------------
    // Buscar archivos *.routes.ts
    // -------------------------------------------------------------------------
    private async findRouteFiles(root: string): Promise<string[]> {
        const results: string[] = [];

        console.log("🔎 [RouterResolver] Buscando archivos de rutas desde:", root);

        const walk = async (dir: string) => {
            let items: string[];
            try {
                items = await fs.promises.readdir(dir);
            } catch (err) {
                console.warn("⚠️ No se pudo leer dir:", dir);
                return;
            }

            for (const f of items) {
                const full = path.join(dir, f);
                let stat;
                try {
                    stat = await fs.promises.stat(full);
                } catch {
                    continue;
                }

                if (stat.isDirectory()) {
                    await walk(full);
                } else if (f.includes("routes") && f.endsWith(".ts")) {


                    const normalized = full.replace(/\\/g, "/");
                    console.log("   📌 Encontrado:", normalized);
                    results.push(normalized);
                }
            }
        };

        await walk(root);
        return results;
    }

    // -------------------------------------------------------------------------
    // Procesar archivo de rutas
    // -------------------------------------------------------------------------
    private async processRouteFile(
        filePath: string,
        allMetadata: AngularComponentMetadata[],
        routeRelations: Map<string, string[]>
    ) {

        console.log("📄 [RouterResolver] Leyendo archivo de rutas:", filePath);

        const content = await fs.promises.readFile(filePath, "utf8");
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

        console.log("🔎 Buscando 'export const routes = [...]'");

        const routesArray = this.findRoutesArray(sourceFile);

        if (!routesArray) {
            console.warn("⚠️ No se encontró arreglo de rutas en:", filePath);
            return;
        }

        console.log("🧩 Analizando elementos del arreglo de rutas... count =", routesArray.elements.length);

        const appComponent = allMetadata.find(m => m.selector === 'app-root');
        if (!appComponent) return;

        for (const element of routesArray.elements) {
            this.processRouteNode(
                element,
                path.dirname(filePath),
                allMetadata,
                routeRelations,
                appComponent.id
            );
        }

    }

    // -------------------------------------------------------------------------
    // Encontrar "routes = [...]"
    // -------------------------------------------------------------------------
    private findRoutesArray(sourceFile: ts.SourceFile): ts.ArrayLiteralExpression | null {
        let found: ts.ArrayLiteralExpression | null = null;

        const visit = (node: ts.Node) => {

            if (
                ts.isVariableDeclaration(node) &&
                node.name.getText() === "routes" &&
                node.initializer &&
                ts.isArrayLiteralExpression(node.initializer)
            ) {
                console.log("✔️ Arreglo de rutas encontrado.");
                found = node.initializer;
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return found;
    }

    // -------------------------------------------------------------------------
    // Procesar un nodo de ruta
    // -------------------------------------------------------------------------
    private processRouteNode(
        node: ts.Node,
        routeDir: string,
        allMetadata: AngularComponentMetadata[],
        relations: Map<string, string[]>,
        parentId?: string
    ): string | null {

        if (!ts.isObjectLiteralExpression(node)) return null;

        let componentId: string | null = null;
        let childrenNode: ts.ArrayLiteralExpression | null = null;

        // 1️⃣ Primera pasada: resolver componente
        for (const prop of node.properties) {
            if (!ts.isPropertyAssignment(prop)) continue;

            const key = prop.name.getText();

            if (key === "loadComponent") {
                componentId = this.extractLoadComponent(prop.initializer, routeDir, allMetadata);
            }

            if (key === "component") {
                const componentName = prop.initializer.getText();
                const meta = allMetadata.find(m => m.className === componentName);
                if (meta) componentId = meta.id;
            }

            if (key === "children" && ts.isArrayLiteralExpression(prop.initializer)) {
                childrenNode = prop.initializer;
            }
        }

        // 2️⃣ Enlazar con el padre
        if (componentId && parentId) {
            const children = relations.get(parentId) ?? [];
            if (!children.includes(componentId)) {
                children.push(componentId);
                relations.set(parentId, children);
            }
        }

        // 3️⃣ Procesar hijos DESPUÉS
        if (childrenNode) {
            for (const child of childrenNode.elements) {
                this.processRouteNode(
                    child,
                    routeDir,
                    allMetadata,
                    relations,
                    componentId ?? parentId
                );
            }
        }

        return componentId;
    }


    // -------------------------------------------------------------------------
    // Extraer loadComponent(() => import("..."))
    // -------------------------------------------------------------------------
    private extractLoadComponent(
        node: ts.Expression,
        routeDir: string,
        allMetadata: AngularComponentMetadata[]
    ): string | null {

        console.log("🔎 Analizando loadComponent...");

        if (!ts.isArrowFunction(node)) {
            console.warn("   ⚠️ No es arrow function.");
            return null;
        }

        const body = node.body;

        if (!ts.isCallExpression(body)) {
            console.warn("   ⚠️ Body no es CallExpression.");
            return null;
        }

        if (body.expression.kind !== ts.SyntaxKind.ImportKeyword) {
            console.warn("   ⚠️ Llamada no es import().");
            return null;
        }

        const args = body.arguments;

        if (!args.length) {
            console.warn("   ⚠️ import() sin argumentos.");
            return null;
        }

        const importArg = args[0];

        if (!ts.isStringLiteral(importArg)) {
            console.warn("   ⚠️ import() argumento no es string.");
            return null;
        }

        console.log("   ✔️ import path detectado:", importArg.text);

        const realPath = path.resolve(routeDir, importArg.text + ".ts");
        const normalized = realPath.replace(/\\/g, "/").toLowerCase();

        console.log("   → Path absoluto:", normalized);

        const meta = allMetadata.find(m => m.filePath.replace(/\\/g, "/").toLowerCase() === normalized);


        if (!meta) {
            console.warn("   ❌ No se encontró metadata para:", normalized);
            return null;
        }

        console.log("   ✔️ Componente encontrado:", meta.id);
        return meta.id;
    }
}
