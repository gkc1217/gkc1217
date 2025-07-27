document.addEventListener("DOMContentLoaded", () => {
  const svg = d3.select("#networkGraph");
  const tooltip = d3.select("#tooltip");
  const loader = document.getElementById("loader");
  const retryContainer = document.getElementById("retryContainer");
  const statusMessage = document.getElementById("statusMessage");

  function lookupCompany() {
    const companyNumber = document.getElementById("companyInput").value.trim();
    if (!companyNumber) return;

    loader.style.display = "block";
    statusMessage.textContent = "";
    retryContainer.style.display = "none";
    svg.selectAll("*").remove();

    fetch(`/api/network?companyNumber=${companyNumber}`)
      .then(res => res.json())
      .then(data => {
        loader.style.display = "none";
        drawStructuredGraph(data);
      })
      .catch(err => {
        loader.style.display = "none";
        statusMessage.textContent = "❌ Failed to load data.";
        retryContainer.style.display = "block";
        console.error(err);
      });
  }

  function drawStructuredGraph(data) {
    const nodeGroups = {
      owner: { x: 150, yStart: 100 },
      shareholder: { x: 350, yStart: 100 },
      company: { x: 550, yStart: 100 },
      contact: { x: 750, yStart: 100 }
    };

    const svgGroup = svg.append("g");

    const nodeMap = {};
    const verticalSpacing = 100;

    data.nodes.forEach((node, i) => {
      const group = nodeGroups[node.role] || nodeGroups.company;
      const y = group.yStart + verticalSpacing * i;
      node.x = group.x;
      node.y = y;
      nodeMap[node.id] = node;
    });

    const link = svgGroup.selectAll(".link")
      .data(data.links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("x1", d => nodeMap[d.source].x)
      .attr("y1", d => nodeMap[d.source].y)
      .attr("x2", d => nodeMap[d.target].x)
      .attr("y2", d => nodeMap[d.target].y);

    svgGroup.selectAll(".link-label")
      .data(data.links)
      .enter()
      .append("text")
      .attr("class", "link-label")
      .attr("x", d => (nodeMap[d.source].x + nodeMap[d.target].x) / 2)
      .attr("y", d => (nodeMap[d.source].y + nodeMap[d.target].y) / 2 - 5)
      .text(d => `${d.percentage || ''}%`);

    const node = svgGroup.selectAll(".node")
      .data(data.nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    node.append(d => {
      return document.createElementNS("http://www.w3.org/2000/svg",
        d.type === "company" ? "rect" : "circle");
    })
      .attr("width", 60)
      .attr("height", 40)
      .attr("r", d => d.type !== "company" ? 20 : null)
      .attr("x", d => d.type === "company" ? -30 : null)
      .attr("y", d => d.type === "company" ? -20 : null)
      .attr("fill", d => d.type === "company" ? "#cfe6fc" : "#fdd76c");

    node.append("text")
      .attr("y", d => d.type === "company" ? 5 : 0)
      .text(d => d.label);

    node.append("text")
      .attr("y", d => d.type === "company" ? 20 : 15)
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .text(d => d.role || d.status || '');

    node.on("mouseover", (event, d) => {
      tooltip.style("display", "block")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + "px")
        .html(`
          <strong>${d.label}</strong><br/>
          ${d.role ? `<em>${d.role}</em><br/>` : ""}
          ${d.status ? `Status: ${d.status}<br/>` : ""}
        `);
    });

    node.on("mouseout", () => {
      tooltip.style("display", "none");
    });
  }

  window.lookupCompany = lookupCompany;
});