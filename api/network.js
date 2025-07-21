const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { companyNumber } = req.query;
  const API_KEY = process.env.CH_API_KEY;
  const seenCompanies = new Set();
  const queue = [companyNumber];
  const graph = { nodes: [], links: [] };

  if (!companyNumber || !API_KEY) {
    return res.status(400).json({ error: "Missing company number or API key" });
  }

  try {
    for (let depth = 0; depth < 3 && queue.length > 0; depth++) {
      const currentBatch = [...queue];
      queue.length = 0;

      for (const num of currentBatch) {
        if (seenCompanies.has(num)) continue;
        seenCompanies.add(num);

        const base = `https://api.company-information.service.gov.uk/company/${num}`;
        const headers = {
          Authorization: 'Basic ' + Buffer.from(API_KEY + ':').toString('base64')
        };

        // Attempt to fetch company data
        let company = { company_name: `Company ${num}` };
        try {
          const res = await fetch(base, { headers });
          if (res.ok) company = await res.json();
        } catch (err) {
          console.warn(`Failed to fetch company ${num}:`, err);
        }

        graph.nodes.push({
          id: `company-${num}`,
          label: company.company_name || `Company ${num}`,
          type: "company"
        });

        // Attempt to fetch officer data
        try {
          const res = await fetch(`${base}/officers`, { headers });
          if (res.ok) {
            const { items = [] } = await res.json();

            for (const officer of items) {
              const name = typeof officer.name === "string" ? officer.name : "Unnamed Officer";
              const officerId = `officer-${name}`;
              graph.nodes.push({ id: officerId, label: name, type: "officer" });
              graph.links.push({ source: officerId, target: `company-${num}` });

              if (officer.links?.officer?.appointments) {
                try {
                  const appointURL = `https://api.company-information.service.gov.uk${officer.links.officer.appointments}`;
                  const appointRes = await fetch(appointURL, { headers });
                  if (appointRes.ok) {
                    const appointData = await appointRes.json();
                    for (const item of appointData.items || []) {
                      const otherNum = item.appointed_to?.company_number;
                      if (otherNum && typeof otherNum === "string" && !seenCompanies.has(otherNum)) {
                        queue.push(otherNum);
                      }
                    }
                  }
                } catch (err) {
                  console.warn(`Failed to fetch appointments for officer ${name}:`, err);
                }
              }
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch officers for company ${num}:`, err);
        }
      }
    }

    // Ensure graph structure is valid
    if (!Array.isArray(graph.nodes)) graph.nodes = [];
    if (!Array.isArray(graph.links)) graph.links = [];

    res.status(200).json(graph);
  } catch (err) {
    console.error("Unexpected error building graph:", err);
    res.status(200).json(graph); // Still send partial graph
  }
};