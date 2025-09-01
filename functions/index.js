const functions = require('firebase-functions');
const fetch = require('node-fetch');

const API_BASE_URL = 'http://198.23.206.54';

// Proxy for settings endpoints
exports.getSettings = functions.https.onRequest(async (req, res) => {
  try {
    const response = await fetch(`${API_BASE_URL}/getsettings`);
    const data = await response.json();
    
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

exports.saveSettings = functions.https.onRequest(async (req, res) => {
  try {
    const response = await fetch(`${API_BASE_URL}/savesettings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    
    const data = await response.json();
    
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json(data);
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Proxy for experts endpoints
exports.getExperts = functions.https.onRequest(async (req, res) => {
  try {
    const response = await fetch(`${API_BASE_URL}/getexperts`);
    const data = await response.json();
    
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching experts:', error);
    res.status(500).json({ error: 'Failed to fetch experts' });
  }
});

exports.saveExperts = functions.https.onRequest(async (req, res) => {
  try {
    const response = await fetch(`${API_BASE_URL}/saveexperts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    
    const data = await response.json();
    
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json(data);
  } catch (error) {
    console.error('Error saving experts:', error);
    res.status(500).json({ error: 'Failed to save experts' });
  }
});

// Proxy for positions endpoint
exports.getPositions = functions.https.onRequest(async (req, res) => {
  try {
    const response = await fetch(`${API_BASE_URL}/getpositions`);
    const data = await response.json();
    
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// Proxy for symbol settings endpoints
exports.getSymbolSettings = functions.https.onRequest(async (req, res) => {
  try {
    const response = await fetch(`${API_BASE_URL}/getsymbolsettings`);
    const data = await response.json();
    
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching symbol settings:', error);
    res.status(500).json({ error: 'Failed to fetch symbol settings' });
  }
});

exports.saveSymbolSettings = functions.https.onRequest(async (req, res) => {
  try {
    const response = await fetch(`${API_BASE_URL}/savesymbolsettings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    
    const data = await response.json();
    
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json(data);
  } catch (error) {
    console.error('Error saving symbol settings:', error);
    res.status(500).json({ error: 'Failed to save symbol settings' });
  }
});
