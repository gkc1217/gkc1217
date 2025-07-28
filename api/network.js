export async function fetchCompanyData(companyNumber) {
  try {
    const response = await fetch(`/api/company?number=${companyNumber}`);
    if (!response.ok) throw new Error('Company fetch failed');
    return await response.json();
  } catch (error) {
    console.error('Error fetching company data:', error);
    return null;
  }
}

export async function fetchOfficers(companyNumber) {
  try {
    const response = await fetch(`/api/officers?company=${companyNumber}`);
    if (!response.ok) throw new Error('Officers fetch failed');
    return await response.json();
  } catch (error) {
    console.error('Error fetching officers:', error);
    return [];
  }
}

export async function fetchPSCs(companyNumber) {
  try {
    const response = await fetch(`/api/pscs?company=${companyNumber}`);
    if (!response.ok) throw new Error('PSCs fetch failed');
    return await response.json();
  } catch (error) {
    console.error('Error fetching PSCs:', error);
    return [];
  }
}