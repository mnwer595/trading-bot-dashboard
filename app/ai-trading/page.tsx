"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AccountSelector from "../components/AccountSelector";

const API_URL = "https://trading-mnwer-api.space";

type AIModel = {
  enabled: boolean;
  model_name: string;
  prompt_template: string;
  comment_prefix: string;
  temperature: number;
  max_tokens: number;
};

type AISettings = {
  enabled: boolean;
  models: {
    [key: string]: AIModel;
  };
  trading_settings: {
    auto_execute_trades: boolean;
    require_confirmation: boolean;
    max_concurrent_trades: number;
    trade_execution_timeout: number;
  };
  risk_management: {
    max_risk_per_trade: number;
    max_daily_trades: number;
    default_lot_size: number;
    default_sl_pips: number;
    default_tp_pips: number;
  };
  analysis_settings: {
    default_timeframes: string[];
    default_bars_number: number;
    auto_delete_previous_pending: boolean;
    max_analysis_timeout: number;
    retry_failed_analysis: boolean;
    max_retry_attempts: number;
  };
};

type GPTStatus = {
  running: boolean;
  last_cycle?: string;
  cycle_count?: number;
};

type AILog = {
  timestamp: string;
  level: string;
  message: string;
  ai_model?: string;
  symbol?: string;
  account_id?: string;
};

