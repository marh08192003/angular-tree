import { AngularComponentMetadata } from './types/AngularComponentMetadata';

export class ImportResolver {

    public resolveImports(allMetadata: AngularComponentMetadata[]): Map<string, string[]> {


        const classToId = new Map<string, string>();
        const parentToChildren = new Map<string, string[]>();

        allMetadata.forEach(m => {
            classToId.set(m.className, m.id);

        });

        allMetadata.forEach(parent => {
            const children: string[] = [];

            parent.imports.forEach(imp => {
                const childId = classToId.get(imp);


                if (childId) {
                    children.push(childId);
                }
            });

            parentToChildren.set(parent.id, children);
        });



        return parentToChildren;
    }
}
