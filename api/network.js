const fetch = require('node-fetch');

// Simple in-memory cache
const cache = new Map();

module.exports = async (req, res) => {
  const { companyNumber } = req.query;
  const API_KEY = process.env.CH_API_KEY;

  if (!companyNumber || !API_KEY) {
    console.error("❌ Missing companyNumber or API key");
    return res.status(400).json({ error: "Missing company number or API key" });
  }

  const cacheKey = `graph-${companyNumber}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);

  if (cached && now - cached.timestamp < 10 * 60 * 1000) {
    console.log(`✅ Cache hit for ${companyNumber}`);
    return res.status(200).json(cached.graph);
  }

  console.log(`🔍 Building graph for ${companyNumber}`);
  const headers = {
    Authorization: 'Basic ' + Buffer.from(API_KEY + ':').toString('base64')
  };

  const seenCompanies = new Set([companyNumber]);
  const graph = { nodes: [], links: [] };

  try {
    const mainCompany = await fetchCompany(companyNumber, headers);
    graph.nodes.push({
      id: `company-${companyNumber}`,
      label: `${mainCompany.company_name || `Company ${companyNumber}`} [${mainCompany.company_status || "unknown"}]`,
      type: "company"
    });

    const officers = await fetchOfficers(companyNumber, headers);

    for (const officer of officers) {
      const name = typeof officer.name === "string" ? officer.name : "Unnamed Officer";
      const role = officer.officer_role || "unknown role";
      const officerId = `officer-${name}`;

      graph.nodes.push({
        id: officerId,
        label: `${name} (${role})`,
        type: "officer"
      });

      graph.links.push({
        source: officerId,
        target: `company-${companyNumber}`
      });

      const appointments = await fetchAppointments(officer, headers);
      for (const item of appointments) {
        const otherNum = item.appointed_to?.company_number;
        if (!otherNum || seenCompanies.has(otherNum)) continue;

        seenCompanies.add(otherNum);
        const otherCompany = await fetchCompany(otherNum, headers);

        graph.nodes.push({
          id: `company-${otherNum}`,
          label: `${otherCompany.company_name || `Company ${otherNum}`} [${otherCompany.company_status || "unknown"}]`,
          type: "company"
        });

        graph.links.push({
          source: officerId,
          target: `company-${otherNum}`
        });
      }
    }

    graph.nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    graph.links = Array.isArray(graph.links) ? graph.links : [];

    cache.set(cacheKey, { timestamp: now, graph });

    console.log(`✅ Graph ready: ${graph.nodes.length} nodes, ${graph.links.length} links`);
    res.status(200).json(graph);
  } catch (err) {
    console.error("🔥 Unexpected server error:", err);
    res.status(200).json(graph); // Send partial data
  }
};

// 🔧 Helper Functions

async function fetchCompany(num, headers) {
  try {
    const res = await fetch(`https://api.company-information.service.gov.uk/company/${num}`, { headers });
    return res.ok ? await res.json() : {};
  } catch (err) {
    console.error(`❌ Company fetch failed (${num}):`, err);
    return {};
  }
}

async function fetchOfficers(num, headers) {
  try {
    const res = await fetch(`https://api.company-information.service.gov.uk/company/${num}/officers`, { headers });
    const { items = [] } = await res.json();
    return items;
  } catch (err) {
    console.error(`❌ Officers fetch failed (${num}):`, err);
    return [];
  }
}

async function fetchAppointments(officer, headers) {
  try {
    if (!officer.links?.officer?.appointments) return [];
    const url = `https://api.company-information.service.gov.uk${officer.links.officer.appointments}`;
    const res = await fetch(url, { headers });
    const { items = [] } = await res.json();
    return items;
  } catch (err) {
    console.error(`❌ Appointments fetch failed for ${officer.name || "unknown"}:`, err);
    return [];
  }
}