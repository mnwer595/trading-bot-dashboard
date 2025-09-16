"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AccountSelector from "../components/AccountSelector";

const API_URL = "http://198.23.206.54";
const GET_POSITIONS_URL = `${API_URL}/getpositions`;
const SAVE_POSITIONS_URL = `${API_URL}/savepositions`;
const SYNC_POSITIONS_URL = `${API_URL}/syncpositions`;

const CLOSE_POSITION_URL = `${API_URL}/close`;

type Position = {
  ticket: number;
  symbol: string;
  type: "buy" | "sell";
  volume: number;
  price_open: number;
  price_current: number;
  profit: number;
  swap?: number;
  open_time?: string;
  magic?: number;
  comment?: string;
  sl: number;
  tp: number;
  
  // Legacy fields (for compatibility)
  lock_profit_points: number;
  profit_secure_start_points: number;
  profit_lock_start_points: number;
  profit_lock_distance: number;
  
  // New fields from API
  profit_secure_enabled: boolean;
  profit_lock_enabled: boolean;
  profit_lock_start_pips: number;
  profit_lock_distance_pips: number;
  sl_trailing_enabled: boolean;
  sl_trailing_start_pips: number;
  sl_trailing_distance_pips: number;
  
  last_updated: string;
  created_at: string;
};


type ClosePositionData = {
  ticket: number;
  volume: number;
  comment: string;
};

