"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "http://198.23.206.54";

type ClosedPosition = {
  ticket: number;
  deal_ticket: number;
  symbol: string;
  type: "Buy" | "Sell";
  volume: number;
  price_open: number;
  price_close: number;
  profit: number;
  comment: string;
  time: string;
  time_msc: number;
};

type ClosedPositionsResponse = {
  status: string;
  account_id: string;
  start_date: string;
  end_date: string;
  total_positions: number;
  positions: ClosedPosition[];
};

type SortField = "time" | "symbol" | "profit" | "volume" | "comment";
type SortDirection = "asc" | "desc";

export default function ClosedPositionsPage() {
  const [positions, setPositions] = useState<ClosedPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPositions, setTotalPositions] = useState(0);
  
  // Filter states
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2025-01-31");
  const [symbolFilter, setSymbolFilter] = useState("");
  const [commentFilter, setCommentFilter] = useState("");
  
  // Sort states
  const [sortField, setSortField] = useState<SortField>("time");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Get unique symbols for filter dropdown
  const uniqueSymbols = Array.from(new Set(positions.map(pos => pos.symbol))).sort();

  const fetchClosedPositions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const startDateTime = `${startDate}T00:00:00`;
      const endDateTime = `${endDate}T23:59:59`;
      
      const url = `${API_URL}/closed_positions?account_id=test&start_date=${startDateTime}&end_date=${endDateTime}`;
      
      console.log("Fetching closed positions from:", url);
      
      const response = await fetch(url, {
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

      const data: ClosedPositionsResponse = await response.json();
      console.log("Closed positions data:", data);
      
      setPositions(data.positions);
      setTotalPositions(data.total_positions);
    } catch (err: any) {
      console.error("Error fetching closed positions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosedPositions();
  }, []);

  // Filter and sort positions
  const filteredAndSortedPositions = positions
    .filter(position => {
      const matchesSymbol = !symbolFilter || position.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
      const matchesComment = !commentFilter || position.comment.toLowerCase().includes(commentFilter.toLowerCase());
      return matchesSymbol && matchesComment;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case "time":
          aValue = new Date(a.time).getTime();
          bValue = new Date(b.time).getTime();
          break;
        case "symbol":
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case "profit":
          aValue = a.profit;
          bValue = b.profit;
          break;
        case "volume":
          aValue = a.volume;
          bValue = b.volume;
          break;
        case "comment":
          aValue = a.comment;
          bValue = b.comment;
          break;
        default:
          aValue = new Date(a.time).getTime();
          bValue = new Date(b.time).getTime();
      }
      
      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleSearch = () => {
    fetchClosedPositions();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getProfitColor = (profit: number) => {
    return profit >= 0 ? "text-green-400" : "text-red-400";
  };

  const getTypeColor = (type: string) => {
    return type === "Buy" ? "text-green-400" : "text-red-400";
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Closed Positions History</h1>
            <p className="text-xl text-gray-400">View and analyze your trading history</p>
          </div>
          <div className="text-right mt-4 sm:mt-0">
            <div className="text-2xl font-bold text-white">{totalPositions}</div>
            <div className="text-sm text-gray-400">Total Positions</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Symbol Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
              <select
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Symbols</option>
                {uniqueSymbols.map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
            </div>

            {/* Comment Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Comment</label>
              <input
                type="text"
                value={commentFilter}
                onChange={(e) => setCommentFilter(e.target.value)}
                placeholder="Filter by comment..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {loading ? "Loading..." : "Search"}
              </button>
            </div>
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

        {/* Positions Table */}
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort("time")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Time</span>
                      {sortField === "time" && (
                        <span className="text-blue-400">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort("symbol")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Symbol</span>
                      {sortField === "symbol" && (
                        <span className="text-blue-400">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort("volume")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Volume</span>
                      {sortField === "volume" && (
                        <span className="text-blue-400">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Open Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Close Price</th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort("profit")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Profit</span>
                      {sortField === "profit" && (
                        <span className="text-blue-400">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort("comment")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Comment</span>
                      {sortField === "comment" && (
                        <span className="text-blue-400">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                        <span>Loading positions...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedPositions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No closed positions found for the selected criteria
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedPositions.map((position) => (
                    <tr key={position.ticket} className="hover:bg-gray-700 transition-colors duration-150">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(position.time)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {position.symbol}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={`px-2 py-1 rounded-full text-xs ${getTypeColor(position.type)}`}>
                          {position.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {position.volume}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {position.price_open.toFixed(5)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {position.price_close.toFixed(5)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={getProfitColor(position.profit)}>
                          {formatCurrency(position.profit)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300 max-w-xs truncate">
                        {position.comment}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        {filteredAndSortedPositions.length > 0 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
              <div className="text-sm font-medium text-gray-400">Total Positions</div>
              <div className="text-2xl font-bold text-white">{filteredAndSortedPositions.length}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
              <div className="text-sm font-medium text-gray-400">Total Profit</div>
              <div className={`text-2xl font-bold ${getProfitColor(filteredAndSortedPositions.reduce((sum, pos) => sum + pos.profit, 0))}`}>
                {formatCurrency(filteredAndSortedPositions.reduce((sum, pos) => sum + pos.profit, 0))}
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
              <div className="text-sm font-medium text-gray-400">Winning Trades</div>
              <div className="text-2xl font-bold text-green-400">
                {filteredAndSortedPositions.filter(pos => pos.profit > 0).length}
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
              <div className="text-sm font-medium text-gray-400">Losing Trades</div>
              <div className="text-2xl font-bold text-red-400">
                {filteredAndSortedPositions.filter(pos => pos.profit < 0).length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
