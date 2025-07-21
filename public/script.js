function lookupCompany() {
  const companyNumber = document.getElementById("companyInput").value.trim();
  if (!companyNumber) return;

  fetch(`/api/network?companyNumber=${companyNumber}`)

    .then(res => res.json())
    .then(data => drawNetwork(data.nodes, data.links))
    .catch(err => console.error("Error loading network:", err));
}

function drawNetwork(nodes, links) {
  const svg = d3.select("#networkGraph");
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 800;
  const height = +svg.attr("height") || 600;

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(100))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = svg.append("g")
    .selectAll("line")
    .data(links)
    .enter().append("line")
    .attr("stroke", "#aaa");

  const node = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr("r", 10)
    .attr("fill", d => d.type === "company" ? "#0078D4" : "#FFD700")
    .call(d3.drag()
      .on("start", dragStart)
      .on("drag", dragMove)
      .on("end", dragEnd));

  const label = svg.append("g")
    .selectAll("text")
    .data(nodes)
    .enter().append("text")
    .text(d => d.label)
    .attr("font-size", "11px")
    .attr("fill", "#333");

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x).attr("cy", d => d.y);

    label
      .attr("x", d => d.x + 12).attr("y", d => d.y + 4);
  });

  function dragStart(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragMove(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragEnd(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }
}