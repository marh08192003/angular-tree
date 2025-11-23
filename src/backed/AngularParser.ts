import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { AngularComponentMetadata } from './types/AngularComponentMetadata';

export class AngularParser {

    /**
     * Parses a given Angular component file (.component.ts)
     * and extracts metadata from the @Component decorator.
     */
    public parseComponent(filePath: string): AngularComponentMetadata | null {

        console.log("----------------------------------------------------");
        console.log("🔍 [Parser] Analizando archivo:", filePath);

        const sourceText = fs.readFileSync(filePath, 'utf8');
        const sourceFile = ts.createSourceFile(
            filePath,
            sourceText,
            ts.ScriptTarget.Latest,
            true
        );

        let className: string | undefined = undefined;
        let selector: string | undefined = undefined;
        let template: string | undefined = undefined;
        let templateUrl: string | undefined = undefined;
        let imports: string[] = [];

        // Walk full AST
        const visit = (node: ts.Node) => {

            // Extract class name
            if (ts.isClassDeclaration(node) && node.name) {
                className = node.name.text;
                console.log("📌 [Parser] className:", className);
            }

            // Look for @Component decorator
            if (ts.isDecorator(node) && ts.isCallExpression(node.expression)) {
                const callExpr = node.expression;

                if (callExpr.expression.getText() === 'Component') {
                    console.log("🎯 [Parser] Encontrado @Component en", filePath);
                    const arg = callExpr.arguments[0];
                    if (ts.isObjectLiteralExpression(arg)) {
                        for (const prop of arg.properties) {

                            const propName = prop.name?.getText() ?? "";

                            console.log("   🔧 [Parser] Propiedad:", propName);


                            // selector: 'app-test'
                            if (
                                ts.isPropertyAssignment(prop) &&
                                prop.name.getText() === 'selector'
                            ) {
                                selector = this.extractString(prop.initializer);
                                console.log("   ✔ selector:", selector);
                            }

                            // templateUrl: './x.html'
                            if (
                                ts.isPropertyAssignment(prop) &&
                                prop.name.getText() === 'templateUrl'
                            ) {
                                templateUrl = this.extractString(prop.initializer);
                                console.log("   ✔ templateUrl:", templateUrl);
                            }

                            // template: `...`
                            if (
                                ts.isPropertyAssignment(prop) &&
                                prop.name.getText() === 'template' &&
                                ts.isStringLiteralLike(prop.initializer)
                            ) {
                                template = prop.initializer.getText();
                                template = template.slice(1, -1); // remove quotes/backticks
                                console.log("   ✔ template inline (recortado):", template.substring(0, 60));
                            }

                            // imports: [CompA, CompB]
                            if (
                                ts.isPropertyAssignment(prop) &&
                                prop.name.getText() === 'imports' &&
                                ts.isArrayLiteralExpression(prop.initializer)
                            ) {
                                imports = prop.initializer.elements.map(el => el.getText());
                                console.log("   ✔ imports:", imports);
                            }
                        }
                    }
                }
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);

        // If no component decorator found → not an Angular component
        if (!selector || !className) {
            console.warn("❌ [Parser] No es componente Angular:", filePath);
            return null;
        }

        // Generate local templatePath
        let templatePath: string | undefined = undefined;
        if (templateUrl) {
            templatePath = path.resolve(path.dirname(filePath), templateUrl);
            console.log("📁 [Parser] templatePath absolut:", templatePath);
        }

        const metadata: AngularComponentMetadata = {
            id: this.generateId(filePath),
            className,
            selector,
            filePath,
            templatePath,
            template,
            imports,
            usedSelectors: [] // filled later by TemplateParser
        };
        console.log("✅ [Parser] Metadata final:", metadata);
        console.log("----------------------------------------------------");

        return metadata;
    }

    /**
     * Extracts a string literal value or returns null.
     */
    private extractString(node: ts.Expression): string | undefined {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            return node.text;
        }
        return undefined;
    }


    /**
     * Creates a stable id from the file path.
     */
    private generateId(filePath: string): string {
        return Buffer.from(filePath).toString('base64');
    }
}
