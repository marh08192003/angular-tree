import ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { AngularComponentMetadata } from "./types/AngularComponentMetadata";

export class RouterResolver {

    resolveRoutes(components: AngularComponentMetadata[], workspaceRoot: string) {
        console.log("🔍 [RouterResolver] Resolviendo rutas...");
        console.log("📁 Workspace root:", workspaceRoot);

        const routes: Record<string, string[]> = {};

        // --------- Map filePath => component.id ---------
        const fileToComponentId = new Map<string, string>();
        components.forEach(c => {
            const normalized = path.normalize(c.filePath).replace(/\\/g, "/");
            fileToComponentId.set(normalized, c.id);
            console.log("📌 [RouterResolver] Mapeado componente:", {
                file: normalized,
                id: c.id,
                name: c.className
            });
        });

        // --------- Buscar archivos *.routes.ts ---------
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
                            // -------------------------------------------------
                            // Detectar loadComponent: () => import("xxx")
                            // -------------------------------------------------
                            if (
                                ts.isPropertyAssignment(p) &&
                                p.name.getText() === "loadComponent"
                            ) {
                                console.log("🚦 [RouterResolver] loadComponent detectado");

                                const init = p.initializer;

                                if (
                                    ts.isArrowFunction(init) &&
                                    ts.isCallExpression(init.body) &&
                                    init.body.expression.getText() === "import"
                                ) {
                                    const importArg = init.body.arguments[0];

                                    if (ts.isStringLiteral(importArg)) {
                                        const importPath = importArg.text;
                                        console.log("📥 [RouterResolver] Ruta detectada en import():", importPath);

                                        // Construir path absoluto al .ts
                                        const abs = path
                                            .resolve(path.dirname(file), importPath + ".ts")
                                            .replace(/\\/g, "/");

                                        console.log("📌 [RouterResolver] Archivo real del componente:", abs);

                                        const compId = fileToComponentId.get(abs);

                                        if (compId) {
                                            console.log("✅ [RouterResolver] Componente encontrado en metadata:", compId);

                                            if (!routes["root"]) {
                                                routes["root"] = [];
                                            }

                                            routes["root"].push(compId);
                                        } else {
                                            console.warn("❌ [RouterResolver] ¡No se encontró metadata para:", abs);
                                        }
                                    }
                                }
                            }
                        });
                    });
                }
            });
        }

        console.log("🌳 [RouterResolver] Relaciones finales de rutas:", routes);

        return routes;
    }

    // Buscar **recursivamente** todos los *.routes.ts
    findRouteFiles(root: string) {
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
                        console.log("📌 [RouterResolver] Archivo de rutas encontrado:", full);
                        results.push(full.replace(/\\/g, "/"));
                    }
                } catch { }
            }
        };

        walk(root);
        return results;
    }
}
