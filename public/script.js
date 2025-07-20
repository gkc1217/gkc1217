function fetchShareholders() {
  const companyNumber = document.getElementById("companyInput").value;
  fetch('/api/psc?companyNumber='+companyNumber)
    .then(res => res.json())
    .then(data => renderChart(data.items))
    .catch(err => console.error("Client error:", err));
}

function renderChart(pscs) {
  const labels = [];
  const data = [];
  const tooltips = [];
  const baseUrl = "https://find-and-update.company-information.service.gov.uk";
  const container = document.getElementById("shareholderLinks");
  container.innerHTML = "";

  pscs.forEach(psc => {
    const name = psc.name || "Unnamed";
    const control = psc.natures_of_control?.join(", ") || "Unknown";
    let share = 10;
    if (control.includes("ownership-of-shares-25-to-50-percent")) share = 30;
    if (control.includes("ownership-of-shares-50-to-75-percent")) share = 60;
    if (control.includes("ownership-of-shares-75-to-100-percent")) share = 90;

    labels.push(name);
    data.push(share);
    tooltips.push(control);

    if (psc.links?.self) {
      const link = document.createElement("a");
      link.href = baseUrl + psc.links.self;
      link.textContent = '🔗 View ${name}'s Profile';
      link.target = "_blank";
      link.style.display = "block";
      container.appendChild(link);
    }
  });

  const ctx = document.getElementById("shareholderChart").getContext("2d");
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        label: "Estimated Shareholding (%)",
        data,
        backgroundColor: ["#FFD700", "#FF6347", "#3CB371", "#0078D4"]
      }]
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const i = context.dataIndex;
              return '${labels[i]}: ${data[i]}% - ${tooltips[i]}';
            }
          }
        }
      }
    }
  });
}