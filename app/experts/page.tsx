"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "http://198.23.206.54";
const GET_EXPERTS_URL = `${API_URL}/getexperts`;
const SAVE_EXPERTS_URL = `${API_URL}/saveexperts`;

type Expert = {
  name: string;
  lot_size: number;
  enabled: boolean;
  "multi-actions": boolean;
  "multi-tp": boolean;
  volume_keep: number;
  buy_only: boolean;
  tp_enabled: boolean;
  signal_in_same_direction: boolean;
  tp_when_in_profit?: boolean;
  last_signal: string;
};

export default function ExpertsPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [expandedExpert, setExpandedExpert] = useState<string | null>(null);

  useEffect(() => {
    fetchExperts();
  }, []);

  const fetchExperts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(GET_EXPERTS_URL);
      if (!res.ok) throw new Error("Failed to fetch experts");
      const data = await res.json();
      setExperts(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const saveExperts = async (expertsToSave: Expert[]) => {
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    
    try {
      const res = await fetch(SAVE_EXPERTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expertsToSave),
      });
      
      if (!res.ok) throw new Error("Failed to save experts");
      
      setSaveMessage("Experts saved successfully!");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save experts");
    } finally {
      setSaving(false);
    }
  };

  const handleExpertChange = async (expertName: string, field: string, value: any) => {
    const updatedExperts = experts.map(expert => 
      expert.name === expertName 
        ? { ...expert, [field]: value }
        : expert
    );
    
    setExperts(updatedExperts);
    await saveExperts(updatedExperts);
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
      <label className="font-medium text-sm">{label}:</label>
      <button
        className={`w-10 h-5 rounded-full flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          checked ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
        onClick={() => onChange(!checked)}
        aria-label={`Toggle ${label}`}
        tabIndex={0}
      >
        <span
          className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Expert Settings</h1>
          <div className="flex gap-2">
            <Link
              href="/"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Back to Settings
            </Link>
            <button
              onClick={fetchExperts}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
        
        {loading && (
          <div className="flex justify-center items-center h-40">
            <span className="text-lg">Loading experts...</span>
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
        
        {saving && (
          <div className="bg-blue-100 text-blue-700 p-4 rounded mb-4 text-center">
            Saving changes...
          </div>
        )}
        
        {experts.length > 0 && (
          <div className="space-y-4">
            {experts.map((expert) => (
              <div
                key={expert.name}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
              >
                {/* Expert Header */}
                <div className="bg-zinc-50 dark:bg-zinc-800 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{expert.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          expert.enabled 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}>
                          {expert.enabled ? "Active" : "Inactive"}
                        </span>
                        <span className="font-mono">Lot: {expert.lot_size}</span>
                        <span className="font-mono">Last: {expert.last_signal}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    className="px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 transition-colors"
                    onClick={() => setExpandedExpert(expandedExpert === expert.name ? null : expert.name)}
                    aria-expanded={expandedExpert === expert.name}
                    aria-controls={`expert-settings-${expert.name}`}
                    tabIndex={0}
                  >
                    {expandedExpert === expert.name ? "Hide Settings" : "Show Settings"}
                  </button>
                </div>

                {/* Expert Settings */}
                {expandedExpert === expert.name && (
                  <div
                    id={`expert-settings-${expert.name}`}
                    className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Basic Settings */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-blue-600 dark:text-blue-400">Basic Settings</h4>
                        
                        <div>
                          <label className="block font-medium text-sm mb-1">Lot Size:</label>
                          <input
                            type="number"
                            value={expert.lot_size}
                            onChange={(e) => handleExpertChange(expert.name, 'lot_size', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            step="0.01"
                            min="0.01"
                          />
                        </div>
                        
                        <div>
                          <label className="block font-medium text-sm mb-1">Volume Keep:</label>
                          <input
                            type="number"
                            value={expert.volume_keep}
                            onChange={(e) => handleExpertChange(expert.name, 'volume_keep', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        
                        <ToggleButton
                          checked={expert.enabled}
                          onChange={(value) => handleExpertChange(expert.name, 'enabled', value)}
                          label="Enabled"
                        />
                      </div>
                      
                      {/* Trading Options */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-green-600 dark:text-green-400">Trading Options</h4>
                        
                        <ToggleButton
                          checked={expert["multi-actions"]}
                          onChange={(value) => handleExpertChange(expert.name, 'multi-actions', value)}
                          label="Multi Actions"
                        />
                        
                        <ToggleButton
                          checked={expert["multi-tp"]}
                          onChange={(value) => handleExpertChange(expert.name, 'multi-tp', value)}
                          label="Multi TP"
                        />
                        
                        <ToggleButton
                          checked={expert.buy_only}
                          onChange={(value) => handleExpertChange(expert.name, 'buy_only', value)}
                          label="Buy Only"
                        />
                        
                        <ToggleButton
                          checked={expert.tp_enabled}
                          onChange={(value) => handleExpertChange(expert.name, 'tp_enabled', value)}
                          label="TP Enabled"
                        />
                      </div>
                      
                      {/* Signal Settings */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-purple-600 dark:text-purple-400">Signal Settings</h4>
                        
                        <ToggleButton
                          checked={expert.signal_in_same_direction}
                          onChange={(value) => handleExpertChange(expert.name, 'signal_in_same_direction', value)}
                          label="Same Direction"
                        />
                        
                        {expert.tp_when_in_profit !== undefined && (
                          <ToggleButton
                            checked={expert.tp_when_in_profit}
                            onChange={(value) => handleExpertChange(expert.name, 'tp_when_in_profit', value)}
                            label="TP When Profit"
                          />
                        )}
                        
                        <div>
                          <label className="block font-medium text-sm mb-1">Last Signal:</label>
                          <select
                            value={expert.last_signal}
                            onChange={(e) => handleExpertChange(expert.name, 'last_signal', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="buy">Buy</option>
                            <option value="sell">Sell</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {!loading && experts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-zinc-600 dark:text-zinc-400">No experts found.</p>
          </div>
        )}
      </div>
    </div>
  );
} 