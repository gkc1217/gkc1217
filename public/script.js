const svg = d3.select("#ownership-graph");
const input = document.getElementById("company-id");
const button = document.getElementById("fetch-data");

// Sample dummy graph generator — replace with dynamic API call
function generateGraph(companyId) {
  svg.selectAll("*").remove();

  const nodes = [
    { id: "Officer: Jane Smith", type: "officer", x: 100, y: 200, role: "Director" },
    { id: `Company: ${companyId}`, type: "company", x: 400, y: 200, status: "Active" },
    { id: "Subsidiary: LTH UNIVERSITIES LIMITED", type: "company", x: 700, y: 200, status: "Active" }
  ];

  const links = [
    { source: nodes[0], target: nodes[1], ownership: "100%" },
    { source: nodes[1], target: nodes[2], ownership: "75%" }
  ];

  svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 12)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#333");

  svg.selectAll("line.link")
    .data(links)
    .enter()
    .append("line")
    .attr("class", "link")
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y)
    .attr("stroke", "#888")
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#arrowhead)");

  svg.selectAll("text.link-label")
    .data(links)
    .enter()
    .append("text")
    .attr("x", d => (d.source.x + d.target.x) / 2)
    .attr("y", d => (d.source.y + d.target.y) / 2 - 10)
    .attr("text-anchor", "middle")
    .attr("class", "link-label")
    .text(d => d.ownership);

  svg.selectAll("circle.officer")
    .data(nodes.filter(n => n.type === "officer"))
    .enter()
    .append("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 30)
    .attr("class", "officer");

  svg.selectAll("rect.company")
    .data(nodes.filter(n => n.type === "company"))
    .enter()
    .append("rect")
    .attr("x", d => d.x - 60)
    .attr("y", d => d.y - 30)
    .attr("width", 120)
    .attr("height", 60)
    .attr("rx", 10)
    .attr("class", d => `company ${d.status.toLowerCase()}`);

  svg.selectAll("text.label")
    .data(nodes)
    .enter()
    .append("text")
    .attr("x", d => d.x)
    .attr("y", d => d.y + 45)
    .attr("text-anchor", "middle")
    .attr("class", "node-label")
    .text(d => d.id.split(": ")[1]);

  svg.selectAll("text.status")
    .data(nodes)
    .enter()
    .append("text")
    .attr("x", d => d.x)
    .attr("y", d => d.y + 60)
    .attr("text-anchor", "middle")
    .attr("class", "status-label")
    .text(d => d.role || d.status);
}

// Hook up button click
button.addEventListener("click", () => {
  const companyId = input.value.trim();
  if (companyId) generateGraph(companyId);
});