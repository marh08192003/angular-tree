import * as fs from 'fs';
import { AngularComponentMetadata } from './types/AngularComponentMetadata';

/**
 * TemplateParser
 * ---------------
 * Reads Angular component templates (inline or from templateUrl)
 * and extracts child selectors used in the HTML.
 */
export class TemplateParser {

    /**
     * Extracts child component selectors used inside the component template.
     * Fills metadata.usedSelectors[] and returns the updated object.
     */
    public parseTemplate(metadata: AngularComponentMetadata): AngularComponentMetadata {
        const templateText = this.loadTemplateContent(metadata);
        if (!templateText) {
            metadata.usedSelectors = [];
            return metadata;
        }

        // Detect tags like <app-card>, <my-button>, <shared-list>, etc.
        const selectorRegex = /<([a-zA-Z0-9-]+)(\s|>)/g;

        const foundSelectors = new Set<string>();

        let match: RegExpExecArray | null;
        while ((match = selectorRegex.exec(templateText)) !== null) {
            const tag = match[1];

            // Only keep selectors that look like Angular components:
            // Must contain at least one hyphen (Angular style)
            if (tag.includes('-')) {
                foundSelectors.add(tag);
            }
        }

        metadata.usedSelectors = Array.from(foundSelectors);

        return metadata;
    }

    /**
     * Loads the template HTML from templateUrl or inline template.
     */
    private loadTemplateContent(metadata: AngularComponentMetadata): string | null {
        // Inline template takes priority
        if (metadata.template) {
            return metadata.template;
        }

        // templateUrl
        if (metadata.templatePath) {
            if (fs.existsSync(metadata.templatePath)) {
                return fs.readFileSync(metadata.templatePath, 'utf8');
            }
        }

        return null;
    }
}
