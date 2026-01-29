"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "https://trading-mnwer-api.space";
const GET_SETTINGS_URL = `${API_URL}/getsettings`;

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

export default function Home() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      console.log("Fetching settings from:", GET_SETTINGS_URL);
      
      const response = await fetch(GET_SETTINGS_URL, {
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
    } catch (err: any) {
      console.error("Error fetching settings:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Trading Bot Dashboard</h1>
          <p className="text-xl text-gray-400">Monitor and control your trading operations</p>
        </div>

        {/* Status Card */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${loading ? 'bg-yellow-400' : error ? 'bg-red-400' : 'bg-green-400'}`}></div>
              <div>
                <h2 className="text-lg font-semibold text-white">Bot Status</h2>
                <p className="text-sm text-gray-400">
                  {loading ? 'Connecting...' : error ? 'Connection Error' : 'Connected'}
                </p>
              </div>
            </div>
            {settings && (
              <div className="text-center sm:text-right">
                <p className="text-sm text-gray-400">Auto Trade</p>
                <p className={`text-lg font-semibold ${settings.auto_trade ? 'text-green-400' : 'text-red-400'}`}>
                  {settings.auto_trade ? 'ON' : 'OFF'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-300">Connection Error</h3>
                <div className="mt-2 text-sm text-red-400">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {/* General Settings Card */}
          <Link href="/settings" className="group">
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-gray-600">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">General Settings</h3>
              <p className="text-gray-400">Configure trading parameters, risk management, and bot behavior</p>
            </div>
          </Link>

          {/* Symbol Settings Card */}
          <Link href="/symbols" className="group">
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-gray-600">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Symbol Settings</h3>
              <p className="text-gray-400">Configure individual symbol parameters and trading rules</p>
            </div>
          </Link>

          {/* Experts Card */}
          <Link href="/experts" className="group">
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-gray-600">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Manage Experts</h3>
              <p className="text-gray-400">Configure and monitor expert advisors and trading strategies</p>
            </div>
          </Link>

          {/* Open Positions Card */}
          <Link href="/positions" className="group">
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-gray-600">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-orange-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Open Positions</h3>
              <p className="text-gray-400">Monitor active trading positions and real-time profit/loss</p>
            </div>
          </Link>

          {/* Closed Positions Card */}
          <Link href="/closed-positions" className="group">
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-gray-600">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-indigo-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Closed Positions</h3>
              <p className="text-gray-400">View trading history with advanced filtering and analysis</p>
            </div>
          </Link>

          {/* AI Trading Card */}
          <Link href="/ai-trading" className="group">
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-gray-600">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-cyan-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AI Trading</h3>
              <p className="text-gray-400">Manage AI trading models and monitor automated trading</p>
            </div>
          </Link>

          {/* Log Monitoring Card */}
          <Link href="/logs" className="group">
            <div className="bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-700 hover:border-gray-600">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Log Monitoring</h3>
              <p className="text-gray-400">Monitor system logs in real-time with advanced filtering</p>
            </div>
          </Link>
        </div>

        {/* Quick Stats */}
        {settings && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
              <div className="text-sm font-medium text-gray-400">Risk Percentage</div>
              <div className="text-2xl font-bold text-white">{settings.risk_percentage}%</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
              <div className="text-sm font-medium text-gray-400">Lot Size</div>
              <div className="text-2xl font-bold text-white">{settings.lot_size}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
              <div className="text-sm font-medium text-gray-400">Default SL (Pips)</div>
              <div className="text-2xl font-bold text-white">{settings.default_sl_pips}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
              <div className="text-sm font-medium text-gray-400">Risk/Reward Ratio</div>
              <div className="text-2xl font-bold text-white">{settings.risk_reward_ratio}:1</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