export default function AITradingPage() {
  const [selectedAccount, setSelectedAccount] = useState<string>("test");
  const [gptStatus, setGptStatus] = useState<GPTStatus>({ running: false });
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [aiLogs, setAiLogs] = useState<AILog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [runningCycle, setRunningCycle] = useState(false);

  // Fetch GPT status
  const fetchGPTStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/gpt/status`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const status = await response.json();
      setGptStatus(status);
    } catch (err: any) {
      console.error("Error fetching GPT status:", err);
    }
  };

  // Fetch AI settings for account
  const fetchAISettings = async () => {
    try {
      const response = await fetch(`${API_URL}/getsettings?account_id=${selectedAccount}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      // Parse AI settings from the response
      if (data.ai_settings) {
        setAiSettings(data.ai_settings);
      } else {
        // Create default AI settings if none exist
        const defaultSettings: AISettings = {
          enabled: true,
          models: {
            "gpt-4": {
              enabled: true,
              model_name: "gpt-4-turbo-preview",
              prompt_template: "You are an expert {symbol} trader. Analyze the {timeframes} chart data and provide trading recommendations. Current market conditions: {market_condition}. Additional context: {additional_text}",
              comment_prefix: "AI-GPT4",
              temperature: 0.7,
              max_tokens: 2000
            },
            "gpt-3.5": {
              enabled: true,
              model_name: "gpt-3.5-turbo",
              prompt_template: "You are a professional {symbol} analyst. Review the {timeframes} data and suggest optimal trading opportunities. Market context: {market_condition}. Notes: {additional_text}",
              comment_prefix: "AI-GPT35",
              temperature: 0.7,
              max_tokens: 1500
            },
            "deepseek": {
              enabled: true,
              model_name: "deepseek-chat",
              prompt_template: "Analyze {symbol} using {timeframes} timeframe data. Consider market conditions: {market_condition}. Additional info: {additional_text}",
              comment_prefix: "AI-DEEPSEEK",
              temperature: 0.7,
              max_tokens: 2000
            },
            "gemini": {
              enabled: false,
              model_name: "gemini-1.5-pro",
              prompt_template: "As a {symbol} trading expert, analyze the {timeframes} chart and provide trade suggestions. Market state: {market_condition}. Context: {additional_text}",
              comment_prefix: "AI-GEMINI",
              temperature: 0.7,
              max_tokens: 2000
            }
          },
          trading_settings: {
            auto_execute_trades: false,
            require_confirmation: true,
            max_concurrent_trades: 5,
            trade_execution_timeout: 30
          },
          risk_management: {
            max_risk_per_trade: 2.0,
            max_daily_trades: 10,
            default_lot_size: 0.01,
            default_sl_pips: 50,
            default_tp_pips: 100
          },
          analysis_settings: {
            default_timeframes: ["M5", "H1"],
            default_bars_number: 100,
            auto_delete_previous_pending: true,
            max_analysis_timeout: 60,
            retry_failed_analysis: true,
            max_retry_attempts: 3
          }
        };
        setAiSettings(defaultSettings);
      }
    } catch (err: any) {
      console.error("Error fetching AI settings:", err);
      setError(err.message);
    }
  };

  // Fetch AI logs
  const fetchAILogs = async () => {
    try {
      const response = await fetch(`${API_URL}/gpt/log`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const logs = await response.json();
      setAiLogs(logs.slice(0, 50)); // Show last 50 logs
    } catch (err: any) {
      console.error("Error fetching AI logs:", err);
    }
  };

  // Start GPT trading
  const startGPTTrading = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/gpt/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await fetchGPTStatus();
      setError(null);
    } catch (err: any) {
      console.error("Error starting GPT trading:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Stop GPT trading
  const stopGPTTrading = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/gpt/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await fetchGPTStatus();
      setError(null);
    } catch (err: any) {
      console.error("Error stopping GPT trading:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Run manual cycle for account
  const runManualCycle = async () => {
    try {
      setRunningCycle(true);
      const response = await fetch(`${API_URL}/gpt/cycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: selectedAccount })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await fetchGPTStatus();
      await fetchAILogs(); // Refresh logs after cycle
      setError(null);
    } catch (err: any) {
      console.error("Error running manual cycle:", err);
      setError(err.message);
    } finally {
      setRunningCycle(false);
    }
  };

  // Save AI settings
  const saveAISettings = async () => {
    if (!aiSettings) return;
    
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/savesettings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccount,
          ai_settings: aiSettings
        })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setError(null);
    } catch (err: any) {
      console.error("Error saving AI settings:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Update AI model settings
  const updateAIModel = (modelKey: string, updates: Partial<AIModel>) => {
    if (!aiSettings) return;
    
    setAiSettings({
      ...aiSettings,
      models: {
        ...aiSettings.models,
        [modelKey]: {
          ...aiSettings.models[modelKey],
          ...updates
        }
      }
    });
  };

  // Update trading settings
  const updateTradingSettings = (updates: Partial<AISettings['trading_settings']>) => {
    if (!aiSettings) return;
    
    setAiSettings({
      ...aiSettings,
      trading_settings: {
        ...aiSettings.trading_settings,
        ...updates
      }
    });
  };

  // Update risk management settings
  const updateRiskManagement = (updates: Partial<AISettings['risk_management']>) => {
    if (!aiSettings) return;
    
    setAiSettings({
      ...aiSettings,
      risk_management: {
        ...aiSettings.risk_management,
        ...updates
      }
    });
  };

  // Update analysis settings
  const updateAnalysisSettings = (updates: Partial<AISettings['analysis_settings']>) => {
    if (!aiSettings) return;
    
    setAiSettings({
      ...aiSettings,
      analysis_settings: {
        ...aiSettings.analysis_settings,
        ...updates
      }
    });
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchGPTStatus(),
        fetchAISettings(),
        fetchAILogs()
      ]);
      setLoading(false);
    };
    loadData();
  }, [selectedAccount]);

  const ToggleButton = ({ 
    checked, 
    onChange, 
    label,
    disabled = false
  }: { 
    checked: boolean; 
    onChange: (checked: boolean) => void; 
    label: string;
    disabled?: boolean;
  }) => (
    <div className="flex items-center justify-between">
      <label className="font-medium text-sm text-gray-300">{label}:</label>
      <button
        className={`w-10 h-6 rounded-full flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          checked ? "bg-blue-600" : "bg-gray-600"
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        aria-label={`Toggle ${label}`}
        tabIndex={disabled ? -1 : 0}
        disabled={disabled}
      >
        <span
          className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading AI Trading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-white">AI Trading Dashboard</h1>
              <p className="text-gray-400 mt-1">Manage AI trading models and monitor automated trading</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
              <AccountSelector 
                selectedAccount={selectedAccount}
                onAccountChange={setSelectedAccount}
                className="w-full sm:w-auto"
              />
              <Link
                href="/"
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors text-center w-full sm:w-auto"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-300">Error</h3>
                <div className="mt-2 text-sm text-red-400">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* GPT Status and Controls */}
        <div className="mb-6 bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">GPT Trading System</h3>
                <p className="text-sm text-gray-400">Global AI trading cycle management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${gptStatus.running ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-300">
                {gptStatus.running ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Start/Stop Controls */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-blue-400">System Controls</h4>
              <div className="flex space-x-2">
                <button
                  onClick={startGPTTrading}
                  disabled={saving || gptStatus.running}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span>Start GPT</span>
                </button>
                <button
                  onClick={stopGPTTrading}
                  disabled={saving || !gptStatus.running}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  )}
                  <span>Stop GPT</span>
                </button>
              </div>
            </div>

            {/* Manual Cycle */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-orange-400">Manual Cycle</h4>
              <button
                onClick={runManualCycle}
                disabled={runningCycle}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {runningCycle ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span>{runningCycle ? 'Running...' : 'Run Cycle'}</span>
              </button>
              <p className="text-xs text-gray-400">Run AI analysis for {selectedAccount}</p>
            </div>

            {/* Status Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-purple-400">Status Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`font-medium ${gptStatus.running ? 'text-green-400' : 'text-red-400'}`}>
                    {gptStatus.running ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {gptStatus.last_cycle && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Cycle:</span>
                    <span className="text-gray-300">{new Date(gptStatus.last_cycle).toLocaleTimeString()}</span>
                  </div>
                )}
                {gptStatus.cycle_count && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cycle Count:</span>
                    <span className="text-gray-300">{gptStatus.cycle_count}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Models and Settings */}
        <div className="mb-6 bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">AI Models & Settings</h3>
                <p className="text-sm text-gray-400">Configure AI models for {selectedAccount}</p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              {showSettings ? 'Hide Settings' : 'Show Settings'}
            </button>
          </div>

          {showSettings && aiSettings && (
            <div className="space-y-6">
              {/* AI Models */}
              <div>
                <h4 className="text-md font-medium text-green-400 mb-4">AI Models</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Object.entries(aiSettings.models).map(([modelKey, model]) => (
                    <div key={modelKey} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-white capitalize">{modelKey.replace('-', ' ')}</h5>
                        <ToggleButton
                          checked={model.enabled}
                          onChange={(value) => updateAIModel(modelKey, { enabled: value })}
                          label=""
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Model Name</label>
                          <input
                            type="text"
                            value={model.model_name}
                            onChange={(e) => updateAIModel(modelKey, { model_name: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Comment Prefix</label>
                          <input
                            type="text"
                            value={model.comment_prefix}
                            onChange={(e) => updateAIModel(modelKey, { comment_prefix: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Temperature</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="2"
                              value={model.temperature}
                              onChange={(e) => updateAIModel(modelKey, { temperature: parseFloat(e.target.value) })}
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Max Tokens</label>
                            <input
                              type="number"
                              value={model.max_tokens}
                              onChange={(e) => updateAIModel(modelKey, { max_tokens: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trading Settings */}
              <div>
                <h4 className="text-md font-medium text-blue-400 mb-4">Trading Settings</h4>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ToggleButton
                      checked={aiSettings.trading_settings.auto_execute_trades}
                      onChange={(value) => updateTradingSettings({ auto_execute_trades: value })}
                      label="Auto Execute Trades"
                    />
                    <ToggleButton
                      checked={aiSettings.trading_settings.require_confirmation}
                      onChange={(value) => updateTradingSettings({ require_confirmation: value })}
                      label="Require Confirmation"
                    />
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Max Concurrent Trades</label>
                      <input
                        type="number"
                        value={aiSettings.trading_settings.max_concurrent_trades}
                        onChange={(e) => updateTradingSettings({ max_concurrent_trades: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Execution Timeout (s)</label>
                      <input
                        type="number"
                        value={aiSettings.trading_settings.trade_execution_timeout}
                        onChange={(e) => updateTradingSettings({ trade_execution_timeout: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Management */}
              <div>
                <h4 className="text-md font-medium text-orange-400 mb-4">Risk Management</h4>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Max Risk Per Trade (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={aiSettings.risk_management.max_risk_per_trade}
                        onChange={(e) => updateRiskManagement({ max_risk_per_trade: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Max Daily Trades</label>
                      <input
                        type="number"
                        value={aiSettings.risk_management.max_daily_trades}
                        onChange={(e) => updateRiskManagement({ max_daily_trades: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Default Lot Size</label>
                      <input
                        type="number"
                        step="0.01"
                        value={aiSettings.risk_management.default_lot_size}
                        onChange={(e) => updateRiskManagement({ default_lot_size: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Default SL (Pips)</label>
                      <input
                        type="number"
                        value={aiSettings.risk_management.default_sl_pips}
                        onChange={(e) => updateRiskManagement({ default_sl_pips: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Default TP (Pips)</label>
                      <input
                        type="number"
                        value={aiSettings.risk_management.default_tp_pips}
                        onChange={(e) => updateRiskManagement({ default_tp_pips: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Settings */}
              <div>
                <h4 className="text-md font-medium text-purple-400 mb-4">Analysis Settings</h4>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Default Timeframes</label>
                      <input
                        type="text"
                        value={aiSettings.analysis_settings.default_timeframes.join(', ')}
                        onChange={(e) => updateAnalysisSettings({ default_timeframes: e.target.value.split(', ').map(t => t.trim()) })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        placeholder="M5, H1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Default Bars Number</label>
                      <input
                        type="number"
                        value={aiSettings.analysis_settings.default_bars_number}
                        onChange={(e) => updateAnalysisSettings({ default_bars_number: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Max Analysis Timeout (s)</label>
                      <input
                        type="number"
                        value={aiSettings.analysis_settings.max_analysis_timeout}
                        onChange={(e) => updateAnalysisSettings({ max_analysis_timeout: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Max Retry Attempts</label>
                      <input
                        type="number"
                        value={aiSettings.analysis_settings.max_retry_attempts}
                        onChange={(e) => updateAnalysisSettings({ max_retry_attempts: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <ToggleButton
                        checked={aiSettings.analysis_settings.auto_delete_previous_pending}
                        onChange={(value) => updateAnalysisSettings({ auto_delete_previous_pending: value })}
                        label="Auto Delete Previous Pending"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <ToggleButton
                        checked={aiSettings.analysis_settings.retry_failed_analysis}
                        onChange={(value) => updateAnalysisSettings({ retry_failed_analysis: value })}
                        label="Retry Failed Analysis"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={saveAISettings}
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  )}
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Logs */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">AI Trading Logs</h3>
                <p className="text-sm text-gray-400">Recent AI responses and trading activity</p>
              </div>
            </div>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
            >
              {showLogs ? 'Hide Logs' : 'Show Logs'}
            </button>
          </div>

          {showLogs && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-400">Showing last 50 log entries</p>
                <button
                  onClick={fetchAILogs}
                  className="px-3 py-1 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 text-sm transition-colors"
                >
                  Refresh Logs
                </button>
              </div>
              
              <div className="bg-gray-900 rounded-lg border border-gray-600 max-h-96 overflow-y-auto">
                {aiLogs.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">
                    No logs available
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {aiLogs.map((log, index) => (
                      <div key={index} className="p-4 hover:bg-gray-800 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                log.level === 'INFO' ? 'bg-blue-900 text-blue-300' :
                                log.level === 'WARNING' ? 'bg-yellow-900 text-yellow-300' :
                                log.level === 'ERROR' ? 'bg-red-900 text-red-300' :
                                'bg-gray-700 text-gray-300'
                              }`}>
                                {log.level}
                              </span>
                              {log.ai_model && (
                                <span className="px-2 py-1 text-xs bg-purple-900 text-purple-300 rounded-full">
                                  {log.ai_model}
                                </span>
                              )}
                              {log.symbol && (
                                <span className="px-2 py-1 text-xs bg-green-900 text-green-300 rounded-full">
                                  {log.symbol}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-300">{log.message}</p>
                          </div>
                          <div className="text-xs text-gray-500 ml-4">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

