//
// TreeRenderer.js
// Renders Angular hierarchy tree using D3.js with zoom, pan and collapsible nodes.
//

class TreeRenderer {

    static render(tree, container, vscode) {

        // Clean previous content
        container.innerHTML = "";

        // Prepare SVG root
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;

        // Create SVG element with zoom/pan support
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

        // Convert HierarchyNode into D3 hierarchy structure
        const root = d3.hierarchy(tree);

        // Set collapsible state
        root.x0 = height / 2;
        root.y0 = 0;

        // Collapse all nodes initially except root
        root.children?.forEach(collapse);

        function collapse(node) {
            if (node.children) {
                node._children = node.children;
                node._children.forEach(collapse);
                node.children = null;
            }
        }

        const treeLayout = d3.tree().nodeSize([40, 200]);

        update(root);

        // ----------------------------------------
        // UPDATE FUNCTION (MAIN D3 RENDER PIPELINE)
        // ----------------------------------------

        function update(source) {

            // Compute new layout
            treeLayout(root);
            let nodes = root.descendants();
            let links = root.links();

            // Normalize depth spacing
            nodes.forEach(d => d.y = d.depth * 220);

            // -----------------------------
            // NODES
            // -----------------------------
            const node = g.selectAll("g.node")
                .data(nodes, d => d.id || (d.id = Math.random()));

            // Enter nodes
            const nodeEnter = node.enter()
                .append("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${source.y0}, ${source.x0})`)
                .on("click", (event, d) => onNodeClick(event, d));

            // Circle
            nodeEnter.append("circle")
                .attr("r", 8)
                .attr("class", "node-circle");

            // Label
            nodeEnter.append("text")
                .attr("dy", "0.32em")
                .attr("x", 14)
                .text(d => d.data.name)
                .attr("class", "node-label");

            // Update position
            const nodeUpdate = nodeEnter.merge(node);

            nodeUpdate.transition()
                .duration(250)
                .attr("transform", d => `translate(${d.y}, ${d.x})`);

            // Exit nodes
            const nodeExit = node.exit().transition()
                .duration(200)
                .attr("transform", d => `translate(${source.y}, ${source.x})`)
                .remove();

            // -----------------------------
            // LINKS
            // -----------------------------
            const link = g.selectAll("path.link")
                .data(links, d => d.target.id);

            const linkEnter = link.enter()
                .insert("path", "g")
                .attr("class", "link")
                .attr("d", d => diagonal(source, source));

            const linkUpdate = linkEnter.merge(link);

            linkUpdate.transition()
                .duration(250)
                .attr("d", d => diagonal(d.source, d.target));

            link.exit().transition()
                .duration(200)
                .attr("d", d => diagonal(source, source))
                .remove();

            // Store old position for transitions
            nodes.forEach(d => {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        }

        // ----------------------------------------
        // NODE CLICK HANDLER
        // ----------------------------------------
        function onNodeClick(event, d) {

            if (d.children) {
                // collapse
                d._children = d.children;
                d.children = null;
            } else {
                // expand
                d.children = d._children;
                d._children = null;
            }

            update(d);

            // notify VSCode
            vscode.postMessage({
                type: "openFile",
                payload: d.data.filePath
            });
        }

        // ----------------------------------------
        // LINK SHAPE
        // ----------------------------------------
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

// expose globally
window.TreeRenderer = TreeRenderer;
