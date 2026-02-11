import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import { AngularComponentMetadata } from "./types/AngularComponentMetadata";

export class RouterResolver {

    async resolveRoutes(
        allMetadata: AngularComponentMetadata[],
        workspaceRoot: string
    ): Promise<Record<string, string[]>> {

        const routes: Record<string, string[]> = {};

        // Mapa rápido filePath → componentId
        const fileToComponentId = new Map<string, string>();

        allMetadata.forEach(m => {
            const normalized = m.filePath.replace(/\\/g, "/").toLowerCase();
            fileToComponentId.set(normalized, m.id);
        });

        // Limitar búsqueda
        const appRoot = path.join(workspaceRoot, "src", "app");

        const routeFiles = await this.findRouteFiles(appRoot);


        const routeRelations = new Map<string, string[]>();

        for (const file of routeFiles) {
            await this.processRouteFile(file, allMetadata, routeRelations);
        }


        for (const [k, v] of routeRelations.entries()) {
            routes[k] = v;
        }
        return routes;
    }

    // -------------------------------------------------------------------------
    // Buscar archivos *.routes.ts
    // -------------------------------------------------------------------------
    private async findRouteFiles(root: string): Promise<string[]> {
        const results: string[] = [];


        const walk = async (dir: string) => {
            let items: string[];
            try {
                items = await fs.promises.readdir(dir);
            } catch (err) {
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
                } else if (f.endsWith(".ts")) {

                    const normalized = full.replace(/\\/g, "/");
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


        const content = await fs.promises.readFile(filePath, "utf8");
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);


        const routesArray = this.findRoutesArray(sourceFile);

        if (!routesArray) {
            return;
        }


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

                if (ts.isIdentifier(prop.initializer)) {

                    const componentName = prop.initializer.text;

                    const meta = allMetadata.find(m =>
                        m.className === componentName
                    );

                    if (meta) {
                        componentId = meta.id;
                    }
                }
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


        if (!ts.isArrowFunction(node)) {
            return null;
        }

        const body = node.body;

        if (!ts.isCallExpression(body)) {
            return null;
        }

        if (body.expression.kind !== ts.SyntaxKind.ImportKeyword) {
            return null;
        }

        const args = body.arguments;

        if (!args.length) {
            return null;
        }

        const importArg = args[0];

        if (!ts.isStringLiteral(importArg)) {
            return null;
        }


        const realPath = path.resolve(routeDir, importArg.text + ".ts");
        const normalized = realPath.replace(/\\/g, "/").toLowerCase();


        const meta = allMetadata.find(m => m.filePath.replace(/\\/g, "/").toLowerCase() === normalized);


        if (!meta) {
            return null;
        }

        return meta.id;
    }
}
