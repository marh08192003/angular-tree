import { AngularComponentMetadata } from './types/AngularComponentMetadata';

export class ChildResolver {

    public resolveChildren(allMetadata: AngularComponentMetadata[]): Map<string, string[]> {



        const selectorToId = new Map<string, string>();
        const parentToChildren = new Map<string, string[]>();

        allMetadata.forEach(meta => {
            selectorToId.set(meta.selector, meta.id);

        });

        allMetadata.forEach(parent => {
            const children: string[] = [];

            parent.usedSelectors.forEach(sel => {
                const childId = selectorToId.get(sel);
                if (childId) {
                    children.push(childId);

                }
            });

            parentToChildren.set(parent.id, children);
        });



        return parentToChildren;
    }
}
