const svgDefs = svg.append("defs");

// Drop shadow filter for nodes
svgDefs.append("filter")
  .attr("id", "dropShadow")
  .attr("height", "130%")
  .append("feDropShadow")
  .attr("dx", "2")
  .attr("dy", "2")
  .attr("stdDeviation", "3")
  .attr("flood-color", "#ccc");

// Curved link paths
const link = svgGroup.selectAll(".link")
  .data(links)
  .enter()
  .append("path")
  .attr("class", "link")
  .attr("fill", "none")
  .attr("stroke", "#ccc")
  .attr("stroke-width", 2);

simulation.on("tick", () => {
  link.attr("d", d => {
    const dx = d.target.x - d.source.x;
    const dy = d.target.y - d.source.y;
    const dr = Math.sqrt(dx * dx + dy * dy);
    return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
  });

  node.attr("transform", d => `translate(${d.x},${d.y})`);
});

// Updated tooltip styling
node.on("mouseover", (event, d) => {
  tooltip.style("display", "block")
    .style("left", event.pageX + 15 + "px")
    .style("top", event.pageY + "px")
    .html(`
      <div><strong>${d.label}</strong></div>
      <div>${d.type}</div>
      ${d.role ? `<div><em>Role:</em> ${d.role}</div>` : ""}
    `);
});