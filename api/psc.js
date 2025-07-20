// api/psc.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const { companyNumber } = req.query;

    if (!companyNumber) {
      return res.status(400).json({ error: 'Company number is required' });
    }

    const apiKey = process.env.CH_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured in environment'+apiKey });
    }

    const endpoint = 'https://api.company-information.service.gov.uk/company/${companyNumber}/persons-with-significant-control';
    const headers = {
      Authorization: 'Basic ' + Buffer.from(apiKey + ':').toString('base64')
    };

    const response = await fetch(endpoint, { headers });

    if (!response.ok) {
      console.error('Companies House error is ',response.statusText);
      return res.status(response.status).json({ error: 'Companies House API error' });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('Function error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}