const API_KEY = 'b8568cb9afc64fad861a69edbddb2658';

export async function getStateCity(address, retries = 3, delay = 500) {
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&format=json&apiKey=${API_KEY}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return {
          state: data.results[0].state || '',
          city: data.results[0].city || '',
          postcode: data.results[0].postcode || ''
        };
      } else {
        return { state: '', city: '', postcode: '' };
      }
    } catch (err) {
      if (attempt < retries) {
        console.warn(`Retrying (${attempt}) for address: ${address} due to error:`, err.message);
        await new Promise(res => setTimeout(res, delay));
      } else {
        console.error('API error for address:', address, err);
        return { state: '', city: '', postcode: '' };
      }
    }
  }
}

export async function getLocationFromAddress(address) {
  try {
    if (!address || typeof address !== 'string') {
      return { city: '', area: '', postcode: '' };
    }

    const location = await getStateCity(address);
    return {
      city: location.city || 'Manchester',
      area: location.state || ''
    };
  } catch (error) {
    console.error('Error getting location:', error);
    return { city: '', area: '' };
  }
}