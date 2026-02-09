//
// TreeRenderer.js
// Renders Angular hierarchy tree using D3.js with zoom, pan and collapsible nodes.
//

class TreeRenderer {

    static render(tree, container, vscode) {

        container.innerHTML = "";

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;

        const svg = d3.select(container)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .call(
                d3.zoom().on("zoom", (event) => {
                    g.attr("transform", event.transform);
                })
            );

        const g = svg.append("g");

        const root = d3.hierarchy(tree);

        root.x0 = height / 2;
        root.y0 = 0;

        // 🔹 Colapsar todo menos root
        if (root.children) {
            root.children.forEach(collapse);
        }

        function collapse(node) {
            if (node.children) {
                node._children = node.children;
                node._children.forEach(collapse);
                node.children = null;
            }
        }

        const treeLayout = d3.tree().nodeSize([40, 220]);

        update(root);

        function update(source) {

            treeLayout(root);
            const nodes = root.descendants();
            const links = root.links();

            nodes.forEach(d => d.y = d.depth * 220);

            // -----------------------------
            // NODES
            // -----------------------------
            const node = g.selectAll("g.node")
                .data(nodes, d => d.id || (d.id = crypto.randomUUID()));

            const nodeEnter = node.enter()
                .append("g")
                .attr("class", "node")
                .attr("transform", `translate(${source.y0}, ${source.x0})`)
                .on("click", (event, d) => toggleNode(event, d))
                .on("dblclick", (event, d) => openFile(event, d));

            nodeEnter.append("circle")
                .attr("r", 8)
                .attr("class", d =>
                    d._children ? "node-circle collapsed" : "node-circle"
                );

            nodeEnter.append("text")
                .attr("dy", "0.32em")
                .attr("x", 14)
                .text(d => d.data.name)
                .attr("class", "node-label");

            const nodeUpdate = nodeEnter.merge(node);

            nodeUpdate.transition()
                .duration(250)
                .attr("transform", d => `translate(${d.y}, ${d.x})`);

            nodeUpdate.select("circle")
                .attr("class", d =>
                    d._children ? "node-circle collapsed" : "node-circle"
                );

            node.exit().transition()
                .duration(200)
                .attr("transform", `translate(${source.y}, ${source.x})`)
                .remove();

            // -----------------------------
            // LINKS
            // -----------------------------
            const link = g.selectAll("path.link")
                .data(links, d => d.target.id);

            link.enter()
                .insert("path", "g")
                .attr("class", "link")
                .attr("d", () => diagonal(source, source))
                .merge(link)
                .transition()
                .duration(250)
                .attr("d", d => diagonal(d.source, d.target));

            link.exit().transition()
                .duration(200)
                .attr("d", () => diagonal(source, source))
                .remove();

            nodes.forEach(d => {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }

        // -----------------------------
        // HANDLERS
        // -----------------------------
        function toggleNode(event, d) {
            event.stopPropagation();

            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else {
                d.children = d._children;
                d._children = null;
            }

            update(d);
        }

        function openFile(event, d) {
            event.stopPropagation();

            vscode.postMessage({
                type: "openFile",
                payload: d.data.filePath
            });
        }

        function diagonal(s, t) {
            return `
                M ${s.y},${s.x}
                C ${(s.y + t.y) / 2},${s.x}
                  ${(s.y + t.y) / 2},${t.x}
                  ${t.y},${t.x}
            `;
        }
    }
}

window.TreeRenderer = TreeRenderer;
