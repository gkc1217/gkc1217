const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  const { companyNumber } = req.query;
  const apiKey = process.env.CH_API_KEY;
  const headers = {
    Authorization: 'Basic ' + Buffer.from(apiKey + ':').toString('base64')
  };

  try {
    const pscRes = await fetch(`https://api.company-information.service.gov.uk/company/${companyNumber}/persons-with-significant-control`, { headers });
    const officerRes = await fetch(`https://api.company-information.service.gov.uk/company/${companyNumber}/officers`, { headers });

    const pscData = await pscRes.json();
    const officerData = await officerRes.json();

    res.status(200).json({
      psc: pscData.items || [],
      officers: officerData.items || []
    });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
};