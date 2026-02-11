import * as fs from 'fs';
import { AngularComponentMetadata } from './types/AngularComponentMetadata';

export class TemplateParser {

    public parseTemplate(metadata: AngularComponentMetadata): AngularComponentMetadata {

        const templateText = this.loadTemplateContent(metadata);
        if (!templateText) {
            metadata.usedSelectors = [];
            return metadata;
        }


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


        return metadata;
    }

    private loadTemplateContent(metadata: AngularComponentMetadata): string | null {
        if (metadata.template) {
            return metadata.template;
        }

        if (metadata.templatePath && fs.existsSync(metadata.templatePath)) {
            return fs.readFileSync(metadata.templatePath, 'utf8');
        }

        return null;
    }
}
