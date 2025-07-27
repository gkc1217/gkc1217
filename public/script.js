document.addEventListener("DOMContentLoaded", () => {
  const svg = d3.select("#networkGraph");
  const tooltip = d3.select("#tooltip");
  const loader = document.getElementById("loader");
  const retryContainer = document.getElementById("retryContainer");
  const statusMessage = document.getElementById("statusMessage");

  const width = +svg.attr("width");
  const height = +svg.attr("height");

  const simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(150))
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width / 2, height / 2));

  function lookupCompany() {
    const companyNumber = document.getElementById("companyInput").value.trim();
    const depth = document.getElementById("depthSelect").value;
    if (!companyNumber) return;

    loader.style.display = "block";
    statusMessage.textContent = "";
    retryContainer.style.display = "none";
    svg.selectAll("*").remove();

    fetch(`/api/network?companyNumber=${companyNumber}&depth=${depth}`)
      .then(response => response.json())
      .then(data => {
        loader.style.display = "none";
        drawGraph(data);
      })
      .catch(err => {
        loader.style.display = "none";
        statusMessage.textContent = "❌ Failed to load data. Check company number or try again.";
        retryContainer.style.display = "block";
        console.error(err);
      });
  }

  function drawGraph(data) {
    const links = data.links;
    const nodes = data.nodes;

    const svgGroup = svg.append("g"); // ✅ Declare before using it anywhere

    const zoom = d3.zoom().on("zoom", (event) => {
      svgGroup.attr("transform", event.transform);
    });
    svg.call(zoom);

    const svgDefs = svg.append("defs");
    const shadow = svgDefs.append("filter").attr("id", "dropShadow").attr("height", "130%");
    shadow.append("feDropShadow")
      .attr("dx", "2").attr("dy", "2").attr("stdDeviation", "3").attr("flood-color", "#ccc");

    const link = svgGroup.selectAll(".link")
      .data(links)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 2);

    const node = svgGroup.selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(d3.drag()
        .on("start", dragStart)
        .on("drag", dragged)
        .on("end", dragEnd));

    node.append("use")
      .attr("href", d => d.type === "company" ? "#companyIcon" : "#personIcon")
      .attr("width", 40).attr("height", 40)
      .attr("x", -20).attr("y", -20);

    node.append("text")
      .text(d => d.label)
      .attr("x", 0).attr("y", 30)
      .attr("text-anchor", "middle").attr("font-size", "12px");

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

    node.on("mouseout", () => {
      tooltip.style("display", "none");
    });

    simulation.nodes(nodes).on("tick", () => {
      link.attr("d", d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    simulation.force("link").links(links);
  }

  function dragStart(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x; d.fy = event.y;
  }

  function dragEnd(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null; d.fy = null;
  }

  // ✅ Expose lookupCompany globally for HTML button
  window.lookupCompany = lookupCompany;
});