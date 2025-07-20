import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { companyNumber } = req.query;
  const API_KEY = process.env.CH_API_KEY;

  const url = `https://api.company-information.service.gov.uk/company/${companyNumber}/persons-with-significant-control`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: 'Basic ' + Buffer.from(API_KEY + ':').toString('base64')
      }
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('PSC error:', err);
    res.status(500).json({ error: 'Failed to fetch PSC data' });
  }
}