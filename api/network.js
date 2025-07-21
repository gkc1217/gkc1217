const fetch = require('node-fetch');

// Simple in-memory cache (expires after 10 min)
const cache = new Map();

module.exports = async (req, res) => {
  const { companyNumber } = req.query;
  const API_KEY = process.env.CH_API_KEY;

  if (!companyNumber || !API_KEY) {
    console.error("❌ Missing company number or API key");
    return res.status(400).json({ error: "Missing company number or API key" });
  }

  const cacheKey = `graph-${companyNumber}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);

  // Check if cached entry is valid
  if (cached && now - cached.timestamp < 10 * 60 * 1000) {
    console.log(`✅ Cache hit for ${companyNumber}`);
    return res.status(200).json(cached.graph);
  }

  console.log(`🔍 Building new graph for ${companyNumber}`);

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
        const headers = {
          Authorization: 'Basic ' + Buffer.from(API_KEY + ':').toString('base64')
        };

        // Fetch company info
        let company = { company_name: `Company ${num}` };
        try {
          const resCompany = await fetch(base, { headers });
          if (resCompany.ok) {
            company = await resCompany.json();
          } else {
            console.error(`⚠️ Company ${num} fetch failed:`, resCompany.status);
          }
        } catch (err) {
          console.error(`❌ Error fetching company ${num}:`, err);
        }

        graph.nodes.push({
          id: `company-${num}`,
          label: company.company_name || `Company ${num}`,
          type: "company"
        });

        // Fetch officer info
        try {
          const resOfficers = await fetch(`${base}/officers`, { headers });
          if (resOfficers.ok) {
            const { items = [] } = await resOfficers.json();
            console.log(`👥 Found ${items.length} officers for ${num}`);

            for (const officer of items) {
              const name = typeof officer.name === "string" ? officer.name : "Unnamed Officer";
              const officerId = `officer-${name}`;
              graph.nodes.push({ id: officerId, label: name, type: "officer" });
              graph.links.push({ source: officerId, target: `company-${num}` });

              // Fetch other appointments
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
                  } else {
                    console.error(`⚠️ Officer appointments fetch failed:`, appointRes.status);
                  }
                } catch (err) {
                  console.error(`❌ Error fetching appointments for ${name}:`, err);
                }
              }
            }
          } else {
            console.error(`⚠️ Officers fetch for ${num} failed:`, resOfficers.status);
          }
        } catch (err) {
          console.error(`❌ Error fetching officers for ${num}:`, err);
        }
      }
    }

    graph.nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    graph.links = Array.isArray(graph.links) ? graph.links : [];

    // Save to cache
    cache.set(cacheKey, {
      timestamp: now,
      graph
    });

    console.log(`✅ Graph built: ${graph.nodes.length} nodes, ${graph.links.length} links`);
    res.status(200).json(graph);
  } catch (err) {
    console.error("🔥 Unexpected failure building graph:", err);
    res.status(200).json(graph); // Partial graph fallback
  }
};