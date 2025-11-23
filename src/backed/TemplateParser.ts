import * as fs from 'fs';
import { AngularComponentMetadata } from './types/AngularComponentMetadata';

export class TemplateParser {

    public parseTemplate(metadata: AngularComponentMetadata): AngularComponentMetadata {
        console.log("🟦 [TemplateParser] Analizando template de:", metadata.className);

        const templateText = this.loadTemplateContent(metadata);
        if (!templateText) {
            console.log("🔴 [TemplateParser] SIN template:", metadata.className);
            metadata.usedSelectors = [];
            return metadata;
        }

        console.log("🟩 [TemplateParser] Template cargado, longitud:", templateText.length);

        const selectorRegex = /<([a-zA-Z0-9-]+)(\s|>)/g;
        const foundSelectors = new Set<string>();

        let match: RegExpExecArray | null;
        while ((match = selectorRegex.exec(templateText)) !== null) {
            const tag = match[1];
            if (tag.includes('-')) {
                foundSelectors.add(tag);
            }
        }

        metadata.usedSelectors = Array.from(foundSelectors);

        console.log("📌 [TemplateParser] Selectores encontrados:", metadata.usedSelectors);

        return metadata;
    }

    private loadTemplateContent(metadata: AngularComponentMetadata): string | null {
        if (metadata.template) {
            console.log("🔵 [TemplateParser] Template inline en:", metadata.className);
            return metadata.template;
        }

        if (metadata.templatePath && fs.existsSync(metadata.templatePath)) {
            console.log("📄 [TemplateParser] Cargando templateUrl:", metadata.templatePath);
            return fs.readFileSync(metadata.templatePath, 'utf8');
        }

        console.warn("⚠️ [TemplateParser] No existe templateUrl:", metadata.templatePath);
        return null;
    }
}
