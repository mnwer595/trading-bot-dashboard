"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "http://198.23.206.54";

type Account = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

type LogEntry = {
  timestamp: string;
  data: any;
  source: string;
  account_id: string;
};

type LogResponse = {
  status: string;
  account_id: string;
  log_type: string;
  total_logs: number;
  limit: number;
  source_filter?: string;
  logs: LogEntry[];
};



export default function LogMonitoringPage() {
  const [selectedLogTypes, setSelectedLogTypes] = useState<string[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [limit, setLimit] = useState(100);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [sortBy, setSortBy] = useState<"timestamp" | "account_id">("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [availableAccountIds, setAvailableAccountIds] = useState<string[]>([]);
  const [availableLogTypes, setAvailableLogTypes] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");

  // Centralized function to determine log type from log entry
  const getLogType = (log: LogEntry): string => {
    // If log has a logType field, use it
    if ((log as any).logType) {
      return (log as any).logType;
    }
    
    // Check if the log data has a type field
    if (log.data && typeof log.data === 'object' && log.data.type) {
      return log.data.type;
    }
    
    // Infer from source field
    const source = log.source.toLowerCase();
    if (source.includes('webhook')) return 'webhook';
    if (source.includes('trade')) return 'trade';
    if (source.includes('error')) return 'error';
    if (source.includes('system')) return 'system';
    if (source.includes('user')) return 'user';
    if (source.includes('security')) return 'security';
    if (source.includes('mt5')) return 'trade';
    if (source.includes('handler')) return 'system';
    if (source.includes('monitor')) return 'system';
    if (source.includes('position')) return 'trade';
    if (source.includes('order')) return 'trade';
    if (source.includes('signal')) return 'webhook';
    if (source.includes('alert')) return 'system';
    if (source.includes('notification')) return 'system';
    
    // Check log data content for additional clues
    if (log.data && typeof log.data === 'object') {
      const dataStr = JSON.stringify(log.data).toLowerCase();
      if (dataStr.includes('buy') || dataStr.includes('sell') || dataStr.includes('order')) return 'trade';
      if (dataStr.includes('error') || dataStr.includes('exception') || dataStr.includes('failed')) return 'error';
      if (dataStr.includes('login') || dataStr.includes('auth') || dataStr.includes('permission')) return 'security';
      if (dataStr.includes('start') || dataStr.includes('stop') || dataStr.includes('status')) return 'system';
    }
    
    return 'unknown';
  };

  // Function to get appropriate color for log type
  const getLogTypeColor = (logType: string): string => {
    switch (logType.toLowerCase()) {
      case 'webhook': return 'bg-blue-100 text-blue-800';
      case 'trade': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'system': return 'bg-yellow-100 text-yellow-800';
      case 'user': return 'bg-purple-100 text-purple-800';
      case 'security': return 'bg-orange-100 text-orange-800';
      case 'unknown': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/accounts.json');
      if (response.ok) {
        const accountsData: Account[] = await response.json();
        setAccounts(accountsData);
        
        // Set available account IDs from accounts.json
        const accountIds = accountsData.filter(account => account.enabled).map(account => account.id);
        setAvailableAccountIds(accountIds);
        
        // Auto-select all enabled accounts if none selected
        if (selectedAccountIds.length === 0 && accountIds.length > 0) {
          setSelectedAccountIds(accountIds);
        }
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
    }
  };

  const fetchLogs = async (logLimit?: number) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch logs based on selected account
      const url = new URL(`${API_URL}/logs`);
      if (logLimit) {
        url.searchParams.append('limit', logLimit.toString());
      }
      
      // Add account_id parameter if not "all"
      if (selectedAccount !== "all") {
        url.searchParams.append('account_id', selectedAccount);
      }

      console.log("Fetching logs from:", url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LogResponse = await response.json();
      console.log("Logs data:", data);

      if (data.status === 'success') {
        // Sort all logs by timestamp (newest first)
        const allFetchedLogs = data.logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        setAllLogs(allFetchedLogs);
        
        // Extract log types from the data using centralized function
        const logTypes = [...new Set(allFetchedLogs.map(log => getLogType(log)))];
        
        setAvailableLogTypes(logTypes);
        
        // If no log types selected, select all available ones
        if (selectedLogTypes.length === 0 && logTypes.length > 0) {
          setSelectedLogTypes(logTypes);
        }
        
        // Apply current filters
        applyFilters(allFetchedLogs, selectedLogTypes.length > 0 ? selectedLogTypes : logTypes, selectedAccountIds);
      } else {
        throw new Error('Failed to fetch logs');
      }
      
    } catch (err: any) {
      console.error("Error fetching logs:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (logsToFilter: LogEntry[], logTypeFilters: string[], accountIdFilters: string[]) => {
    let filteredLogs = [...logsToFilter];
    
    // Apply log type filtering
    if (logTypeFilters.length > 0) {
      filteredLogs = filteredLogs.filter(log => {
        const logType = getLogType(log);
        return logTypeFilters.includes(logType);
      });
    }
    
    // Apply account ID filtering
    if (accountIdFilters.length > 0) {
      filteredLogs = filteredLogs.filter(log => accountIdFilters.includes(log.account_id));
    }
    
    // Apply sorting
    sortLogs(filteredLogs, sortBy, sortOrder);
  };


  const handleLogTypeToggle = (logType: string) => {
    const newSelectedTypes = selectedLogTypes.includes(logType)
      ? selectedLogTypes.filter(type => type !== logType)
      : [...selectedLogTypes, logType];
    
    setSelectedLogTypes(newSelectedTypes);
    applyFilters(allLogs, newSelectedTypes, selectedAccountIds);
  };

  const handleAccountIdToggle = (accountId: string) => {
    const newSelectedAccountIds = selectedAccountIds.includes(accountId)
      ? selectedAccountIds.filter(id => id !== accountId)
      : [...selectedAccountIds, accountId];
    
    setSelectedAccountIds(newSelectedAccountIds);
    applyFilters(allLogs, selectedLogTypes, newSelectedAccountIds);
  };

  const handleSelectAllLogTypes = () => {
    setSelectedLogTypes(availableLogTypes);
    applyFilters(allLogs, availableLogTypes, selectedAccountIds);
  };

  const handleClearAllLogTypes = () => {
    setSelectedLogTypes([]);
    applyFilters(allLogs, [], selectedAccountIds);
  };

  const handleSelectAllAccountIds = () => {
    setSelectedAccountIds(availableAccountIds);
    applyFilters(allLogs, selectedLogTypes, availableAccountIds);
  };

  const handleClearAllAccountIds = () => {
    setSelectedAccountIds([]);
    applyFilters(allLogs, selectedLogTypes, []);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    fetchLogs(newLimit);
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const handleAccountChange = (accountId: string) => {
    setSelectedAccount(accountId);
    // Reset filters when changing account
    setSelectedLogTypes([]);
    setSelectedAccountIds([]);
    fetchLogs();
  };

  const handleSortChange = (newSortBy: "timestamp" | "account_id") => {
    let newSortOrder = sortOrder;
    
    // If clicking on the same column, toggle the sort order
    if (sortBy === newSortBy) {
      newSortOrder = sortOrder === "asc" ? "desc" : "asc";
    } else {
      // If clicking on a different column, default to desc for timestamp, asc for others
      newSortOrder = newSortBy === "timestamp" ? "desc" : "asc";
    }
    
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    sortLogs(logs, newSortBy, newSortOrder);
  };

  const handleSortOrderChange = (newSortOrder: "asc" | "desc") => {
    setSortOrder(newSortOrder);
    sortLogs(logs, sortBy, newSortOrder);
  };

  const sortLogs = (logsToSort: LogEntry[], sortField: "timestamp" | "account_id", order: "asc" | "desc") => {
    const sorted = [...logsToSort].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === "timestamp") {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortField === "account_id") {
        comparison = a.account_id.localeCompare(b.account_id);
      }
      
      return order === "asc" ? comparison : -comparison;
    });
    
    setLogs(sorted);
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatLogData = (data: any) => {
    if (typeof data === 'object' && data !== null) {
      return Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }
    return String(data);
  };

  useEffect(() => {
    fetchAccounts();
    fetchLogs();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs();
      }, refreshInterval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, refreshInterval, selectedAccount]);

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-white">Log Monitoring</h1>
            <p className="text-gray-400 mt-1">Monitor system logs in real-time with advanced filtering</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link 
              href="/" 
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Back to Dashboard
            </Link>
            <button 
              onClick={handleRefresh} 
              disabled={loading} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors flex items-center space-x-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{loading ? "Loading..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          {/* Account Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Account:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAccountChange("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  selectedAccount === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                All Accounts
              </button>
              {accounts.filter(account => account.enabled).map(account => (
                <button
                  key={account.id}
                  onClick={() => handleAccountChange(account.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    selectedAccount === account.id
                      ? "bg-green-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {account.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
            {/* Log Types Multi-Select */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Log Types:</span>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSelectAllLogTypes}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearAllLogTypes}
                    className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableLogTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => handleLogTypeToggle(type)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedLogTypes.includes(type)
                        ? "bg-blue-600 text-white"
                        : `${getLogTypeColor(type)} hover:opacity-80`
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Account IDs Multi-Select */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Account IDs:</span>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSelectAllAccountIds}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleClearAllAccountIds}
                    className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableAccountIds.map(accountId => (
                  <button
                    key={accountId}
                    onClick={() => handleAccountIdToggle(accountId)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedAccountIds.includes(accountId)
                        ? "bg-orange-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {accountId}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Other Controls */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-700">
            {/* Limit Combo Box */}
            <div className="relative">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-300">Limit:</span>
                <div className="relative">
                  <select
                    value={limit}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                    className="appearance-none bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Auto Refresh Combo Box */}
            <div className="relative">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-300">Auto Refresh:</span>
                <button
                  onClick={toggleAutoRefresh}
                  className={`w-10 h-6 rounded-full flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    autoRefresh ? "bg-blue-600" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                      autoRefresh ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
                {autoRefresh && (
                  <div className="relative">
                    <select
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(Number(e.target.value))}
                      className="appearance-none bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 pr-6 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                    >
                      <option value={3000}>3s</option>
                      <option value={5000}>5s</option>
                      <option value={10000}>10s</option>
                      <option value={30000}>30s</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>



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
                <h3 className="text-sm font-medium text-red-300">Error loading logs</h3>
                <div className="mt-2 text-sm text-red-400">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
             <h3 className="text-lg font-semibold text-white">
               {selectedLogTypes.length === 0 
                 ? "No Log Types Selected" 
                 : selectedLogTypes.length === 1
                   ? selectedLogTypes[0].charAt(0).toUpperCase() + selectedLogTypes[0].slice(1) + " Logs"
                   : `${selectedLogTypes.length} Log Types`
               }
               {selectedAccount !== "all" && (
                 <span className="ml-2 text-sm font-normal text-gray-400">
                   for {accounts.find(acc => acc.id === selectedAccount)?.name || selectedAccount}
                 </span>
               )}
             </h3>
             <p className="text-sm text-gray-400 mt-1">
               Showing {logs.length} logs
               {selectedLogTypes.length > 0 && ` from ${selectedLogTypes.length} type(s)`}
               {selectedAccountIds.length > 0 && ` filtered by ${selectedAccountIds.length} account(s)`}
             </p>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-400">Loading logs...</p>
            </div>
          ) : logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => handleSortChange("timestamp")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Timestamp</span>
                        <div className="flex flex-col">
                          <svg 
                            className={`w-3 h-3 ${sortBy === "timestamp" && sortOrder === "asc" ? "text-blue-400" : "text-gray-500"}`} 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          <svg 
                            className={`w-3 h-3 -mt-1 ${sortBy === "timestamp" && sortOrder === "desc" ? "text-blue-400" : "text-gray-500"}`} 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => handleSortChange("account_id")}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Account ID</span>
                        <div className="flex flex-col">
                          <svg 
                            className={`w-3 h-3 ${sortBy === "account_id" && sortOrder === "asc" ? "text-blue-400" : "text-gray-500"}`} 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          <svg 
                            className={`w-3 h-3 -mt-1 ${sortBy === "account_id" && sortOrder === "desc" ? "text-blue-400" : "text-gray-500"}`} 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {logs.map((log, index) => {
                    // Get log type from the log entry using centralized function
                    const logType = getLogType(log);
                    
                    return (
                      <tr key={`${log.timestamp}-${index}`} className="hover:bg-gray-750">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {log.account_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLogTypeColor(logType)}`}>
                            {logType.charAt(0).toUpperCase() + logType.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          <div className="max-w-md">
                            <pre className="whitespace-pre-wrap break-words text-xs bg-gray-700 p-2 rounded">
                              {formatLogData(log.data)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-300">No logs found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedLogTypes.length === 0 
                  ? "Please select at least one log type" 
                  : "No logs available for the selected filters"
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
