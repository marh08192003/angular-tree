import * as vscode from "vscode";
import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import { AngularComponentMetadata } from "./types/AngularComponentMetadata";

export class RouterResolver {

    /**
     * Analiza todas las rutas Angular en el workspace y devuelve un Map:
     *
     *    Map<string, string[]> donde:
     *       - "root" → rutas top-level
     *       - "<componentId>" → rutas hijas
     */
    resolveRoutes(allMetadata: AngularComponentMetadata[], workspaceRoot: string) {
        console.log("🔍 [RouterResolver] Resolviendo rutas...");
        console.log("📁 Workspace root:", workspaceRoot);

        const routes: Record<string, string[]> = {};

        const fileToComponentId = new Map<string, string>();
        allMetadata.forEach(c => {
            const normalized = path.normalize(c.filePath).replace(/\\/g, "/");
            fileToComponentId.set(normalized, c.id);
            console.log("📌 [RouterResolver] Mapeado componente:", {
                file: normalized,
                id: c.id,
                name: c.className
            });
        });

        const routeFiles = this.findRouteFiles(workspaceRoot);
        console.log("📄 [RouterResolver] Archivos de rutas encontrados:", routeFiles);

        for (const file of routeFiles) {
            console.log("➡️ [RouterResolver] Analizando archivo de rutas:", file);

            const content = fs.readFileSync(file, "utf8");
            const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);

            ts.forEachChild(source, node => {
                if (!ts.isVariableStatement(node)) return;

                for (const decl of node.declarationList.declarations) {
                    if (!decl.initializer) continue;
                    if (!ts.isArrayLiteralExpression(decl.initializer)) continue;

                    console.log("🧩 [RouterResolver] Analizando arreglo de rutas ...");

                    decl.initializer.elements.forEach(elem => {
                        if (!ts.isObjectLiteralExpression(elem)) return;

                        elem.properties.forEach(p => {

                            if (
                                ts.isPropertyAssignment(p) &&
                                p.name.getText() === "loadComponent"
                            ) {
                                console.log("🚦 [RouterResolver] loadComponent detectado");

                                const init = p.initializer;

                                if (
                                    ts.isArrowFunction(init) &&
                                    ts.isCallExpression(init.body)
                                ) {
                                    const body = init.body;

                                    if (body.expression.getText() === "import") {
                                        const importArg = body.arguments[0];

                                        if (ts.isStringLiteral(importArg)) {
                                            const importPath = importArg.text;

                                            console.log("📥 [RouterResolver] Ruta detectada en import():", importPath);

                                            const abs = path
                                                .resolve(path.dirname(file), importPath + ".ts")
                                                .replace(/\\/g, "/");

                                            console.log("📌 [RouterResolver] Archivo real del componente:", abs);

                                            const compId = fileToComponentId.get(abs);

                                            if (compId) {
                                                console.log("✅ [RouterResolver] Componente encontrado:", compId);

                                                if (!routes["root"]) {
                                                    routes["root"] = [];
                                                }

                                                routes["root"].push(compId);
                                            } else {
                                                console.warn("❌ [RouterResolver] Sin metadata para:", abs);
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    });
                }
            });
        }

        console.log("🌳 [RouterResolver] Relaciones finales:", routes);

        return routes;
    }

    // -------------------------------------------------------------------------
    // Buscar archivos *.routes.ts en todo el workspace
    // -------------------------------------------------------------------------
    private findRouteFiles(root: string): string[] {
        const results: string[] = [];

        console.log("🔎 [RouterResolver] Buscando archivos *.routes.ts en:", root);

        const walk = (dir: string) => {
            let items: string[];

            try {
                items = fs.readdirSync(dir);
            } catch {
                return;
            }

            for (const f of items) {
                const full = path.join(dir, f);

                try {
                    const stat = fs.statSync(full);

                    if (stat.isDirectory()) {
                        walk(full);
                    } else if (f.endsWith(".routes.ts")) {
                        const normalized = full.replace(/\\/g, "/");
                        console.log("📌 [RouterResolver] Archivo de rutas encontrado:", normalized);
                        results.push(normalized);
                    }
                } catch { }
            }
        };

        walk(root);
        return results;
    }



    // -------------------------------------------------------------------------
    // PROCESAR ARCHIVO DE RUTAS
    // -------------------------------------------------------------------------
    private async processRouteFile(
        filePath: string,
        workspaceRoot: string,
        allMetadata: AngularComponentMetadata[],
        routeRelations: Map<string, string[]>
    ) {
        console.log("➡️ [RouterResolver] Analizando archivo de rutas:", filePath);

        const fileContent = fs.readFileSync(filePath, "utf8");
        const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true);

        // Buscar export const routes: Routes = [...]
        const routesArray = this.findRoutesArray(sourceFile);

        if (!routesArray) {
            console.warn("⚠️ [RouterResolver] No se encontró arreglo de rutas en:", filePath);
            return;
        }

        console.log("🧩 [RouterResolver] Analizando arreglo de rutas ...");

        const topLevelRoutes: string[] = [];

        for (const routeNode of routesArray.elements ?? []) {
            const childId = this.processRouteNode(
                routeNode,
                path.dirname(filePath),
                workspaceRoot,
                allMetadata,
                routeRelations
            );

            if (childId) {
                topLevelRoutes.push(childId);
            }
        }

        if (topLevelRoutes.length > 0) {
            routeRelations.set("root", topLevelRoutes);
        }
    }

    // -------------------------------------------------------------------------
    // ENCONTRAR "export const routes = [...]"
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
                found = node.initializer;
            }
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return found;
    }

    // -------------------------------------------------------------------------
    // PROCESAR UN NODO DE RUTA
    // -------------------------------------------------------------------------
    private processRouteNode(
        node: ts.Node,
        routeFileDir: string,
        workspaceRoot: string,
        allMetadata: AngularComponentMetadata[],
        routeRelations: Map<string, string[]>
    ): string | null {

        if (!ts.isObjectLiteralExpression(node)) return null;

        let componentId: string | null = null;
        let childrenIds: string[] = [];

        for (const prop of node.properties) {
            if (!ts.isPropertyAssignment(prop)) continue;

            const key = prop.name.getText();

            // ---------------------------------------------
            // Caso 1: loadComponent: () => import("...")
            // ---------------------------------------------
            if (key === "loadComponent") {
                const loaded = this.extractLoadComponent(prop.initializer, routeFileDir, workspaceRoot, allMetadata);

                if (loaded) {
                    console.log("📌 [RouterResolver] Componente cargado:", loaded);
                    componentId = loaded;
                }
            }

            // ---------------------------------------------
            // Caso 2: children: [ ... ]
            // ---------------------------------------------
            if (key === "children" && ts.isArrayLiteralExpression(prop.initializer)) {
                console.log("🔎 [RouterResolver] Detectado children[]");

                for (const childRoute of prop.initializer.elements) {
                    const childResolved = this.processRouteNode(
                        childRoute,
                        routeFileDir,
                        workspaceRoot,
                        allMetadata,
                        routeRelations
                    );

                    if (childResolved) {
                        childrenIds.push(childResolved);
                    }
                }
            }
        }

        // ------------------------------------------------------
        // Guardar relaciones padre → hijos
        // ------------------------------------------------------
        if (componentId) {
            if (childrenIds.length > 0) {
                routeRelations.set(componentId, childrenIds);
            }
            return componentId;
        }

        return null;
    }

    // -------------------------------------------------------------------------
    // EXTRAER ID DE loadComponent()
    // -------------------------------------------------------------------------
    private extractLoadComponent(
        node: ts.Expression,
        routeFileDir: string,
        workspaceRoot: string,
        allMetadata: AngularComponentMetadata[]
    ): string | null {

        // Debe ser una arrow function: () => import('...')
        if (!ts.isArrowFunction(node)) return null;

        const body = node.body;

        // Body debe ser un CallExpression
        if (!ts.isCallExpression(body)) return null;

        const callExpr = body;

        // Verificar que sea import(...)
        // TS AST: callExpr.expression.kind === SyntaxKind.ImportKeyword
        if (callExpr.expression.kind !== ts.SyntaxKind.ImportKeyword) {
            console.log("❌ [RouterResolver] No es un import() válido.");
            return null;
        }

        // Extraer argumentos del import()
        const args = callExpr.arguments;
        if (!args || args.length === 0) {
            console.warn("⚠️ [RouterResolver] import() sin argumentos.");
            return null;
        }

        const importArg = args[0];

        if (!ts.isStringLiteral(importArg)) {
            console.warn("⚠️ [RouterResolver] Argumento import() no es string.");
            return null;
        }

        const relativeImportPath = importArg.text;
        console.log("📥 [RouterResolver] Ruta en import():", relativeImportPath);

        // Resolver archivo real
        const resolvedPath = path.resolve(routeFileDir, relativeImportPath + ".ts");

        console.log("📌 [RouterResolver] Archivo real del componente:", resolvedPath);

        const meta = allMetadata.find(m => m.filePath === resolvedPath);

        if (!meta) {
            console.warn("⚠️ [RouterResolver] No se encontró metadata:", resolvedPath);
            return null;
        }

        console.log("✅ [RouterResolver] Componente encontrado:", meta.id);

        return meta.id;
    }

}
