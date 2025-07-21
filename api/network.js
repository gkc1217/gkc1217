const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { companyNumber } = req.query;
  const API_KEY = process.env.CH_API_KEY;

  if (!companyNumber || !API_KEY) {
    return res.status(400).json({ error: "Missing company number or API key" });
  }

  const seenCompanies = new Set();
  const queue = [companyNumber];
  const graph = { nodes: [], links: [] };

  try {
    for (let depth = 0; depth < 3 && queue.length > 0; depth++) {
      const currentBatch = [...queue];
      queue.length = 0;

      for (const num of currentBatch) {
        if (seenCompanies.has(num)) continue;
        seenCompanies.add(num);

        const base = `https://api.company-information.service.gov.uk/company/${num}`;
        const authHeader = {
          headers: {
            Authorization: 'Basic ' + Buffer.from(API_KEY + ':').toString('base64')
          }
        };

        const [companyRes, officerRes] = await Promise.all([
          fetch(base, authHeader),
          fetch(`${base}/officers`, authHeader)
        ]);

        const company = await companyRes.json();
        const officers = await officerRes.json();

        graph.nodes.push({
          id: `company-${num}`,
          label: company.company_name || num,
          type: "company"
        });

        for (const officer of officers.items || []) {
          const name = officer.name || "Unnamed Officer";
          const officerId = `officer-${name}`;

          graph.nodes.push({
            id: officerId,
            label: name,
            type: "officer"
          });

          graph.links.push({
            source: officerId,
            target: `company-${num}`
          });

          if (officer.links?.officer?.appointments) {
            const appointURL = `https://api.company-information.service.gov.uk${officer.links.officer.appointments}`;
            const appointRes = await fetch(appointURL, authHeader);
            const appointData = await appointRes.json();

            for (const appointment of appointData.items || []) {
              const otherNum = appointment.appointed_to?.company_number;
              if (otherNum && !seenCompanies.has(otherNum)) {
                queue.push(otherNum);
              }
            }
          }
        }
      }
    }

    res.status(200).json(graph);
  } catch (err) {
    console.error("Network.js error:", err);
    res.status(500).json({ error: "Failed to build network graph" });
  }
};