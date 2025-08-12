"use client";

import { useState } from "react";

const API_URL = "https://198.23.206.54";

export default function TestPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, success: boolean, data: any, error?: string) => {
    setResults(prev => [...prev, {
      test,
      success,
      data,
      error,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testAPI = async (endpoint: string, method: string = 'GET', body?: any) => {
    setLoading(true);
    try {
      console.log(`Testing ${method} ${endpoint}`);
      
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_URL}${endpoint}`, options);
      
      console.log(`Response status: ${response.status}`);
      console.log(`Response headers:`, response.headers);
      
      if (response.ok) {
        const data = await response.json();
        addResult(`${method} ${endpoint}`, true, data);
      } else {
        const errorText = await response.text();
        addResult(`${method} ${endpoint}`, false, null, `${response.status}: ${errorText}`);
      }
    } catch (error: any) {
      console.error(`Error testing ${endpoint}:`, error);
      addResult(`${method} ${endpoint}`, false, null, error.message);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    
    // Test basic connectivity
    await testAPI('/getsettings');
    await testAPI('/getexperts');
    
    // Test with different headers
    await testAPI('/getsettings');
    
    // Test POST endpoints
    await testAPI('/savesettings', 'POST', {
      auto_trade: false,
      channel_listener: true,
      webhook_enabled: true,
      risk_percentage: 10,
      lot_size: 0.01,
      default_sl_pips: 60,
      risk_reward_ratio: 2,
      trading_hours: { start: 1, end: 23 },
      algo_trading: { enabled: false, interval_minutes: 1 },
      hft_trading: { enabled: false },
      trade_secure: { enabled: true }
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">API Connection Test</h1>
        
        <div className="mb-6">
          <button
            onClick={runAllTests}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Testing..." : "Run All Tests"}
          </button>
          
          <button
            onClick={() => setResults([])}
            className="ml-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Clear Results
          </button>
        </div>

        <div className="space-y-4">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                result.success 
                  ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" 
                  : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{result.test}</h3>
                <span className="text-sm text-gray-500">{result.timestamp}</span>
              </div>
              
              <div className="text-sm">
                {result.success ? (
                  <div>
                    <span className="text-green-600 dark:text-green-400">✓ Success</span>
                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <span className="text-red-600 dark:text-red-400">✗ Failed</span>
                    <p className="mt-1 text-red-700 dark:text-red-300">{result.error}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {results.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No test results yet. Click "Run All Tests" to start.
          </div>
        )}
      </div>
    </div>
  );
}
