function lookupCompany(isRetry = false) {
  const companyNumber = document.getElementById("companyInput").value.trim();
  if (!companyNumber) return;

  setUIState("loading");

  fetch(`/api/network?companyNumber=${companyNumber}`)
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) {
        console.warn("Invalid network data:", data);
        setUIState("error");
        return;
      }

      setUIState("success");
      drawNetwork(data.nodes, data.links);
    })
    .catch(err => {
      console.error("❌ Network fetch failed:", err);
      setUIState("error");
    });
}

function setUIState(state) {
  const loader = document.getElementById("loader");
  const status = document.getElementById("statusMessage");
  const retry = document.getElementById("retryContainer");

  if (state === "loading") {
    status.textContent = "";
    loader.style.display = "block";
    retry.style.display = "none";
    clearGraph();
  } else if (state === "success") {
    loader.style.display = "none";
    retry.style.display = "none";
    status.textContent = "✅ Network loaded successfully.";
  } else if (state === "error") {
    loader.style.display = "none";
    retry.style.display = "block";
    status.textContent = "⚠️ Failed to load network. Try again.";
  }
}

function clearGraph() {
  d3.select("#networkGraph").selectAll("*").remove();
}