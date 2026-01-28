"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "https://144.91.88.10";

type ClosedPosition = {
  ticket: number;
  deal_ticket: number;
  symbol: string;
  type: "Buy" | "Sell";
  volume: number;
  price_open: number | null;
  price_close: number | null;
  profit: number | null;
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

  // Get unique symbols and comments for filter dropdowns
  const uniqueSymbols = Array.from(new Set(positions.map(pos => pos.symbol))).sort();
  const uniqueComments = Array.from(new Set(positions.map(pos => pos.comment).filter(comment => comment))).sort();

  const handleLastWeekShortcut = () => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setStartDate(formatDate(lastWeek));
    setEndDate(formatDate(today));
  };

  const handleTodayShortcut = () => {
    const today = new Date();
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setStartDate(formatDate(today));
    setEndDate(formatDate(today));
  };

  const handleThisMonthShortcut = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    setStartDate(formatDate(firstDayOfMonth));
    setEndDate(formatDate(today));
  };

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
          aValue = a.profit ?? 0;
          bValue = b.profit ?? 0;
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

  const getProfitColor = (profit: number | null) => {
    if (profit == null) return "text-gray-400";
    return profit >= 0 ? "text-green-400" : "text-red-400";
  };

  const getTypeColor = (type: string) => {
    return type === "Buy" ? "text-green-400" : "text-red-400";
  };

  // Calculate statistics by comment
  const getStatsByComment = () => {
    const statsByComment: {
      [key: string]: {
        totalTrades: number;
        winningTrades: number;
        losingTrades: number;
        totalProfit: number;
        totalGain: number;
        totalLoss: number;
        winRate: number;
        avgProfit: number;
      };
    } = {};

    filteredAndSortedPositions.forEach(position => {
      const comment = position.comment || "No Comment";
      
      if (!statsByComment[comment]) {
        statsByComment[comment] = {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          totalProfit: 0,
          totalGain: 0,
          totalLoss: 0,
          winRate: 0,
          avgProfit: 0,
        };
      }

      statsByComment[comment].totalTrades++;
      const profit = position.profit || 0;
      statsByComment[comment].totalProfit += profit;
      
      if (profit > 0) {
        statsByComment[comment].winningTrades++;
        statsByComment[comment].totalGain += profit;
      } else if (profit < 0) {
        statsByComment[comment].losingTrades++;
        statsByComment[comment].totalLoss += profit;
      }
    });

    // Calculate win rate and average profit
    Object.keys(statsByComment).forEach(comment => {
      const stats = statsByComment[comment];
      stats.winRate = stats.totalTrades > 0 
        ? (stats.winningTrades / stats.totalTrades) * 100 
        : 0;
      stats.avgProfit = stats.totalTrades > 0 
        ? stats.totalProfit / stats.totalTrades 
        : 0;
    });

    return statsByComment;
  };

  const statsByComment = getStatsByComment();

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Closed Positions History</h1>
          <p className="text-xl text-gray-400">View and analyze your trading history</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
            <div className="text-sm font-medium text-gray-400">Total Positions</div>
            <div className="text-2xl font-bold text-white">{filteredAndSortedPositions.length}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
            <div className="text-sm font-medium text-gray-400">Net Profit/Loss</div>
            <div className={`text-2xl font-bold ${getProfitColor(filteredAndSortedPositions.reduce((sum, pos) => sum + (pos.profit || 0), 0))}`}>
              {formatCurrency(filteredAndSortedPositions.reduce((sum, pos) => sum + (pos.profit || 0), 0))}
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
            <div className="text-sm font-medium text-gray-400">Total Profit</div>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(
                filteredAndSortedPositions
                  .filter(pos => pos.profit != null && pos.profit > 0)
                  .reduce((sum, pos) => sum + (pos.profit || 0), 0)
              )}
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
            <div className="text-sm font-medium text-gray-400">Total Loss</div>
            <div className="text-2xl font-bold text-red-400">
              {formatCurrency(
                filteredAndSortedPositions
                  .filter(pos => pos.profit != null && pos.profit < 0)
                  .reduce((sum, pos) => sum + (pos.profit || 0), 0)
              )}
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
            <div className="text-sm font-medium text-gray-400">Winning Trades</div>
            <div className="text-2xl font-bold text-green-400">
              {filteredAndSortedPositions.filter(pos => pos.profit != null && pos.profit > 0).length}
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
            <div className="text-sm font-medium text-gray-400">Losing Trades</div>
            <div className="text-2xl font-bold text-red-400">
              {filteredAndSortedPositions.filter(pos => pos.profit != null && pos.profit < 0).length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Filters</h2>
          
          {/* Date Shortcuts */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Quick Date Selection</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleTodayShortcut}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Today
              </button>
              <button
                onClick={handleLastWeekShortcut}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Last Week
              </button>
              <button
                onClick={handleThisMonthShortcut}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                This Month
              </button>
            </div>
          </div>

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
              <select
                value={commentFilter}
                onChange={(e) => setCommentFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Comments</option>
                {uniqueComments.map(comment => (
                  <option key={comment} value={comment}>{comment}</option>
                ))}
              </select>
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

        {/* Statistics by Comment */}
        {filteredAndSortedPositions.length > 0 && Object.keys(statsByComment).length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Statistics by Comment</h2>
            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Comment
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Total Trades
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Winning
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Losing
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Win Rate
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Total Gain
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Total Loss
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Net Profit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Avg Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {Object.entries(statsByComment)
                      .sort((a, b) => b[1].totalProfit - a[1].totalProfit)
                      .map(([comment, stats]) => (
                        <tr key={comment} className="hover:bg-gray-700 transition-colors duration-150">
                          <td className="px-4 py-4 text-sm font-medium text-white">
                            {comment}
                          </td>
                          <td className="px-4 py-4 text-sm text-center text-gray-300">
                            {stats.totalTrades}
                          </td>
                          <td className="px-4 py-4 text-sm text-center">
                            <span className="text-green-400 font-medium">
                              {stats.winningTrades}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-center">
                            <span className="text-red-400 font-medium">
                              {stats.losingTrades}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-center">
                            <span className={`font-medium ${stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                              {stats.winRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-right">
                            <span className="font-medium text-green-400">
                              {formatCurrency(stats.totalGain)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-right">
                            <span className="font-medium text-red-400">
                              {formatCurrency(stats.totalLoss)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-right">
                            <span className={`font-medium ${getProfitColor(stats.totalProfit)}`}>
                              {formatCurrency(stats.totalProfit)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-right">
                            <span className={`font-medium ${getProfitColor(stats.avgProfit)}`}>
                              {formatCurrency(stats.avgProfit)}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot className="bg-gray-700">
                    <tr>
                      <td className="px-4 py-4 text-sm font-bold text-white">
                        TOTAL
                      </td>
                      <td className="px-4 py-4 text-sm text-center font-bold text-white">
                        {filteredAndSortedPositions.length}
                      </td>
                      <td className="px-4 py-4 text-sm text-center font-bold text-green-400">
                        {filteredAndSortedPositions.filter(pos => pos.profit != null && pos.profit > 0).length}
                      </td>
                      <td className="px-4 py-4 text-sm text-center font-bold text-red-400">
                        {filteredAndSortedPositions.filter(pos => pos.profit != null && pos.profit < 0).length}
                      </td>
                      <td className="px-4 py-4 text-sm text-center font-bold text-white">
                        {filteredAndSortedPositions.length > 0
                          ? ((filteredAndSortedPositions.filter(pos => pos.profit != null && pos.profit > 0).length / 
                             filteredAndSortedPositions.length) * 100).toFixed(1)
                          : 0}%
                      </td>
                      <td className="px-4 py-4 text-sm text-right">
                        <span className="font-bold text-green-400">
                          {formatCurrency(
                            filteredAndSortedPositions
                              .filter(pos => pos.profit != null && pos.profit > 0)
                              .reduce((sum, pos) => sum + (pos.profit || 0), 0)
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-right">
                        <span className="font-bold text-red-400">
                          {formatCurrency(
                            filteredAndSortedPositions
                              .filter(pos => pos.profit != null && pos.profit < 0)
                              .reduce((sum, pos) => sum + (pos.profit || 0), 0)
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-right">
                        <span className={`font-bold ${getProfitColor(filteredAndSortedPositions.reduce((sum, pos) => sum + (pos.profit || 0), 0))}`}>
                          {formatCurrency(filteredAndSortedPositions.reduce((sum, pos) => sum + (pos.profit || 0), 0))}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-right">
                        <span className={`font-bold ${getProfitColor(
                          filteredAndSortedPositions.length > 0 
                            ? filteredAndSortedPositions.reduce((sum, pos) => sum + (pos.profit || 0), 0) / filteredAndSortedPositions.length
                            : 0
                        )}`}>
                          {formatCurrency(
                            filteredAndSortedPositions.length > 0 
                              ? filteredAndSortedPositions.reduce((sum, pos) => sum + (pos.profit || 0), 0) / filteredAndSortedPositions.length
                              : 0
                          )}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

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
                        {position.price_open != null ? position.price_open.toFixed(5) : "N/A"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                        {position.price_close != null ? position.price_close.toFixed(5) : "N/A"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={getProfitColor(position.profit)}>
                          {position.profit != null ? formatCurrency(position.profit) : "N/A"}
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
      </div>
    </div>
  );
}
