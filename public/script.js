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

    const zoom = d3.zoom().on("zoom", (event) => {
      svgGroup.attr("transform", event.transform);
    });
    svg.call(zoom);

    const svgGroup = svg.append("g");

    const link = svgGroup.selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#aaa");

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
      .attr("width", 40)
      .attr("height", 40)
      .attr("x", -20)
      .attr("y", -20);

    node.append("text")
      .text(d => d.label)
      .attr("x", 0)
      .attr("y", 30)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px");

    node.on("mouseover", (event, d) => {
      tooltip.style("display", "block")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + "px")
        .html(`<strong>${d.label}</strong><br>${d.type}`);
    });

    node.on("mouseout", () => {
      tooltip.style("display", "none");
    });

    simulation.nodes(nodes).on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    simulation.force("link").links(links);
  }

  function dragStart(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnd(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  window.lookupCompany = lookupCompany;
});