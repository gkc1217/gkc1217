const svg = d3.select("#ownership-graph");
const zoomLayer = svg.append("g"); // Layer for zoom/pan
const apiKey = "YOUR_API_KEY"; // Insert actual API key
const cache = {};

function drawGraph(nodes, links) {
  zoomLayer.selectAll("*").remove();

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Zoom behavior
  svg.call(d3.zoom().on("zoom", (event) => {
    zoomLayer.attr("transform", event.transform);
  }));

  // Arrows
  svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 10)
    .attr("refY", 0)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5")
    .attr("fill", "#333");

  // Draw links
  zoomLayer.selectAll("line.link")
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

  // Link labels
  zoomLayer.selectAll("text.link-label")
    .data(links)
    .enter()
    .append("text")
    .attr("x", d => (d.source.x + d.target.x) / 2)
    .attr("y", d => (d.source.y + d.target.y) / 2 - 10)
    .attr("text-anchor", "middle")
    .attr("class", "link-label")
    .text(d => d.ownership || "");

  // Node icons and containers
  zoomLayer.selectAll("g.node")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`<strong>${d.label}</strong><br>${d.tooltip}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .each(function (d) {
      const g = d3.select(this);
      if (d.type === "officer") {
        g.append("circle").attr("r", 30).attr("class", "officer");
      } else {
        g.append("rect").attr("x", -60).attr("y", -30)
          .attr("width", 120).attr("height", 60)
          .attr("rx", 10)
          .attr("class", `company ${d.status?.toLowerCase() || 'active'}`);
      }

      // Label
      g.append("text")
        .attr("y", 45)
        .attr("text-anchor", "middle")
        .attr("class", "node-label")
        .text(d.label);
    });
}

async function fetchCompanyData(companyId, depth) {
  const status = document.getElementById("status-msg");
  status.textContent = "Fetching data...";
  try {
    if (cache[companyId]) {
      drawGraph(cache[companyId].nodes, cache[companyId].links);
      status.textContent = "Loaded from cache.";
      return;
    }

    // Dummy async tree builder — replace with recursive PSC fetch logic
    const companyRes = await fetch(`https://api.company-information.service.gov.uk/company/${companyId}`, {
      headers: { Authorization: `Basic ${btoa(apiKey + ":")}` }
    });
    if (!companyRes.ok) throw new Error("Invalid Company ID");

    const data = await companyRes.json();
    const nodes = [{
      id: companyId,
      type: "company",
      x: 400,
      y: 200,
      label: data.company_name,
      tooltip: `Status: ${data.company_status}`,
      status: data.company_status
    }];
    const links = [];

    // Simulate recursive children
    for (let i = 1; i <= depth; i++) {
      nodes.push({
        id: `${companyId}-sub-${i}`,
        type: i % 2 === 0 ? "officer" : "company",
        x: 700 + i * 100,
        y: 200 + i * 80,
        label: i % 2 === 0 ? `Officer ${i}` : `Subsidiary ${i}`,
        tooltip: `Depth ${i}`,
        status: "active"
      });
      links.push({ source: nodes[0], target: nodes[nodes.length - 1], ownership: `${100 - i * 10}%` });
    }

    cache[companyId] = { nodes, links };
    drawGraph(nodes, links);
    status.textContent = "Graph generated!";
  } catch (err) {
    status.textContent = "❌ " + err.message;
    console.error(err);
  }
}

document.getElementById("fetch-data").addEventListener("click", () => {
  const companyId = document.getElementById("company-id").value.trim();
  const depth = +document.getElementById("depth-level").value;
  if (companyId) fetchCompanyData(companyId, depth);
});