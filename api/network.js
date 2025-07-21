require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = 3000;
const API_KEY = process.env.CH_API_KEY;

app.use(express.static('public'));

app.get('/api/network/:companyNumber', async (req, res) => {
  const seenCompanies = new Set();
  const queue = [req.params.companyNumber];
  const graph = { nodes: [], links: [] };

  try {
    for (let depth = 0; depth < 3 && queue.length > 0; depth++) {
      const currentBatch = [...queue];
      queue.length = 0;

      for (const companyNumber of currentBatch) {
        if (seenCompanies.has(companyNumber)) continue;
        seenCompanies.add(companyNumber);

        const headers = {
          Authorization: 'Basic ' + Buffer.from(API_KEY + ':').toString('base64')
        };

        const companyRes = await fetch(`https://api.company-information.service.gov.uk/company/${companyNumber}`, { headers });
        const officersRes = await fetch(`https://api.company-information.service.gov.uk/company/${companyNumber}/officers`, { headers });

        const company = await companyRes.json();
        const officers = await officersRes.json();
console.error("officers:", officers);
        graph.nodes.push({
          id: `company-${companyNumber}`,
          label: company.company_name || companyNumber,
          type: "company"
        });

        for (const officer of officers.items || []) {
          const officerId = `officer-${officer.name}`;
          graph.nodes.push({ id: officerId, label: officer.name, type: "officer" });
          graph.links.push({ source: officerId, target: `company-${companyNumber}` });

          if (officer.links?.officer?.appointments) {
            const appointRes = await fetch("https://api.company-information.service.gov.uk" + officer.links.officer.appointments, { headers });
            const appointments = await appointRes.json();

            for (const item of appointments.items || []) {
              const otherCompanyNumber = item.appointed_to?.company_number;
              if (otherCompanyNumber && !seenCompanies.has(otherCompanyNumber)) {
                queue.push(otherCompanyNumber);
              }
            }
          }
        }
      }
    }

    res.json(graph);
  } catch (err) {
    console.error("Network error:", err);
    res.status(500).json({ error: "Failed to fetch network data" });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));