function lookupCompany() {
  const companyNumber = document.getElementById("companyInput").value.trim();
  const depth = parseInt(document.getElementById("depthSelect").value || "2", 10);
  if (!companyNumber) return;

  setUIState("loading");

  fetch(`/api/network?companyNumber=${companyNumber}&depth=${depth}`)
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) {
        setUIState("error");
        return;
      }

      setUIState("success");

      const companyCount = data.nodes.filter(n => n.type === "company").length;
      const officerCount = data.nodes.filter(n => n.type === "officer").length;

      document.getElementById("statusMessage").innerHTML = `
        ✅ Network loaded.<br>
        <strong>${companyCount}</strong> companies and <strong>${officerCount}</strong> officers linked.
      `;

      drawNetwork(data.nodes, data.links, companyNumber);
    })
    .catch(err => {
      console.error("Network fetch failed:", err);
      setUIState("error");
    });
}

function setUIState(state) {
  document.getElementById("loader").style.display = state === "loading" ? "block" : "none";
  document.getElementById("retryContainer").style.display = state === "error" ? "block" : "none";
  if (state !== "success") {
    document.getElementById("statusMessage").textContent =
      state === "error" ? "⚠️ Load failed. Try again." : "";
    d3.select("#networkGraph").selectAll("g").remove();
  }
}

function drawNetwork(nodes, links, companyNumber) {
  const svg = d3.select("#networkGraph");
  svg.selectAll("g").remove();
  const tooltip = d3.select("#tooltip");

  const zoomGroup = svg.append("g");
  svg.call(d3.zoom().scaleExtent([0.5, 2]).on("zoom", e => zoomGroup.attr("transform", e.transform)));

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(150))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(400, 300));

  const mainCompany = nodes.find(n => n.id === `company-${companyNumber}`);
  if (mainCompany) {
    mainCompany.fx = 400;
    mainCompany.fy = 550;
  }

  zoomGroup.append("g")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke", "#aaa");

  const iconSize = 20;
  zoomGroup.append("g")
    .selectAll("use")
    .data(nodes)
    .enter()
    .append("use")
    .attr("href", d => d.type === "company" ? "#companyIcon" : "#personIcon")
    .attr("x", -iconSize / 2)
    .attr("y", -iconSize / 2)
    .attr("width", iconSize)
    .attr("height", iconSize)
    .on("mouseover", function (event, d) {
      tooltip.style("display", "block")
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + "px")
        .html(`<strong>${d.label}</strong><br>Type: ${d.type}`);
    })
    .on("mouseout", () => tooltip.style("display", "none"))
    .on("dblclick", (event, d) => {
      const base = "https://find-and-update.company-information.service.gov.uk";
      if (d.id.startsWith("company-")) {
        const num = d.id.split("-")[1];
        window.open(`${base}/company/${num}`, "_blank");
      }
    })
    .call(d3.drag()
      .on("start", dragStart)
      .on("drag", dragMove)
      .on("end", dragEnd));

  zoomGroup.append("g")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .text(d => d.label)
    .attr("font-size", "11px")
    .attr("x", 12)
    .attr("y", 4)
    .attr("fill", "#333");

  simulation.on("tick", () => {
    zoomGroup.selectAll("line")
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2