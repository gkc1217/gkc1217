function lookupCompany() {
  const companyNumber = document.getElementById("companyInput").value;
  fetch(`/api/details?companyNumber=${companyNumber}`)
    .then(res => res.json())
    .then(data => {
      renderShareholders(data.psc);
      renderOfficers(data.officers);
    });
}

function renderShareholders(pscs) {
  const labels = [];
  const data = [];
  const tooltips = [];
  const baseUrl = "https://find-and-update.company-information.service.gov.uk";
  document.getElementById("shareholderLinks").innerHTML = "";

  pscs.forEach(psc => {
    const name = psc.name || "Unnamed";
    const control = psc.natures_of_control?.join(", ") || "Unknown";
    const share = control.includes("ownership-of-shares-75-to-100-percent") ? 90 :
                  control.includes("ownership-of-shares-50-to-75-percent") ? 60 :
                  control.includes("ownership-of-shares-25-to-50-percent") ? 30 : 10;

    labels.push(name);
    data.push(share);
    tooltips.push(control);

    if (psc.links?.self) {
      const link = document.createElement("a");
      link.href = baseUrl + psc.links.self;
      link.textContent = `🔗 View ${name}'s Profile`;
      link.target = "_blank";
      link.style.display = "block";
      document.getElementById("shareholderLinks").appendChild(link);
    }
  });

  new Chart(document.getElementById('shareholderChart'), {
    type: 'doughnut',
    data: {
      labels, datasets: [{
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
    roles[o.officer_role] = (roles[o.officer_role] || 0) + 1;
  });

  new Chart(document.getElementById('officerChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(roles),
      datasets: [{
        label: '# of Officers',
        data: Object.values(roles),
        backgroundColor: '#0078D4'
      }]
    },
    options: {
      scales: { y: { beginAtZero: true } }
    }
  });
}