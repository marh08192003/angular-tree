import { AngularComponentMetadata } from './types/AngularComponentMetadata';

export class ChildResolver {

    public resolveChildren(allMetadata: AngularComponentMetadata[]): Map<string, string[]> {

        console.log("🟦 [ChildResolver] Iniciando análisis de selectores usados...");

        const selectorToId = new Map<string, string>();
        const parentToChildren = new Map<string, string[]>();

        allMetadata.forEach(meta => {
            selectorToId.set(meta.selector, meta.id);
            console.log("📌 selector->id:", meta.selector, "=>", meta.id);
        });

        allMetadata.forEach(parent => {
            const children: string[] = [];

            parent.usedSelectors.forEach(sel => {
                const childId = selectorToId.get(sel);
                if (childId) {
                    children.push(childId);
                    console.log(`🟩 [ChildResolver] ${parent.className} usa <${sel}> => hijo ${childId}`);
                }
            });

            parentToChildren.set(parent.id, children);
        });

        console.log("🌳 [ChildResolver] Relaciones finales:", parentToChildren);

        return parentToChildren;
    }
}
