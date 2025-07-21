let shareholderChartInstance = null;
let officerChartInstance = null;

function lookupCompany() {
  const companyNumber = document.getElementById("companyInput").value.trim();
  if (!companyNumber) return;

  fetch(`/api/details?companyNumber=${companyNumber}`)
    .then(res => res.json())
    .then(data => {
      renderShareholders(data.psc);
      renderOfficers(data.officers);
    })
    .catch(err => console.error("Error fetching data:", err));
}

function renderShareholders(pscs) {
  const labels = [];
  const data = [];
  const tooltips = [];
  const baseUrl = "https://find-and-update.company-information.service.gov.uk";
  const linkContainer = document.getElementById("shareholderLinks");
  linkContainer.innerHTML = "";

  pscs.forEach(psc => {
    const name = psc.name || "Unnamed";
    const control = psc.natures_of_control?.join(", ") || "Unknown";

    let share = 10;
    if (control.includes("ownership-of-shares-75-to-100-percent")) share = 90;
    else if (control.includes("ownership-of-shares-50-to-75-percent")) share = 60;
    else if (control.includes("ownership-of-shares-25-to-50-percent")) share = 30;

    labels.push(name);
    data.push(share);
    tooltips.push(control);

    if (psc.links?.self) {
      const link = document.createElement("a");
      link.href = baseUrl + psc.links.self;
      link.textContent = `🔗 View ${name}'s Profile`;
      link.target = "_blank";
      link.style.display = "block";
      linkContainer.appendChild(link);
    }
  });
 
  const ctx = document.getElementById('shareholderChart').getContext('2d');
  if (shareholderChartInstance) {
  shareholderChartInstance.destroy();
}
shareholderChartInstance = 
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#FFD700', '#0078D4', '#FF6347', '#3CB371']
      }]
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => `${labels[ctx.dataIndex]}: ${data[ctx.dataIndex]}% – ${tooltips[ctx.dataIndex]}`
          }
        }
      }
    }
  });
}

function renderOfficers(officers) {
  const roles = {};
  officers.forEach(o => {
    if (o.officer_role) {
      roles[o.officer_role] = (roles[o.officer_role] || 0) + 1;
    }
  });

  
  const ctx = document.getElementById('officerChart').getContext('2d');
  if (officerChartInstance ) {
  officerChartInstance.destroy();
}
officerChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(roles),
      datasets: [{
        label: 'Officer Count',
        data: Object.values(roles),
        backgroundColor: '#0078D4'
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}