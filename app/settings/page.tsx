"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountSelector from "../components/AccountSelector";

const API_URL = "https://144.91.88.10";
const GET_SETTINGS_URL = `${API_URL}/getsettings`;
const SAVE_SETTINGS_URL = `${API_URL}/savesettings`;

type Settings = {
  auto_trade: boolean;
  channel_listener: boolean;
  webhook_enabled: boolean;
  risk_percentage: number;
  lot_size: number;
  lot_factor: number;
  default_sl_pips: number;
  risk_reward_ratio: number;
  trading_hours: {
    start: number;
    end: number;
  };
  algo_trading: {
    enabled: boolean;
    interval_minutes: number;
    interval_seconds: number;
    lot_mode: string;
    daily_profit_target: number;
    static_lot_size: number;
    sleep_time: number;
  };
  hft_trading: {
    enabled: boolean;
  };
  trade_secure: {
    enabled: boolean;
  };
  trade_monitoring: {
    enabled: boolean;
    check_interval: number;
    profit_lock_distance: number;
  };
  profit_secure: {
    enabled: boolean;
    mode: string;
    initial_target_percentage: number;
    initial_target_usd: number;
    margin_percentage: number;
    margin_usd: number;
    check_interval: number;
    max_loss_enabled: boolean;
    max_loss_percentage: number;
    max_loss_usd: number;
    chat_id: string;
  };
  data_logger: {
    enabled: boolean;
    webhook_log: boolean;
    mt5_handler_log: boolean;
    trade_monitor_log: boolean;
    position_manager_log: boolean;
    message_sender_log: boolean;
  };
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>("test");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [selectedAccount]);

  const handleAccountChange = (accountId: string) => {
    setSelectedAccount(accountId);
  };

  const fetchSettings = async () => {
    try {
      const url = new URL(GET_SETTINGS_URL);
      url.searchParams.append('account_id', selectedAccount);
      
      console.log("Fetching settings from:", url.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Settings data:", data);
      
      setSettings(data);
      setError(null);
      setHasChanges(false);
    } catch (err: any) {
      console.error("Error fetching settings:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (settingsToSave: Settings) => {
    try {
      const url = new URL(SAVE_SETTINGS_URL);
      url.searchParams.append('account_id', selectedAccount);
      
      console.log("Saving settings:", settingsToSave);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsToSave),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Save response:", result);
      
      return result;
    } catch (err: any) {
      console.error("Error saving settings:", err);
      throw err;
    }
  };

  const handleToggleChange = (key: string, value: boolean) => {
    if (!settings) return;

    const updatedSettings = { ...settings };
    
    // Handle nested objects
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      (updatedSettings as any)[parent] = {
        ...(updatedSettings as any)[parent],
        [child]: value
      };
    } else {
      (updatedSettings as any)[key] = value;
    }

    setSettings(updatedSettings);
    setHasChanges(true);
  };

  const handleNumberChange = (key: string, value: number) => {
    if (!settings) return;

    const updatedSettings = { ...settings };
    
    // Handle nested objects
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      (updatedSettings as any)[parent] = {
        ...(updatedSettings as any)[parent],
        [child]: value
      };
    } else {
      (updatedSettings as any)[key] = value;
    }

    setSettings(updatedSettings);
    setHasChanges(true);
  };

  const handleManualSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await saveSettings(settings);
      setSaveMessage("Settings saved successfully!");
      setHasChanges(false);
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
      setSaveMessage("Error saving settings");
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectChange = (key: string, value: string) => {
    if (!settings) return;

    const updatedSettings = { ...settings };
    
    // Handle nested objects
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      (updatedSettings as any)[parent] = {
        ...(updatedSettings as any)[parent],
        [child]: value
      };
    } else {
      (updatedSettings as any)[key] = value;
    }

    setSettings(updatedSettings);
    setHasChanges(true);
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
      <label className="font-medium text-sm text-gray-300">{label}:</label>
      <button
        className={`w-10 h-6 rounded-full flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          checked ? "bg-blue-600" : "bg-gray-600"
        }`}
        onClick={() => onChange(!checked)}
        aria-label={`Toggle ${label}`}
        tabIndex={0}
      >
        <span
          className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-white">General Settings</h1>
            <p className="text-gray-400 mt-1">Configure your trading bot settings</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <AccountSelector 
              selectedAccount={selectedAccount}
              onAccountChange={handleAccountChange}
              className="w-full sm:w-auto"
            />
            <Link 
              href="/" 
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors text-center"
            >
              Back to Dashboard
            </Link>
            <button 
              onClick={fetchSettings} 
              disabled={loading} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading settings...</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-300">Error loading settings</h3>
                <div className="mt-2 text-sm text-red-400">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-6 border rounded-lg p-4 ${
            saveMessage.includes('Error') 
              ? 'bg-red-900/50 border-red-700 text-red-300' 
              : 'bg-green-900/50 border-green-700 text-green-300'
          }`}>
            {saveMessage}
          </div>
        )}

        {/* Settings Form */}
        {settings && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow p-6">
            {/* Save Button - Only show when there are changes */}
            {hasChanges && (
              <div className="mb-6 flex justify-center">
                <button 
                  onClick={handleManualSave} 
                  disabled={saving} 
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Trading Settings */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-blue-400 border-b border-gray-700 pb-2">Trading Settings</h3>
                
                <div className="space-y-4">
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
                </div>
              </div>

              {/* Risk Management */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-green-400 border-b border-gray-700 pb-2">Risk Management</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Risk Percentage (%)</label>
                    <input
                      type="number"
                      value={settings.risk_percentage || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                        handleNumberChange('risk_percentage', value);
                      }}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="100"
                      placeholder="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Lot Size</label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.lot_size || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                        handleNumberChange('lot_size', value);
                      }}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      placeholder="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Lot Factor</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.lot_factor || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                        handleNumberChange('lot_factor', value);
                      }}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      placeholder="1.0"
                    />
                    <p className="text-xs text-gray-400 mt-1">Multiplier for lot size (e.g., 2.0 doubles the lot size)</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Default SL (Pips)</label>
                    <input
                      type="number"
                      value={settings.default_sl_pips || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                        handleNumberChange('default_sl_pips', value);
                      }}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      placeholder="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Risk/Reward Ratio</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.risk_reward_ratio || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                        handleNumberChange('risk_reward_ratio', value);
                      }}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      placeholder="0.1"
                    />
                  </div>
                </div>
              </div>

              {/* Trading Hours */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-yellow-400 border-b border-gray-700 pb-2">Trading Hours</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Start Hour</label>
                    <input
                      type="number"
                      value={settings.trading_hours?.start || 0}
                      onChange={(e) => handleNumberChange('trading_hours.start', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="23"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">End Hour</label>
                    <input
                      type="number"
                      value={settings.trading_hours?.end || 23}
                      onChange={(e) => handleNumberChange('trading_hours.end', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="23"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Trading */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-purple-400 border-b border-gray-700 pb-2">Advanced Trading</h3>
                
                <div className="space-y-4">
                  <ToggleButton 
                    checked={settings.algo_trading?.enabled || false} 
                    onChange={(value) => handleToggleChange('algo_trading.enabled', value)} 
                    label="Algo Trading" 
                  />
                  
                  {settings.algo_trading?.enabled && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Interval (Minutes)</label>
                        <input
                          type="number"
                          value={settings.algo_trading?.interval_minutes || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            handleNumberChange('algo_trading.interval_minutes', value);
                          }}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Interval (Seconds)</label>
                        <input
                          type="number"
                          value={settings.algo_trading?.interval_seconds || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : Number(e.target.value);
                            handleNumberChange('algo_trading.interval_seconds', value);
                          }}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Lot Mode</label>
                        <select
                          value={settings.algo_trading?.lot_mode || 'static'}
                          onChange={(e) => handleSelectChange('algo_trading.lot_mode', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="static">Static</option>
                          <option value="dynamic">Dynamic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Daily Profit Target (%)</label>
                        <input
                          type="number"
                          value={settings.algo_trading?.daily_profit_target || 0}
                          onChange={(e) => handleNumberChange('algo_trading.daily_profit_target', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Static Lot Size</label>
                        <input
                          type="number"
                          step="0.01"
                          value={settings.algo_trading?.static_lot_size || 0}
                          onChange={(e) => handleNumberChange('algo_trading.static_lot_size', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Sleep Time (Seconds)</label>
                        <input
                          type="number"
                          value={settings.algo_trading?.sleep_time || 0}
                          onChange={(e) => handleNumberChange('algo_trading.sleep_time', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="1"
                        />
                      </div>
                    </>
                  )}
                  
                  <ToggleButton 
                    checked={settings.hft_trading?.enabled || false} 
                    onChange={(value) => handleToggleChange('hft_trading.enabled', value)} 
                    label="HFT Trading" 
                  />
                  
                  <ToggleButton 
                    checked={settings.trade_secure?.enabled || false} 
                    onChange={(value) => handleToggleChange('trade_secure.enabled', value)} 
                    label="Trade Secure" 
                  />
                </div>
              </div>

              {/* Trade Monitoring */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-teal-400 border-b border-gray-700 pb-2">Trade Monitoring</h3>
                
                <div className="space-y-4">
                  <ToggleButton 
                    checked={settings.trade_monitoring?.enabled || false} 
                    onChange={(value) => handleToggleChange('trade_monitoring.enabled', value)} 
                    label="Enable Trade Monitoring" 
                  />
                  
                  {settings.trade_monitoring?.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Check Interval (Seconds)</label>
                      <input
                        type="number"
                        value={settings.trade_monitoring?.check_interval || 0}
                        onChange={(e) => handleNumberChange('trade_monitoring.check_interval', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                      />
                    </div>
                  )}
                  
                  {settings.trade_monitoring?.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Profit Lock Distance (Pips)</label>
                      <input
                        type="number"
                        value={settings.trade_monitoring?.profit_lock_distance || 0}
                        onChange={(e) => handleNumberChange('trade_monitoring.profit_lock_distance', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Profit Secure */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-orange-400 border-b border-gray-700 pb-2">Profit Secure</h3>
                
                <div className="space-y-4">
                  <ToggleButton 
                    checked={settings.profit_secure?.enabled || false} 
                    onChange={(value) => handleToggleChange('profit_secure.enabled', value)} 
                    label="Enable Profit Secure" 
                  />
                  
                                     {settings.profit_secure?.enabled && (
                     <div>
                       <label className="block text-sm font-medium text-gray-300 mb-1">Mode</label>
                       <select
                         value={settings.profit_secure?.mode || 'percentage'}
                         onChange={(e) => handleSelectChange('profit_secure.mode', e.target.value)}
                         className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       >
                         <option value="percentage">Percentage</option>
                         <option value="usd">USD</option>
                       </select>
                     </div>
                   )}
                  
                  {settings.profit_secure?.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Initial Target</label>
                      <input
                        type="number"
                        value={settings.profit_secure?.initial_target_percentage || 0}
                        onChange={(e) => handleNumberChange('profit_secure.initial_target_percentage', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  )}
                  
                  {settings.profit_secure?.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Initial Target (USD)</label>
                      <input
                        type="number"
                        value={settings.profit_secure?.initial_target_usd || 0}
                        onChange={(e) => handleNumberChange('profit_secure.initial_target_usd', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  )}
                  
                  {settings.profit_secure?.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Margin</label>
                      <input
                        type="number"
                        value={settings.profit_secure?.margin_percentage || 0}
                        onChange={(e) => handleNumberChange('profit_secure.margin_percentage', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  )}
                  
                  {settings.profit_secure?.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Margin (USD)</label>
                      <input
                        type="number"
                        value={settings.profit_secure?.margin_usd || 0}
                        onChange={(e) => handleNumberChange('profit_secure.margin_usd', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  )}
                  
                  {settings.profit_secure?.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Check Interval (Seconds)</label>
                      <input
                        type="number"
                        value={settings.profit_secure?.check_interval || 0}
                        onChange={(e) => handleNumberChange('profit_secure.check_interval', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                      />
                    </div>
                  )}
                  
                  {settings.profit_secure?.enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Max Loss Enabled</label>
                      <ToggleButton 
                        checked={settings.profit_secure?.max_loss_enabled || false} 
                        onChange={(value) => handleToggleChange('profit_secure.max_loss_enabled', value)} 
                        label="Enable Max Loss" 
                      />
                    </div>
                  )}
                  
                  {settings.profit_secure?.max_loss_enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Max Loss Percentage</label>
                      <input
                        type="number"
                        value={settings.profit_secure?.max_loss_percentage || 0}
                        onChange={(e) => handleNumberChange('profit_secure.max_loss_percentage', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  )}
                  
                  {settings.profit_secure?.max_loss_enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Max Loss (USD)</label>
                      <input
                        type="number"
                        value={settings.profit_secure?.max_loss_usd || 0}
                        onChange={(e) => handleNumberChange('profit_secure.max_loss_usd', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                  )}
                  
                                     {settings.profit_secure?.enabled && (
                     <div>
                       <label className="block text-sm font-medium text-gray-300 mb-1">Chat ID</label>
                       <input
                         type="text"
                         value={settings.profit_secure?.chat_id || ''}
                         onChange={(e) => handleSelectChange('profit_secure.chat_id', e.target.value)}
                         className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       />
                     </div>
                   )}
                </div>
              </div>

              {/* Data Logger */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-purple-400 border-b border-gray-700 pb-2">Data Logger</h3>
                
                <div className="space-y-4">
                  <ToggleButton 
                    checked={settings.data_logger?.enabled || false} 
                    onChange={(value) => handleToggleChange('data_logger.enabled', value)} 
                    label="Enable Data Logger" 
                  />
                  
                  {settings.data_logger?.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ToggleButton 
                        checked={settings.data_logger?.webhook_log || false} 
                        onChange={(value) => handleToggleChange('data_logger.webhook_log', value)} 
                        label="Webhook Log" 
                      />
                      
                      <ToggleButton 
                        checked={settings.data_logger?.mt5_handler_log || false} 
                        onChange={(value) => handleToggleChange('data_logger.mt5_handler_log', value)} 
                        label="MT5 Handler Log" 
                      />
                      
                      <ToggleButton 
                        checked={settings.data_logger?.trade_monitor_log || false} 
                        onChange={(value) => handleToggleChange('data_logger.trade_monitor_log', value)} 
                        label="Trade Monitor Log" 
                      />
                      
                      <ToggleButton 
                        checked={settings.data_logger?.position_manager_log || false} 
                        onChange={(value) => handleToggleChange('data_logger.position_manager_log', value)} 
                        label="Position Manager Log" 
                      />
                      
                      <ToggleButton 
                        checked={settings.data_logger?.message_sender_log || false} 
                        onChange={(value) => handleToggleChange('data_logger.message_sender_log', value)} 
                        label="Message Sender Log" 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 