export default function PositionsPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [saving, setSaving] = useState<{ [ticket: number]: boolean }>({});
  const [expandedPositions, setExpandedPositions] = useState<Set<number>>(new Set());
  const [closing, setClosing] = useState(false);
  const [closeMessage, setCloseMessage] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{ [key: string]: string }>({});
  const [applyingDefaults, setApplyingDefaults] = useState<{ [ticket: number]: boolean }>({});
  const [symbolSettings, setSymbolSettings] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("test");
  const [showTradingSection, setShowTradingSection] = useState(false);
  const [tradingOrders, setTradingOrders] = useState<{ [symbol: string]: { orderType: 'buy' | 'sell', volume: string } }>({});
  const [placingTrade, setPlacingTrade] = useState<{ [symbol: string]: boolean }>({});
  const [accountSettings, setAccountSettings] = useState<any>(null);
  const [updatingTradeMonitoring, setUpdatingTradeMonitoring] = useState(false);

  const getInputValue = (ticket: number, field: string, defaultValue: number): string => {
    const key = `${ticket}-${field}`;
    return editingValues[key] !== undefined ? editingValues[key] : defaultValue.toString();
  };

  const handleInputChange = (ticket: number, field: string, value: string) => {
    const key = `${ticket}-${field}`;
    setEditingValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleInputBlur = (ticket: number, field: string, value: string) => {
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 0) {
      if (field.includes('profit_lock')) {
        handleProfitLockChange(ticket, field as any, numValue);
      } else if (field.includes('sl_trailing')) {
        handleSLTrailingChange(ticket, field as any, numValue);
      }
    }
    // Clear the editing value
    const key = `${ticket}-${field}`;
    setEditingValues(prev => {
      const newValues = { ...prev };
      delete newValues[key];
      return newValues;
    });
  };

  const applyDefaultSettings = async (ticket: number) => {
    try {
      setApplyingDefaults(prev => ({ ...prev, [ticket]: true }));
      
      // Find the current position
      const currentPosition = positions.find(p => p.ticket === ticket);
      if (!currentPosition) {
        throw new Error(`Position with ticket ${ticket} not found`);
      }

      // Fetch symbol settings to get defaults for this symbol
      const url = new URL(`${API_URL}/getsymbols`);
      url.searchParams.append('account_id', selectedAccount);
      
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

      const symbolSettings = await response.json();
      
      // Find the symbol settings for this position's symbol
      const symbolConfig = symbolSettings.find((s: any) => s.symbol === currentPosition.symbol);
      if (!symbolConfig) {
        throw new Error(`Symbol settings for ${currentPosition.symbol} not found`);
      }

      console.log(`Applying default settings from symbol ${currentPosition.symbol} to ticket ${ticket}:`, symbolConfig);

      // Create updated position with default settings from symbol
      const updatedPosition: Position = {
        ...currentPosition,
        profit_secure_enabled: symbolConfig.profit_secure_enabled,
        profit_lock_enabled: symbolConfig.profit_lock_enabled,
        profit_lock_start_pips: symbolConfig.profit_lock_start_pips,
        profit_lock_distance_pips: symbolConfig.profit_lock_distance_pips,
        sl_trailing_enabled: symbolConfig.sl_trailing_enabled,
        sl_trailing_start_pips: symbolConfig.sl_trailing_start_pips,
        sl_trailing_distance_pips: symbolConfig.sl_trailing_distance_pips,
        sl: symbolConfig.default_sl_pips || currentPosition.sl, // Use default_sl_pips if available
      };

      // Save the updated position
      await savePositionOptions(updatedPosition);
      
      // Refresh positions to show updated data
      await fetchPositions();
      
    } catch (err: any) {
      console.error(`Error applying default settings to ticket ${ticket}:`, err);
      setError(`Failed to apply default settings: ${err.message}`);
    } finally {
      setApplyingDefaults(prev => ({ ...prev, [ticket]: false }));
    }
  };

  const fetchSymbolSettings = async () => {
    try {
      console.log("Fetching symbol settings...");
      
      const url = new URL(`${API_URL}/getsymbols`);
      url.searchParams.append('account_id', selectedAccount);
      
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

      const data = await response.json();
      console.log("Symbol settings data:", data);
      
      // Debug: Check if XAUUSDm config is found
      const xauConfig = data.find((s: any) => s.symbol === 'XAUUSDm');
      console.log("XAUUSDm config:", xauConfig);
      
      setSymbolSettings(data);
    } catch (err: any) {
      console.error("Error fetching symbol settings:", err);
      // Don't set error state for symbol settings as it's not critical
    }
  };

  const fetchAccountSettings = async () => {
    if (!selectedAccount) {
      console.log("No account selected, skipping account settings fetch");
      return;
    }

    try {
      console.log("Fetching account settings for account:", selectedAccount);
      
      const url = new URL(`${API_URL}/getsettings`);
      url.searchParams.append('account_id', selectedAccount);
      
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

      const data = await response.json();
      console.log("Account settings data:", data);
      
      setAccountSettings(data);
    } catch (err: any) {
      console.error("Error fetching account settings:", err);
      // Don't set error state for account settings as it's not critical
    }
  };

  const syncPositions = async () => {
    try {
      console.log("Syncing positions with MT5...");
      
      const url = new URL(SYNC_POSITIONS_URL);
      url.searchParams.append('account_id', selectedAccount);
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Sync response:", result);
      
      return result;
    } catch (err: any) {
      console.error("Error syncing positions:", err);
      throw err;
    }
  };

  const fetchPositions = async () => {
    try {
      const url = new URL(GET_POSITIONS_URL);
      url.searchParams.append('account_id', selectedAccount);
      
      console.log("Fetching positions from:", url.toString());
      
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
      console.log("Positions data:", data);
      
      // Handle different possible response formats
      const positionsData = Array.isArray(data) ? data : data.positions || data.data || [];
      
      // Check if any positions are missing SL trailing fields
      const hasMissingSLTrailing = positionsData.some((pos: any) => 
        pos.sl_trailing_enabled === undefined || 
        pos.sl_trailing_start_pips === undefined || 
        pos.sl_trailing_distance_pips === undefined
      );
      
      if (hasMissingSLTrailing) {
        console.log("Detected positions with missing SL trailing fields, syncing...");
        try {
          await syncPositions();
          // Fetch positions again after sync
          const syncResponse = await fetch(GET_POSITIONS_URL, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            mode: 'cors',
          });
          
          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            const syncPositionsData = Array.isArray(syncData) ? syncData : syncData.positions || syncData.data || [];
            console.log("Positions data after sync:", syncPositionsData);
            
            // Use the synced data
            const processedPositions = syncPositionsData.map((pos: any) => ({
              ...pos,
              // Ensure boolean fields are properly typed with defaults for missing fields
              sl_trailing_enabled: pos.sl_trailing_enabled !== undefined ? Boolean(pos.sl_trailing_enabled) : false,
              profit_secure_enabled: pos.profit_secure_enabled !== undefined ? Boolean(pos.profit_secure_enabled) : false,
              profit_lock_enabled: pos.profit_lock_enabled !== undefined ? Boolean(pos.profit_lock_enabled) : false,
              // Ensure numeric fields are properly typed with defaults for missing fields
              sl_trailing_start_pips: pos.sl_trailing_start_pips !== undefined ? Number(pos.sl_trailing_start_pips) : 0,
              sl_trailing_distance_pips: pos.sl_trailing_distance_pips !== undefined ? Number(pos.sl_trailing_distance_pips) : 10,
              profit_lock_start_pips: pos.profit_lock_start_pips !== undefined ? Number(pos.profit_lock_start_pips) : 0,
              profit_lock_distance_pips: pos.profit_lock_distance_pips !== 0 ? Number(pos.profit_lock_distance_pips) : 0
            }));
            
            processedPositions.forEach((pos: any) => {
              console.log(`Position ${pos.ticket} SL trailing after sync:`, {
                enabled: pos.sl_trailing_enabled,
                start_pips: pos.sl_trailing_start_pips,
                distance_pips: pos.sl_trailing_distance_pips
              });
            });
            
            setPositions(processedPositions);
            setError(null);
            setLastUpdate(new Date());
            return;
          }
        } catch (syncErr) {
          console.error("Error during sync, continuing with original data:", syncErr);
        }
      }
      
      // Log SL trailing values for each position and ensure proper data types
      const processedPositions = positionsData.map((pos: any) => {
        console.log("Processing position:", pos.ticket, {
          price_current: pos.price_current,
          price_open: pos.price_open,
          symbol: pos.symbol
        });
        
        return {
          ...pos,
          // Ensure boolean fields are properly typed with defaults for missing fields
          sl_trailing_enabled: pos.sl_trailing_enabled !== undefined ? Boolean(pos.sl_trailing_enabled) : false,
        profit_secure_enabled: pos.profit_secure_enabled !== undefined ? Boolean(pos.profit_secure_enabled) : false,
        profit_lock_enabled: pos.profit_lock_enabled !== undefined ? Boolean(pos.profit_lock_enabled) : false,
        // Ensure numeric fields are properly typed with defaults for missing fields
        sl_trailing_start_pips: pos.sl_trailing_start_pips !== undefined ? Number(pos.sl_trailing_start_pips) : 0,
        sl_trailing_distance_pips: pos.sl_trailing_distance_pips !== undefined ? Number(pos.sl_trailing_distance_pips) : 10,
        profit_lock_start_pips: pos.profit_lock_start_pips !== undefined ? Number(pos.profit_lock_start_pips) : 0,
        profit_lock_distance_pips: pos.profit_lock_distance_pips !== 0 ? Number(pos.profit_lock_distance_pips) : 0
        };
      });
      
      processedPositions.forEach((pos: any) => {
        console.log(`Position ${pos.ticket} SL trailing:`, {
          enabled: pos.sl_trailing_enabled,
          start_pips: pos.sl_trailing_start_pips,
          distance_pips: pos.sl_trailing_distance_pips
        });
      });
      
      setPositions(processedPositions);
      setError(null);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error("Error fetching positions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const savePositionOptions = async (position: Position) => {
    try {
      const updateData = [
        {
          ticket: position.ticket,
          profit_lock_enabled: position.profit_lock_enabled,
          profit_lock_start_pips: position.profit_lock_start_pips,
          profit_lock_distance_pips: position.profit_lock_distance_pips,
          sl_trailing_enabled: position.sl_trailing_enabled,
          sl_trailing_start_pips: position.sl_trailing_start_pips,
          sl_trailing_distance_pips: position.sl_trailing_distance_pips,
          profit_secure_enabled: position.profit_secure_enabled
        }
      ];

      console.log("Saving position options:", updateData);
      console.log("SL Trailing values:", {
        enabled: position.sl_trailing_enabled,
        start_pips: position.sl_trailing_start_pips,
        distance_pips: position.sl_trailing_distance_pips
      });
      
      // Also log the full position data to see what we're working with
      console.log("Full position data:", position);

      const url = new URL(SAVE_POSITIONS_URL);
      url.searchParams.append('account_id', selectedAccount);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
        mode: 'cors',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }

      const result = await response.json();
      console.log("Save response:", result);
      
      return result;
    } catch (err: any) {
      console.error("Error saving position options:", err);
      throw err;
    }
  };

  const closePosition = async (position: Position) => {
    try {
      const closeData: ClosePositionData = {
        ticket: position.ticket,
        volume: position.volume,
        comment: position.comment || ""
      };

      console.log("Closing position:", closeData);

      const url = new URL(CLOSE_POSITION_URL);
      url.searchParams.append('account_id', selectedAccount);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(closeData),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Close response:", result);
      
      return result;
    } catch (err: any) {
      console.error("Error closing position:", err);
      throw err;
    }
  };

  const closeAllPositions = async () => {
    if (positions.length === 0) return;
    
    setClosing(true);
    try {
      const closePromises = positions.map(position => closePosition(position));
      await Promise.all(closePromises);
      
      setCloseMessage("All positions closed successfully!");
      setTimeout(() => setCloseMessage(null), 3000);
      
      // Refresh positions after closing
      await fetchPositions();
    } catch (err) {
      console.error("Error closing all positions:", err);
      setCloseMessage("Error closing positions");
      setTimeout(() => setCloseMessage(null), 3000);
    } finally {
      setClosing(false);
    }
  };

  const closeSymbolPositions = async (symbol: string) => {
    const symbolPositions = positions.filter(pos => pos.symbol === symbol);
    if (symbolPositions.length === 0) return;
    
    setClosing(true);
    try {
      const closePromises = symbolPositions.map(position => closePosition(position));
      await Promise.all(closePromises);
      
      setCloseMessage(`${symbolPositions.length} ${symbol} positions closed successfully!`);
      setTimeout(() => setCloseMessage(null), 3000);
      
      // Refresh positions after closing
      await fetchPositions();
    } catch (err) {
      console.error("Error closing symbol positions:", err);
      setCloseMessage("Error closing positions");
      setTimeout(() => setCloseMessage(null), 3000);
    } finally {
      setClosing(false);
    }
  };

  const closeTypePositions = async (type: "buy" | "sell") => {
    const typePositions = positions.filter(pos => pos.type === type);
    if (typePositions.length === 0) return;
    
    setClosing(true);
    try {
      const closePromises = typePositions.map(position => closePosition(position));
      await Promise.all(closePromises);
      
      setCloseMessage(`${typePositions.length} ${type} positions closed successfully!`);
      setTimeout(() => setCloseMessage(null), 3000);
      
      // Refresh positions after closing
      await fetchPositions();
    } catch (err) {
      console.error("Error closing type positions:", err);
      setCloseMessage("Error closing positions");
      setTimeout(() => setCloseMessage(null), 3000);
    } finally {
      setClosing(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchPositions();
    fetchSymbolSettings();

    // Set up auto-refresh every 3 seconds
    const interval = setInterval(fetchPositions, 3000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [selectedAccount]);

  // Separate effect for account settings to avoid calling when selectedAccount is not set
  useEffect(() => {
    if (selectedAccount) {
      fetchAccountSettings();
    }
  }, [selectedAccount]);

  const handleAccountChange = (accountId: string) => {
    setSelectedAccount(accountId);
  };

  const handleTradeMonitoringToggle = async (enabled: boolean) => {
    if (!accountSettings) return;

    setUpdatingTradeMonitoring(true);
    
    try {
      const updatedSettings = {
        ...accountSettings,
        trade_monitoring_enabled: enabled
      };

      const url = new URL(`${API_URL}/savesettings`);
      url.searchParams.append('account_id', selectedAccount);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Trade monitoring update result:", result);
      
      // Update local state
      setAccountSettings(updatedSettings);
      
      setCloseMessage(`Trade monitoring ${enabled ? 'enabled' : 'disabled'} successfully!`);
      setTimeout(() => setCloseMessage(null), 3000);
      
    } catch (err: any) {
      console.error("Error updating trade monitoring:", err);
      setCloseMessage(`Error updating trade monitoring: ${err.message}`);
      setTimeout(() => setCloseMessage(null), 5000);
    } finally {
      setUpdatingTradeMonitoring(false);
    }
  };

  const initializeTradingOrder = (symbol: string) => {
    const symbolConfig = symbolSettings.find(s => s.symbol === symbol);
    const defaultVolume = symbolConfig?.default_lot_size || 0.01;
    
    if (!tradingOrders[symbol]) {
      setTradingOrders(prev => ({
        ...prev,
        [symbol]: {
          orderType: 'buy',
          volume: defaultVolume.toString()
        }
      }));
    }
  };

  const handleTradingOrderTypeChange = (symbol: string, orderType: 'buy' | 'sell') => {
    setTradingOrders(prev => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        orderType
      }
    }));
  };

  const handleTradingVolumeChange = (symbol: string, volume: string) => {
    setTradingOrders(prev => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        volume
      }
    }));
  };

  const placeTrade = async (symbol: string, orderType?: 'buy' | 'sell') => {
    const order = tradingOrders[symbol];
    if (!order) return;

    // Use the provided orderType or fall back to the stored order type
    const finalOrderType = orderType || order.orderType;

    setPlacingTrade(prev => ({ ...prev, [symbol]: true }));

    try {
      const url = new URL(`${API_URL}/mt5_request`);
      url.searchParams.append('account_id', selectedAccount);

      const tradeData = {
        action: "place_trade",
        symbol: symbol,
        order_type: finalOrderType,
        volume: parseFloat(order.volume),
        price: 0, // Market order
        comment: `Manual ${finalOrderType} from dashboard`
      };

      console.log("Placing trade:", tradeData);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Trade result:", result);

      if (result.status === 'success' && result.result?.success) {
        setCloseMessage(`Trade placed successfully! Ticket: ${result.result.ticket}`);
        setTimeout(() => setCloseMessage(null), 5000);
        
        // Refresh positions to show the new trade
        await fetchPositions();
      } else {
        throw new Error(result.error || result.message || 'Trade placement failed');
      }

    } catch (err: any) {
      console.error("Error placing trade:", err);
      setCloseMessage(`Error placing trade: ${err.message}`);
      setTimeout(() => setCloseMessage(null), 5000);
    } finally {
      setPlacingTrade(prev => ({ ...prev, [symbol]: false }));
    }
  };

  const handleProfitLockChange = async (ticket: number, field: 'profit_lock_enabled' | 'profit_lock_start_pips' | 'profit_lock_distance_pips', value: boolean | number) => {
    setSaving(prev => ({ ...prev, [ticket]: true }));
    
    try {
      const updatedPositions = positions.map(pos => 
        pos.ticket === ticket 
          ? { 
              ...pos, 
              [field]: value 
            }
          : pos
      );
      
      setPositions(updatedPositions);
      
      // Find the updated position
      const updatedPosition = updatedPositions.find(pos => pos.ticket === ticket);
      if (updatedPosition) {
        await savePositionOptions(updatedPosition);
        
        // Refresh data from database to ensure UI matches server state
        await fetchPositions();
      }
      
      console.log(`Updated profit lock for ticket ${ticket}:`, { field, value });
    } catch (err) {
      console.error("Error updating profit lock:", err);
      // Revert the change on error
      await fetchPositions();
    } finally {
      setSaving(prev => ({ ...prev, [ticket]: false }));
    }
  };

  const handleProfitSecureChange = async (ticket: number, field: 'profit_secure_enabled', value: boolean) => {
    setSaving(prev => ({ ...prev, [ticket]: true }));
    
    try {
      const updatedPositions = positions.map(pos => 
        pos.ticket === ticket 
          ? { 
              ...pos, 
              [field]: value 
            }
          : pos
      );
      
      setPositions(updatedPositions);
      
      // Find the updated position
      const updatedPosition = updatedPositions.find(pos => pos.ticket === ticket);
      if (updatedPosition) {
        await savePositionOptions(updatedPosition);
        
        // Refresh data from database to ensure UI matches server state
        await fetchPositions();
      }
      
      console.log(`Updated profit secure for ticket ${ticket}:`, { field, value });
    } catch (err) {
      console.error("Error updating profit secure:", err);
      // Revert the change on error
      await fetchPositions();
    } finally {
      setSaving(prev => ({ ...prev, [ticket]: false }));
    }
  };

  const handleSLTrailingChange = async (ticket: number, field: 'sl_trailing_enabled' | 'sl_trailing_start_pips' | 'sl_trailing_distance_pips', value: boolean | number) => {
    setSaving(prev => ({ ...prev, [ticket]: true }));
    
    try {
      console.log(`Starting SL trailing update for ticket ${ticket}:`, { field, value });
      
      const updatedPositions = positions.map(pos => 
        pos.ticket === ticket 
          ? { 
              ...pos, 
              [field]: value 
            }
          : pos
      );
      
      setPositions(updatedPositions);
      
      // Find the updated position
      const updatedPosition = updatedPositions.find(pos => pos.ticket === ticket);
      if (updatedPosition) {
        console.log(`Saving updated position for ticket ${ticket}:`, updatedPosition);
        await savePositionOptions(updatedPosition);
        console.log(`Successfully saved SL trailing update for ticket ${ticket}`);
        
        // Refresh data from database to ensure UI matches server state
        await fetchPositions();
      } else {
        console.error(`Could not find updated position for ticket ${ticket}`);
      }
      
      console.log(`Updated SL trailing for ticket ${ticket}:`, { field, value });
    } catch (err) {
      console.error("Error updating SL trailing:", err);
      // Revert the change on error
      await fetchPositions();
    } finally {
      setSaving(prev => ({ ...prev, [ticket]: false }));
    }
  };



  const togglePositionExpansion = (ticket: number) => {
    setExpandedPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticket)) {
        newSet.delete(ticket);
      } else {
        newSet.add(ticket);
      }
      return newSet;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return "text-green-400";
    if (profit < 0) return "text-red-400";
    return "text-gray-400";
  };

  const calculatePips = (position: Position) => {
    console.log("=== CALCULATING PIPS ===");
    console.log("Position:", position.ticket, position.symbol);
    console.log("Raw prices:", {
      price_current: position.price_current,
      price_open: position.price_open
    });
    
    // Ensure we have valid price values
    const currentPrice = typeof position.price_current === 'string' ? parseFloat(position.price_current) : position.price_current;
    const openPrice = typeof position.price_open === 'string' ? parseFloat(position.price_open) : position.price_open;
    
    console.log("Parsed prices:", {
      currentPrice,
      openPrice,
      currentPriceValid: !isNaN(currentPrice),
      openPriceValid: !isNaN(openPrice)
    });
    
    // Check if prices are valid numbers
    if (isNaN(currentPrice) || isNaN(openPrice)) {
      console.log("❌ Invalid prices for position:", position.ticket, {
        price_current: position.price_current,
        price_open: position.price_open
      });
      return "0.0";
    }
    
    console.log("Available symbol settings:", symbolSettings.map(s => ({ symbol: s.symbol, price2pips: s.price2pips })));
    const symbolConfig = symbolSettings.find(s => s.symbol === position.symbol);
    console.log("Found symbol config:", symbolConfig);
    
    // If no symbol config or price2pips is 0/invalid, use fallback calculation
    if (!symbolConfig || symbolConfig.price2pips === 0) {
      // For XAUUSDm, use 0.1 as pip value (1 pip = 0.1 for gold)
      const pipValue = position.symbol.includes('XAU') ? 0.1 : 0.0001;
      const priceDifference = Math.abs(currentPrice - openPrice);
      const pips = priceDifference / pipValue;
      console.log("Using fallback calculation for", position.symbol, {
        currentPrice,
        openPrice,
        priceDifference,
        pipValue,
        pips,
        reason: !symbolConfig ? "no symbol config" : "price2pips is 0"
      });
      return pips.toFixed(1);
    }
    
    // Use symbol config price2pips
    const priceDifference = Math.abs(currentPrice - openPrice);
    const pips = priceDifference * symbolConfig.price2pips;
    console.log("✅ Using symbol config for", position.symbol, {
      currentPrice,
      openPrice,
      priceDifference,
      price2pips: symbolConfig.price2pips,
      pips,
      finalResult: pips.toFixed(1)
    });
    return pips.toFixed(1);
  };

  const getTypeColor = (type: string) => {
    return type === "buy" ? "text-green-400" : "text-red-400";
  };

  const getTypeBgColor = (type: string) => {
    return type === "buy" ? "bg-green-900/50" : "bg-red-900/50";
  };

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

  // Get unique symbols for symbol-specific close buttons
  const uniqueSymbols = [...new Set(positions.map(pos => pos.symbol))];

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-white">Open Positions</h1>
              <p className="text-gray-400 mt-1">
                Real-time monitoring of active trading positions
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
              <AccountSelector 
                selectedAccount={selectedAccount}
                onAccountChange={handleAccountChange}
                className="w-full sm:w-auto"
              />
              {accountSettings && (
                <div className="flex items-center space-x-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-600">
                  <span className="text-sm text-gray-300 whitespace-nowrap">Trade Monitoring:</span>
                  <button
                    onClick={() => handleTradeMonitoringToggle(!accountSettings.trade_monitoring_enabled)}
                    disabled={updatingTradeMonitoring}
                    className={`w-12 h-6 rounded-full flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      accountSettings.trade_monitoring_enabled ? "bg-green-600" : "bg-gray-600"
                    } ${updatingTradeMonitoring ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                        accountSettings.trade_monitoring_enabled ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                  {updatingTradeMonitoring && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b border-blue-600"></div>
                  )}
                </div>
              )}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowTradingSection(!showTradingSection)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors w-full sm:w-auto"
                >
                  {showTradingSection ? 'Hide Trading' : 'New Trade'}
                </button>
                <Link
                  href="/"
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors text-center w-full sm:w-auto"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
          
          {/* Status Bar */}
          <div className="mt-4 flex items-center justify-between bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${loading ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                <span className="text-sm text-gray-300">
                  {loading ? 'Loading...' : 'Connected'}
                </span>
              </div>
              {lastUpdate && (
                <span className="text-sm text-gray-500">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </div>
            <button
              onClick={fetchPositions}
              disabled={loading}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 disabled:opacity-50 text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Trading Section */}
        {showTradingSection && (
          <div className="mb-6 bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Place New Trade</h3>
            
            {/* Close Message */}
            {closeMessage && (
              <div className={`mb-4 p-3 rounded-lg ${
                closeMessage.includes('Error') 
                  ? 'bg-red-900/50 border border-red-700 text-red-300' 
                  : 'bg-green-900/50 border border-green-700 text-green-300'
              }`}>
                {closeMessage}
              </div>
            )}

            <div className="space-y-3">
              {symbolSettings.map((symbol) => {
                const symbolKey = symbol.symbol;
                initializeTradingOrder(symbolKey);
                const order = tradingOrders[symbolKey];
                
                if (!order) return null;

                return (
                  <div key={symbolKey} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                      {/* Symbol Info */}
                      <div className="flex items-center space-x-4">
                        <div>
                          <h4 className="text-sm font-medium text-white">{symbolKey}</h4>
                          <span className="text-xs text-gray-400">
                            Default: {symbol.default_lot_size || 0.01} lots
                          </span>
                        </div>
                      </div>
                      
                      {/* Controls Row */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        {/* Volume Input */}
                        <div className="flex items-center space-x-2">
                          <label className="text-xs text-gray-400 whitespace-nowrap">Volume:</label>
                          <input
                            type="number"
                            value={order.volume}
                            onChange={(e) => handleTradingVolumeChange(symbolKey, e.target.value)}
                            className="w-20 px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                            min="0.01"
                            step="0.01"
                            placeholder={symbol.default_lot_size?.toString() || "0.01"}
                          />
                          <span className="text-xs text-gray-400">lots</span>
                        </div>
                        
                        {/* Buy/Sell Buttons */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              // Update order type and place trade with explicit order type
                              handleTradingOrderTypeChange(symbolKey, 'buy');
                              placeTrade(symbolKey, 'buy');
                            }}
                            disabled={placingTrade[symbolKey] || !order.volume || parseFloat(order.volume) <= 0}
                            className="px-6 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                          >
                            {placingTrade[symbolKey] ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                                <span>Placing...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                <span>BUY</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              // Update order type and place trade with explicit order type
                              handleTradingOrderTypeChange(symbolKey, 'sell');
                              placeTrade(symbolKey, 'sell');
                            }}
                            disabled={placingTrade[symbolKey] || !order.volume || parseFloat(order.volume) <= 0}
                            className="px-6 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                          >
                            {placingTrade[symbolKey] ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                                <span>Placing...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                </svg>
                                <span>SELL</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {symbolSettings.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400">No symbols available. Please check symbol settings.</p>
              </div>
            )}
          </div>
        )}

        {/* Close Position Buttons */}
        {positions.length > 0 && (
          <div className="mb-6 bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Close Positions</h3>
            
            {/* Close Message */}
            {closeMessage && (
              <div className={`mb-4 p-3 rounded-lg ${
                closeMessage.includes('Error') 
                  ? 'bg-red-900/50 border border-red-700 text-red-300' 
                  : 'bg-green-900/50 border border-green-700 text-green-300'
              }`}>
                {closeMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Close All Positions */}
              <button
                onClick={closeAllPositions}
                disabled={closing || positions.length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {closing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span>Close All ({positions.length})</span>
              </button>

              {/* Close All Buy */}
              <button
                onClick={() => closeTypePositions("buy")}
                disabled={closing || positions.filter(pos => pos.type === "buy").length === 0}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {closing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                )}
                <span>Close All Buy ({positions.filter(pos => pos.type === "buy").length})</span>
              </button>

              {/* Close All Sell */}
              <button
                onClick={() => closeTypePositions("sell")}
                disabled={closing || positions.filter(pos => pos.type === "sell").length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {closing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                )}
                <span>Close All Sell ({positions.filter(pos => pos.type === "sell").length})</span>
              </button>
            </div>

            {/* Symbol-specific close buttons */}
            {uniqueSymbols.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Close by Symbol:</h4>
                <div className="flex flex-wrap gap-2">
                  {uniqueSymbols.map(symbol => (
                    <button
                      key={symbol}
                      onClick={() => closeSymbolPositions(symbol)}
                      disabled={closing || positions.filter(pos => pos.symbol === symbol).length === 0}
                      className="px-3 py-1 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {symbol} ({positions.filter(pos => pos.symbol === symbol).length})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
                <h3 className="text-sm font-medium text-red-300">Error loading positions</h3>
                <div className="mt-2 text-sm text-red-400">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Positions Table */}
        <div className="bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-700">
          {loading && positions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-400">Loading positions...</p>
            </div>
          ) : positions.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-300">No open positions</h3>
              <p className="mt-1 text-sm text-gray-500">There are currently no active trading positions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Position Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Prices & Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {positions.map((position) => {
                    const isExpanded = expandedPositions.has(position.ticket);
                    return (
                      <React.Fragment key={position.ticket}>
                        {/* Main Position Row */}
                        <tr 
                          className="hover:bg-gray-700 transition-colors cursor-pointer"
                          onClick={() => togglePositionExpansion(position.ticket)}
                        >
                          {/* Position Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-white">#{position.ticket}</span>
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBgColor(position.type)} ${getTypeColor(position.type)}`}>
                                    {position.type.toUpperCase()}
                                  </span>
                                </div>
                                <div className="text-sm text-white font-medium">{position.symbol}</div>
                                <div className="text-sm text-gray-400">Volume: {position.volume}</div>
                              </div>
                            </div>
                          </td>

                          {/* Prices & Profit */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="text-gray-400">Current:</span>
                                <span className="ml-1 font-medium text-white">{position.price_current}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-400">Profit:</span>
                                <span className={`ml-1 font-medium ${getProfitColor(position.profit)}`}>
                                  {formatCurrency(position.profit)}
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-400">Pips:</span>
                                <span className={`ml-1 font-medium ${getProfitColor(position.profit)}`}>
                                  {(() => {
                                    const result = calculatePips(position);
                                    console.log("Rendering pips for position", position.ticket, ":", result);
                                    return result;
                                  })()}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${position.profit_lock_enabled ? 'bg-blue-400' : 'bg-gray-500'}`}></div>
                                <span className="text-xs text-gray-400">
                                  {position.profit_lock_enabled ? 'Lock Active' : 'Lock Inactive'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${position.profit_secure_enabled ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                                <span className="text-xs text-gray-400">
                                  {position.profit_secure_enabled ? 'Secure Active' : 'Secure Inactive'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                {isExpanded ? 'Click to hide' : 'Click to expand'}
                              </span>
                              {saving[position.ticket] && (
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr className="bg-gray-750 border-t border-gray-600">
                            <td colSpan={4} className="px-6 py-4">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Detailed Prices */}
                                <div className="space-y-3">
                                  <h4 className="text-sm font-medium text-blue-400 border-b border-gray-600 pb-1">Price Details</h4>
                                  <div className="space-y-2">
                                    <div className="text-sm">
                                      <span className="text-gray-400">Open Price:</span>
                                      <span className="ml-1 font-medium text-white">{position.price_open}</span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-gray-400">Current Price:</span>
                                      <span className="ml-1 font-medium text-white">{position.price_current}</span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-gray-400">Stop Loss:</span>
                                      <span className="ml-1 font-medium text-white">{position.sl}</span>
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-gray-400">Take Profit:</span>
                                      <span className="ml-1 font-medium text-white">{position.tp}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Profit Lock Settings */}
                                <div className={`space-y-3 ${!position.profit_secure_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                  <h4 className="text-sm font-medium text-green-400 border-b border-gray-600 pb-1">Profit Lock</h4>
                                  <div className="space-y-3">
                                    <ToggleButton
                                      checked={position.profit_lock_enabled}
                                      onChange={(value) => handleProfitLockChange(position.ticket, 'profit_lock_enabled', value)}
                                      label="Enabled"
                                      disabled={saving[position.ticket] || !position.profit_secure_enabled}
                                    />
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-1">Start Pips</label>
                                      <input
                                        type="number"
                                        value={getInputValue(position.ticket, 'profit_lock_start_pips', position.profit_lock_start_pips)}
                                        onChange={(e) => handleInputChange(position.ticket, 'profit_lock_start_pips', e.target.value)}
                                        onBlur={(e) => handleInputBlur(position.ticket, 'profit_lock_start_pips', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                        min="0"
                                        disabled={saving[position.ticket] || !position.profit_secure_enabled}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-1">Distance Pips</label>
                                      <input
                                        type="number"
                                        value={getInputValue(position.ticket, 'profit_lock_distance_pips', position.profit_lock_distance_pips)}
                                        onChange={(e) => handleInputChange(position.ticket, 'profit_lock_distance_pips', e.target.value)}
                                        onBlur={(e) => handleInputBlur(position.ticket, 'profit_lock_distance_pips', e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                        min="0"
                                        disabled={saving[position.ticket] || !position.profit_secure_enabled}
                                      />
                                    </div>

                                  </div>
                                </div>

                                {/* SL Trailing Settings */}
                                <div className={`space-y-3 ${!position.profit_secure_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                  <h4 className="text-sm font-medium text-orange-400 border-b border-gray-600 pb-1">SL Trailing</h4>
                                  <div className="space-y-3">
                                    <ToggleButton
                                      checked={position.sl_trailing_enabled}
                                      onChange={(value) => handleSLTrailingChange(position.ticket, 'sl_trailing_enabled', value)}
                                      label="Enabled"
                                      disabled={saving[position.ticket] || !position.profit_secure_enabled}
                                    />
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-1">Start Pips</label>
                                        <input
                                          type="number"
                                          value={getInputValue(position.ticket, 'sl_trailing_start_pips', position.sl_trailing_start_pips)}
                                          onChange={(e) => handleInputChange(position.ticket, 'sl_trailing_start_pips', e.target.value)}
                                          onBlur={(e) => handleInputBlur(position.ticket, 'sl_trailing_start_pips', e.target.value)}
                                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                          min="0"
                                          disabled={saving[position.ticket] || !position.profit_secure_enabled}
                                        />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-400 mb-1">Distance Pips</label>
                                        <input
                                          type="number"
                                          value={getInputValue(position.ticket, 'sl_trailing_distance_pips', position.sl_trailing_distance_pips)}
                                          onChange={(e) => handleInputChange(position.ticket, 'sl_trailing_distance_pips', e.target.value)}
                                          onBlur={(e) => handleInputBlur(position.ticket, 'sl_trailing_distance_pips', e.target.value)}
                                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                          min="0"
                                          disabled={saving[position.ticket] || !position.profit_secure_enabled}
                                        />
                                    </div>
                                  </div>
                                </div>

                                {/* Profit Secure Settings */}
                                <div className="space-y-3">
                                  <h4 className="text-sm font-medium text-purple-400 border-b border-gray-600 pb-1">Profit Secure</h4>
                                  <div className="space-y-3">
                                    <ToggleButton
                                      checked={position.profit_secure_enabled}
                                      onChange={(value) => handleProfitSecureChange(position.ticket, 'profit_secure_enabled', value)}
                                      label="Enabled"
                                      disabled={saving[position.ticket]}
                                    />

                                  </div>
                                </div>

                                {/* Set to Default Settings Button */}
                                <div className="space-y-3">
                                  <div className="pt-2">
                                    <button
                                      onClick={() => applyDefaultSettings(position.ticket)}
                                      disabled={saving[position.ticket] || applyingDefaults[position.ticket]}
                                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-md transition-colors duration-200 flex items-center justify-center space-x-2"
                                    >
                                      {applyingDefaults[position.ticket] ? (
                                        <>
                                          <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                                          <span>Applying...</span>
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                          </svg>
                                          <span>Set to Default Settings</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Additional Details */}
                              <div className="mt-4 pt-4 border-t border-gray-600">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-400">Magic Number:</span>
                                    <span className="ml-1 font-medium text-white">{position.magic}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Opened:</span>
                                    <span className="ml-1 text-gray-300">{position.open_time ? formatDateTime(position.open_time) : 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Last Updated:</span>
                                    <span className="ml-1 text-gray-300">{formatDateTime(position.last_updated)}</span>
                                  </div>
                                </div>
                                {position.comment && (
                                  <div className="mt-2 text-sm">
                                    <span className="text-gray-400">Comment:</span>
                                    <span className="ml-1 text-gray-300">{position.comment}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {positions.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
              <div className="text-sm font-medium text-gray-400">Total Positions</div>
              <div className="text-2xl font-bold text-white">{positions.length}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
              <div className="text-sm font-medium text-gray-400">Total Profit</div>
              <div className={`text-2xl font-bold ${getProfitColor(positions.reduce((sum, pos) => sum + pos.profit, 0))}`}>
                {formatCurrency(positions.reduce((sum, pos) => sum + pos.profit, 0))}
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
              <div className="text-sm font-medium text-gray-400">Avg Pips</div>
              <div className="text-2xl font-bold text-white">
                {positions.length > 0 ? (positions.reduce((sum, pos) => {
                  const currentPrice = typeof pos.price_current === 'string' ? parseFloat(pos.price_current) : pos.price_current;
                  const openPrice = typeof pos.price_open === 'string' ? parseFloat(pos.price_open) : pos.price_open;
                  
                  if (isNaN(currentPrice) || isNaN(openPrice)) {
                    return sum;
                  }
                  
                  const symbolConfig = symbolSettings.find(s => s.symbol === pos.symbol);
                  if (!symbolConfig || symbolConfig.price2pips === 0) {
                    // Use fallback calculation
                    const pipValue = pos.symbol.includes('XAU') ? 0.1 : 0.0001;
                    const priceDifference = Math.abs(currentPrice - openPrice);
                    return sum + (priceDifference / pipValue);
                  }
                  
                  const priceDifference = Math.abs(currentPrice - openPrice);
                  return sum + (priceDifference * symbolConfig.price2pips);
                }, 0) / positions.length).toFixed(1) : '0.0'}
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
              <div className="text-sm font-medium text-gray-400">Total Volume</div>
              <div className="text-2xl font-bold text-white">
                {positions.reduce((sum, pos) => sum + pos.volume, 0).toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
