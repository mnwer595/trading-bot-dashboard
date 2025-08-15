"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "http://198.23.206.54";
const GET_SETTINGS_URL = `${API_URL}/getsettings`;
const SAVE_SETTINGS_URL = `${API_URL}/savesettings`;

type Settings = {
  auto_trade: boolean;
  channel_listener: boolean;
  webhook_enabled: boolean;
  risk_percentage: number;
  lot_size: number;
  default_sl_pips: number;
  risk_reward_ratio: number;
  trading_hours: {
    start: number;
    end: number;
  };
  algo_trading: {
    enabled: boolean;
    interval_minutes: number;
  };
  hft_trading: {
    enabled: boolean;
  };
  trade_secure: {
    enabled: boolean;
  };
};

export default function Home() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching settings from:', GET_SETTINGS_URL);
      const res = await fetch(GET_SETTINGS_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors', // Explicitly set CORS mode
      });
      
      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch settings: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      console.log('Settings data:', data);
      setSettings(data);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (settingsToSave: Settings) => {
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    
    try {
      console.log('Saving settings to:', SAVE_SETTINGS_URL);
      const res = await fetch(SAVE_SETTINGS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors', // Explicitly set CORS mode
        body: JSON.stringify(settingsToSave),
      });
      
      console.log('Save response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Save API Error:', errorText);
        throw new Error(`Failed to save settings: ${res.status} ${errorText}`);
      }
      
      setSaveMessage("Settings saved successfully!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleChange = async (key: string, value: boolean) => {
    if (!settings) return;
    
    let newSettings: Settings;
    
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      newSettings = {
        ...settings,
        [parent]: {
          ...(settings as any)[parent],
          [child]: value
        }
      };
    } else {
      newSettings = {
        ...settings,
        [key]: value
      };
    }
    
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleNumberChange = (key: string, value: number) => {
    if (!settings) return;
    
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setSettings({
        ...settings,
        [parent]: {
          ...(settings as any)[parent],
          [child]: value
        }
      });
    } else {
      setSettings({
        ...settings,
        [key]: value
      });
    }
  };

  const handleManualSave = async () => {
    if (!settings) return;
    await saveSettings(settings);
  };

  const ToggleButton = ({ 
    checked, 
    onChange, 
    label 
  }: { 
    checked: boolean; 
    onChange: (checked: boolean) => void; 
    label: string; 
  }) => (
    <div className="flex items-center justify-between">
      <label className="font-medium">{label}:</label>
      <button
        className={`w-12 h-6 rounded-full flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          checked ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
        onClick={() => onChange(!checked)}
        aria-label={`Toggle ${label}`}
        tabIndex={0}
      >
        <span
          className={`inline-block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <div className="flex gap-2">
            <Link
              href="/experts"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Manage Experts
            </Link>
            <button
              onClick={fetchSettings}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
        
        {loading && (
          <div className="flex justify-center items-center h-40">
            <span className="text-lg">Loading...</span>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded mb-4 text-center">
            Error: {error}
          </div>
        )}
        
        {saveMessage && (
          <div className="bg-green-100 text-green-700 p-4 rounded mb-4 text-center">
            {saveMessage}
          </div>
        )}
        
        {settings && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Trading Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Trading Settings</h3>
                
                <ToggleButton
                  checked={settings.auto_trade}
                  onChange={(value) => handleToggleChange('auto_trade', value)}
                  label="Auto Trade"
                />
                
                <ToggleButton
                  checked={settings.channel_listener}
                  onChange={(value) => handleToggleChange('channel_listener', value)}
                  label="Channel Listener"
                />
                
                <ToggleButton
                  checked={settings.webhook_enabled}
                  onChange={(value) => handleToggleChange('webhook_enabled', value)}
                  label="Webhook Enabled"
                />
                
                <div>
                  <label className="block font-medium mb-1">Risk Percentage:</label>
                  <input
                    type="number"
                    value={settings.risk_percentage}
                    onChange={(e) => handleNumberChange('risk_percentage', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                  />
                </div>
                
                <div>
                  <label className="block font-medium mb-1">Lot Size:</label>
                  <input
                    type="number"
                    value={settings.lot_size}
                    onChange={(e) => handleNumberChange('lot_size', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.01"
                    min="0.01"
                  />
                </div>
              </div>
              
              {/* Risk Management */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Risk Management</h3>
                
                <div>
                  <label className="block font-medium mb-1">Default SL (pips):</label>
                  <input
                    type="number"
                    value={settings.default_sl_pips}
                    onChange={(e) => handleNumberChange('default_sl_pips', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block font-medium mb-1">Risk/Reward Ratio:</label>
                  <input
                    type="number"
                    value={settings.risk_reward_ratio}
                    onChange={(e) => handleNumberChange('risk_reward_ratio', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    step="0.1"
                    min="0.1"
                  />
                </div>
                
                <div>
                  <label className="block font-medium mb-1">Trading Hours Start:</label>
                  <input
                    type="number"
                    value={settings.trading_hours.start}
                    onChange={(e) => handleNumberChange('trading_hours.start', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="23"
                  />
                </div>
                
                <div>
                  <label className="block font-medium mb-1">Trading Hours End:</label>
                  <input
                    type="number"
                    value={settings.trading_hours.end}
                    onChange={(e) => handleNumberChange('trading_hours.end', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="23"
                  />
                </div>
              </div>
              
              {/* Advanced Trading */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-semibold text-purple-600 dark:text-purple-400">Advanced Trading</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <ToggleButton
                      checked={settings.algo_trading.enabled}
                      onChange={(value) => handleToggleChange('algo_trading.enabled', value)}
                      label="Algo Trading"
                    />
                    {settings.algo_trading.enabled && (
                      <div>
                        <label className="block text-sm mb-1">Interval (minutes):</label>
                        <input
                          type="number"
                          value={settings.algo_trading.interval_minutes}
                          onChange={(e) => handleNumberChange('algo_trading.interval_minutes', Number(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                      </div>
                    )}
                  </div>
                  
                  <ToggleButton
                    checked={settings.hft_trading.enabled}
                    onChange={(value) => handleToggleChange('hft_trading.enabled', value)}
                    label="HFT Trading"
                  />
                  
                  <ToggleButton
                    checked={settings.trade_secure.enabled}
                    onChange={(value) => handleToggleChange('trade_secure.enabled', value)}
                    label="Trade Secure"
                  />
                </div>
              </div>
            </div>
            
            {/* Manual Save Button for Number Inputs */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleManualSave}
                disabled={saving}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Number Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
