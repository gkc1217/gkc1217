const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { companyNumber } = req.query;
  const API_KEY = process.env.CH_API_KEY;

  if (!companyNumber || !API_KEY) {
    console.error("❌ Missing company number or API key");
    return res.status(400).json({ error: "Missing company number or API key" });
  }

  const headers = {
    Authorization: 'Basic ' + Buffer.from(API_KEY + ':').toString('base64')
  };

  const seenCompanies = new Set([companyNumber]);
  const graph = { nodes: [], links: [] };

  try {
    // Level 1: Main company
    const company = await fetchCompany(companyNumber, headers);
    graph.nodes.push({
      id: `company-${companyNumber}`,
      label: company.company_name || `Company ${companyNumber}`,
      type: "company"
    });

    // Officers of main company
    const officers = await fetchOfficers(companyNumber, headers);

    for (const officer of officers) {
      const name = typeof officer.name === "string" ? officer.name : "Unnamed Officer";
      const officerId = `officer-${name}`;
      graph.nodes.push({ id: officerId, label: name, type: "officer" });
      graph.links.push({ source: officerId, target: `company-${companyNumber}` });

      // Level 2: Companies where officer is appointed
      const appointments = await fetchAppointments(officer, headers);

      for (const item of appointments) {
        const otherNum = item.appointed_to?.company_number;
        if (!otherNum || seenCompanies.has(otherNum)) continue;

        seenCompanies.add(otherNum);
        const otherCompany = await fetchCompany(otherNum, headers);
        graph.nodes.push({
          id: `company-${otherNum}`,
          label: otherCompany.company_name || `Company ${otherNum}`,
          type: "company"
        });
        graph.links.push({ source: officerId, target: `company-${otherNum}` });
      }
    }

    graph.nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    graph.links = Array.isArray(graph.links) ? graph.links : [];

    console.log(`✅ Final graph: ${graph.nodes.length} nodes, ${graph.links.length} links`);
    res.status(200).json(graph);
  } catch (err) {
    console.error("🔥 Unexpected failure:", err);
    res.status(200).json(graph); // Still send partial graph
  }
};

// Helpers

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
    console.error(`❌ Officer fetch failed (${num}):`, err);
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
    console.error(`❌ Appointment fetch failed for ${officer.name}:`, err);
    return [];
  }
}