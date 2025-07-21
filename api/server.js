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
    for (let depth = 0; depth < 3 && queue.length; depth++) {
      const currentBatch = [...queue];
      queue.length = 0;

      for (const companyNumber of currentBatch) {
        if (seenCompanies.has(companyNumber)) continue;
        seenCompanies.add(companyNumber);

        const companyUrl = `https://api.company-information.service.gov.uk/company/${companyNumber}`;
        const officersUrl = `${companyUrl}/officers`;

        const [companyRes, officersRes] = await Promise.all([
          fetch(companyUrl, {
            headers: { Authorization: 'Basic ' + Buffer.from(API_KEY + ':').toString('base64') }
          }),
          fetch(officersUrl, {
            headers: { Authorization: 'Basic ' + Buffer.from(API_KEY + ':').toString('base64') }
          })
        ]);

        const company = await companyRes.json();
        const officers = await officersRes.json();

        graph.nodes.push({ id: `company-${companyNumber}`, label: company.company_name, type: "company" });

        for (const officer of officers.items || []) {
          const officerId = `officer-${officer.name}`;

          graph.nodes.push({ id: officerId, label: officer.name, type: "officer" });
          graph.links.push({ source: officerId, target: `company-${companyNumber}` });

          if (officer.links?.officer?.appointments) {
            const officerProfile = await fetch("https://api.company-information.service.gov.uk" + officer.links.officer.appointments, {
              headers: { Authorization: 'Basic ' + Buffer.from(API_KEY + ':').toString('base64') }
            });
            const appointments = await officerProfile.json();

            for (const appointment of appointments.items || []) {
              const otherCompany = appointment.appointed_to?.company_number;
              if (otherCompany && !seenCompanies.has(otherCompany)) {
                queue.push(otherCompany);
              }
            }
          }
        }
      }
    }

    res.json(graph);
  } catch (err) {
    console.error("Network builder error:", err);
    res.status(500).json({ error: "Failed to build company network" });
  }
});

app.listen(PORT, () => console.log(`Proxy running at http://localhost:${PORT}`));