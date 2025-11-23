"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AccountSelector from "../components/AccountSelector";

const API_URL = "http://198.23.206.54";
const GET_POSITIONS_URL = `${API_URL}/getpositions`;
const SAVE_POSITIONS_URL = `${API_URL}/savepositions`;
const SYNC_POSITIONS_URL = `${API_URL}/syncpositions`;

const CLOSE_POSITION_URL = `${API_URL}/close`;
const MODIFY_POSITION_URL = `${API_URL}/modify`;

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
  const [closingPosition, setClosingPosition] = useState<{ [ticket: number]: boolean }>({});
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
  const [showProfitSettings, setShowProfitSettings] = useState<{ [ticket: number]: boolean }>({});
  const [showPositionModal, setShowPositionModal] = useState<{ [ticket: number]: boolean }>({});
  const [hasChanges, setHasChanges] = useState<{ [ticket: number]: boolean }>({});
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [manualRefreshing, setManualRefreshing] = useState<boolean>(false);

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

  const handleSaveChanges = async (ticket: number) => {
    const position = positions.find(p => p.ticket === ticket);
    if (!position) return;

    try {
      setSaving(prev => ({ ...prev, [ticket]: true }));
      
      // Get the current editing values
      const editingData = Object.keys(editingValues)
        .filter(key => key.startsWith(`${ticket}-`))
        .reduce((acc, key) => {
          const field = key.split('-').slice(1).join('-');
          acc[field] = editingValues[key];
          return acc;
        }, {} as any);

      // Update position with editing values and toggle states
      const updates: any = {
        ticket: ticket,
        profit_lock_enabled: position.profit_lock_enabled,
        profit_lock_start_pips: editingData['profit_lock_start_pips'] !== undefined 
          ? Number(editingData['profit_lock_start_pips']) 
          : position.profit_lock_start_pips,
        profit_lock_distance_pips: editingData['profit_lock_distance_pips'] !== undefined 
          ? Number(editingData['profit_lock_distance_pips']) 
          : position.profit_lock_distance_pips,
        sl_trailing_enabled: position.sl_trailing_enabled,
        sl_trailing_start_pips: editingData['sl_trailing_start_pips'] !== undefined 
          ? Number(editingData['sl_trailing_start_pips']) 
          : position.sl_trailing_start_pips,
        sl_trailing_distance_pips: editingData['sl_trailing_distance_pips'] !== undefined 
          ? Number(editingData['sl_trailing_distance_pips']) 
          : position.sl_trailing_distance_pips,
        profit_secure_enabled: position.profit_secure_enabled
      };

      await savePositionOptions(updates as any);
      
      // Clear editing values for this ticket
      setEditingValues(prev => {
        const newValues = { ...prev };
        Object.keys(newValues).forEach(key => {
          if (key.startsWith(`${ticket}-`)) {
            delete newValues[key];
          }
        });
        return newValues;
      });
      
      // Refresh positions to show updated data
      await fetchPositions();
      
    } catch (err: any) {
      console.error(`Error saving changes for ticket ${ticket}:`, err);
      setError(`Failed to save changes: ${err.message}`);
    } finally {
      setSaving(prev => ({ ...prev, [ticket]: false }));
    }
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

  const fetchPositions = async (preserveSettings = false) => {
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
            // Core numeric fields aligned with API payload
            price_open: pos.price_open !== undefined ? Number(pos.price_open) : Number(pos.entry_price ?? 0),
            price_current: pos.price_current !== undefined ? Number(pos.price_current) : Number(pos.current_price ?? 0),
            profit: pos.profit !== undefined ? Number(pos.profit) : 0,
            sl: pos.sl !== undefined ? Number(pos.sl) : 0,
            tp: pos.tp !== undefined ? Number(pos.tp) : 0,
            swap: pos.swap !== undefined ? Number(pos.swap) : 0,
            lock_profit_points: pos.lock_profit_points !== undefined ? Number(pos.lock_profit_points) : 0,
            profit_secure_start_points: pos.profit_secure_start_points !== undefined ? Number(pos.profit_secure_start_points) : 0,
            profit_lock_start_points: pos.profit_lock_start_points !== undefined ? Number(pos.profit_lock_start_points) : 0,
            profit_lock_distance: pos.profit_lock_distance !== undefined ? Number(pos.profit_lock_distance) : 0,
            // Ensure boolean fields are properly typed with defaults for missing fields
            sl_trailing_enabled: pos.sl_trailing_enabled !== undefined ? Boolean(pos.sl_trailing_enabled) : false,
            profit_secure_enabled: pos.profit_secure_enabled !== undefined ? Boolean(pos.profit_secure_enabled) : false,
            profit_lock_enabled: pos.profit_lock_enabled !== undefined ? Boolean(pos.profit_lock_enabled) : false,
            // Ensure numeric fields are properly typed with defaults for missing fields
            sl_trailing_start_pips: pos.sl_trailing_start_pips !== undefined ? Number(pos.sl_trailing_start_pips) : 0,
            sl_trailing_distance_pips: pos.sl_trailing_distance_pips !== undefined ? Number(pos.sl_trailing_distance_pips) : 20,
            profit_lock_start_pips: pos.profit_lock_start_pips !== undefined ? Number(pos.profit_lock_start_pips) : 0,
            profit_lock_distance_pips: pos.profit_lock_distance_pips !== undefined
              ? Number(pos.profit_lock_distance_pips)
              : Number(pos.profit_lock_distance ?? 0),
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
          price_current: pos.price_current ?? pos.current_price,
          price_open: pos.price_open ?? pos.entry_price,
          symbol: pos.symbol
        });
        
        return {
          ...pos,
          // Core numeric fields aligned with API payload
          price_open: pos.price_open !== undefined ? Number(pos.price_open) : Number(pos.entry_price ?? 0),
          price_current: pos.price_current !== undefined ? Number(pos.price_current) : Number(pos.current_price ?? 0),
          profit: pos.profit !== undefined ? Number(pos.profit) : 0,
          sl: pos.sl !== undefined ? Number(pos.sl) : 0,
          tp: pos.tp !== undefined ? Number(pos.tp) : 0,
          swap: pos.swap !== undefined ? Number(pos.swap) : 0,
          lock_profit_points: pos.lock_profit_points !== undefined ? Number(pos.lock_profit_points) : 0,
          profit_secure_start_points: pos.profit_secure_start_points !== undefined ? Number(pos.profit_secure_start_points) : 0,
          profit_lock_start_points: pos.profit_lock_start_points !== undefined ? Number(pos.profit_lock_start_points) : 0,
          profit_lock_distance: pos.profit_lock_distance !== undefined ? Number(pos.profit_lock_distance) : 0,
          // Ensure boolean fields are properly typed with defaults for missing fields
          sl_trailing_enabled: pos.sl_trailing_enabled !== undefined ? Boolean(pos.sl_trailing_enabled) : false,
          profit_secure_enabled: pos.profit_secure_enabled !== undefined ? Boolean(pos.profit_secure_enabled) : false,
          profit_lock_enabled: pos.profit_lock_enabled !== undefined ? Boolean(pos.profit_lock_enabled) : false,
          // Ensure numeric fields are properly typed with defaults for missing fields
          sl_trailing_start_pips: pos.sl_trailing_start_pips !== undefined ? Number(pos.sl_trailing_start_pips) : 0,
          sl_trailing_distance_pips: pos.sl_trailing_distance_pips !== undefined ? Number(pos.sl_trailing_distance_pips) : 20,
          profit_lock_start_pips: pos.profit_lock_start_pips !== undefined ? Number(pos.profit_lock_start_pips) : 0,
          profit_lock_distance_pips: pos.profit_lock_distance_pips !== undefined
            ? Number(pos.profit_lock_distance_pips)
            : Number(pos.profit_lock_distance ?? 0)
        };
      });
      
      processedPositions.forEach((pos: any) => {
        console.log(`Position ${pos.ticket} SL trailing:`, {
          enabled: pos.sl_trailing_enabled,
          start_pips: pos.sl_trailing_start_pips,
          distance_pips: pos.sl_trailing_distance_pips
        });
      });
      
      // If preserving settings, merge with existing positions
      if (preserveSettings) {
        setPositions(prev => prev.map(oldPos => {
          const newPos = processedPositions.find((p: any) => p.ticket === oldPos.ticket);
          if (newPos) {
            // Update only price-related fields, preserve settings
            return {
              ...oldPos,
              price_current: newPos.price_current,
              profit: newPos.profit,
              sl: newPos.sl,
              tp: newPos.tp,
              swap: newPos.swap
            };
          }
          return oldPos;
        }));
      } else {
        setPositions(processedPositions);
      }
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

  const closeSinglePosition = async (ticket: number) => {
    const position = positions.find(pos => pos.ticket === ticket);
    if (!position) return;

    setClosingPosition(prev => ({ ...prev, [ticket]: true }));
    try {
      await closePosition(position);
      setCloseMessage(`Position #${ticket} closed successfully`);
      setTimeout(() => setCloseMessage(null), 5000);
      
      // Refresh positions to remove the closed position
      await fetchPositions();
    } catch (err: any) {
      console.error("Error closing position:", err);
      setCloseMessage(`Error closing position #${ticket}: ${err.message}`);
      setTimeout(() => setCloseMessage(null), 5000);
    } finally {
      setClosingPosition(prev => ({ ...prev, [ticket]: false }));
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
    let isCancelled = false;

    const runFetchLoop = async () => {
      if (isCancelled || !autoRefreshEnabled) {
        return;
      }

      // Determine if any modal is open at the time of the request
      const isAnyModalOpen = Object.values(showPositionModal).some(Boolean);

      // Fetch positions, preserving settings only when a modal is open
      await fetchPositions(isAnyModalOpen);

      if (isCancelled || !autoRefreshEnabled) {
        return;
      }

      // Wait 3 seconds after the response before the next request
      setTimeout(() => {
        runFetchLoop();
      }, 3000);
    };

    // Initial fetches
    fetchPositions();
    fetchSymbolSettings();

    // Start the loop only when auto refresh is enabled
    if (autoRefreshEnabled) {
      runFetchLoop();
    }

    // Cleanup on unmount or dependency change
    return () => {
      isCancelled = true;
    };
  }, [selectedAccount, showPositionModal, autoRefreshEnabled]);

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

  const handleRemoveSL = async (ticket: number) => {
    try {
      const url = new URL(MODIFY_POSITION_URL);
      url.searchParams.append("account_id", selectedAccount);

      const payload = {
        ticket,
        sl: 0,
      };

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        mode: "cors",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error removing SL:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update local state
      setPositions((prev) =>
        prev.map((pos) =>
          pos.ticket === ticket ? { ...pos, sl: 0 } : pos
        )
      );

      // Optional: refresh from server to ensure full sync
      const isAnyModalOpen = Object.values(showPositionModal).some(Boolean);
      await fetchPositions(isAnyModalOpen);
    } catch (err) {
      console.error("Error in handleRemoveSL:", err);
      setError("Failed to remove SL");
    }
  };

  const handleManualRefresh = async () => {
    try {
      setManualRefreshing(true);

      const isAnyModalOpen = Object.values(showPositionModal).some(Boolean);

      // Preserve settings when a modal is open, same behavior as auto-refresh
      await fetchPositions(isAnyModalOpen);
      await fetchSymbolSettings();
    } catch (err) {
      console.error("Error during manual refresh:", err);
    } finally {
      setManualRefreshing(false);
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
        price: 0 // Market order
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

  const formatNumber = (value: number | string | null | undefined, decimals: number) => {
    if (value === null || value === undefined) {
      return "N/A";
    }

    const numericValue = typeof value === "string" ? parseFloat(value) : value;

    if (Number.isNaN(numericValue)) {
      return "N/A";
    }

    return numericValue.toFixed(decimals);
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
    <div className="min-h-screen bg-gray-900">
      {/* Account Summary Cards - Horizontal Scroll */}
      <div className="px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Link 
              href="/"
              className="p-2 text-white hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Back to Home"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">TB</span>
            </div>
            <span className="text-white font-semibold text-lg">Positions</span>
          </div>
          <button
            onClick={() => setShowTradingSection(!showTradingSection)}
            className="p-2 text-white hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Add Trade"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        {/* Total P/L Display */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className="text-gray-400 text-sm">Total P/L:</span>
            <span className={`text-2xl font-bold ${getProfitColor(positions.reduce((sum, pos) => sum + pos.profit, 0))}`}>
              {formatCurrency(positions.reduce((sum, pos) => sum + pos.profit, 0))}
            </span>
          </div>

          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Auto Refresh</span>
              <button
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                className={`w-10 h-6 rounded-full flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  autoRefreshEnabled ? "bg-blue-600" : "bg-gray-600"
                }`}
                aria-label="Toggle auto refresh"
                tabIndex={0}
              >
                <span
                  className={`inline-block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                    autoRefreshEnabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={manualRefreshing}
              className="px-3 py-1 rounded-md text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50 flex items-center space-x-1"
            >
              {manualRefreshing ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0119 5" />
                  </svg>
                  <span>Refresh</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex-shrink-0 w-32">
            <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
              <div className="text-xs text-gray-400 mb-1">Balance</div>
              <div className="text-base font-semibold text-white">
                {accountSettings?.balance || '0.00'}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-32">
            <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
              <div className="text-xs text-gray-400 mb-1">Equity</div>
              <div className="text-base font-semibold text-white">
                {accountSettings?.equity || '0.00'}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-32">
            <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
              <div className="text-xs text-gray-400 mb-1">Margin</div>
              <div className="text-base font-semibold text-white">
                {accountSettings?.margin || '0.00'}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-32">
            <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
              <div className="text-xs text-gray-400 mb-1">Free Margin</div>
              <div className="text-base font-semibold text-white">
                {accountSettings?.free_margin || '0.00'}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 w-32">
            <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
              <div className="text-xs text-gray-400 mb-1">Margin Level</div>
              <div className="text-base font-semibold text-white">
                {accountSettings?.margin_level || '0.00'}%
              </div>
            </div>
          </div>
        </div>
        
        {/* Account Selector and Trade Monitoring Toggle */}
        <div className="mt-3 space-y-3">
          <AccountSelector 
            selectedAccount={selectedAccount}
            onAccountChange={handleAccountChange}
            className="w-full"
          />
          
          {/* Trade Monitoring Toggle */}
          <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-sm font-medium text-gray-300">Trade Monitoring</span>
              </div>
              <button
                className={`w-12 h-6 rounded-full flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  accountSettings?.trade_monitoring_enabled ? "bg-blue-600" : "bg-gray-600"
                } ${updatingTradeMonitoring ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !updatingTradeMonitoring && handleTradeMonitoringToggle(!accountSettings?.trade_monitoring_enabled)}
                disabled={updatingTradeMonitoring}
                aria-label="Toggle Trade Monitoring"
                tabIndex={0}
              >
                <span
                  className={`inline-block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                    accountSettings?.trade_monitoring_enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Positions Section Header */}
      <div className="px-4 py-2 border-t border-gray-700 bg-gray-800">
        <h2 className="text-gray-400 text-sm font-medium">Positions ({positions.length})</h2>
      </div>

      {/* Trading Panel - Collapsible */}
      {showTradingSection && (
        <div className="mx-4 mt-3 bg-blue-900/30 rounded-lg border border-blue-700/50 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h3 className="text-blue-300 font-semibold">New Trade</h3>
          </div>
          <div className="space-y-2">
            {symbolSettings.map((symbol) => {
              const symbolKey = symbol.symbol;
              initializeTradingOrder(symbolKey);
              const order = tradingOrders[symbolKey];
              if (!order) return null;

              return (
                <div key={symbolKey} className="bg-gray-800 rounded-lg p-3 border border-blue-700/50">
                  <div className="text-sm font-medium text-white mb-2">{symbolKey}</div>
                  <input
                    type="number"
                    value={order.volume}
                    onChange={(e) => handleTradingVolumeChange(symbolKey, e.target.value)}
                    className="w-full px-3 py-2 mb-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white placeholder-gray-400"
                    placeholder="0.01"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => placeTrade(symbolKey, 'buy')}
                      disabled={placingTrade[symbolKey]}
                      className="px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium disabled:opacity-50"
                    >
                      BUY
                    </button>
                    <button
                      onClick={() => placeTrade(symbolKey, 'sell')}
                      disabled={placingTrade[symbolKey]}
                      className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium disabled:opacity-50"
                    >
                      SELL
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Position Cards - Mobile Optimized */}
      <div className="px-4 py-3 bg-gray-900 min-h-screen">
        {loading && positions.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-400">Loading positions...</p>
          </div>
        ) : positions.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-3 text-gray-400 font-medium">No open positions</h3>
            <p className="mt-1 text-gray-500 text-sm">Get started by placing a trade</p>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((position) => {
              const isExpanded = expandedPositions.has(position.ticket);
              const pips = calculatePips(position);
              
              return (
                <div
                  key={position.ticket}
                  className={`bg-gray-800 rounded-lg shadow-sm border ${
                    isExpanded ? 'border-blue-500 border-l-4' : 'border-gray-700'
                  }`}
                >
                  {/* Main Position Card */}
                  <div
                    className="p-3 active:bg-gray-700 transition-colors"
                    onClick={() => togglePositionExpansion(position.ticket)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Symbol and Type */}
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-base font-semibold text-white">
                            {position.symbol}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            position.type === 'buy' 
                              ? 'bg-green-900/50 text-green-400' 
                              : 'bg-red-900/50 text-red-400'
                          }`}>
                            {position.type === 'buy' ? 'buy' : 'sell'} {position.volume}
                          </span>
                        </div>
                        
                        {/* Prices */}
                        <div className="text-sm text-gray-400">
                          {formatNumber(position.price_open as any, 5)} → {formatNumber(position.price_current as any, 5)}
                        </div>
                        
                        {/* Profit and Pips */}
                        <div className="flex items-center space-x-3 mt-1">
                          <span className={`text-base font-semibold ${getProfitColor(position.profit)}`}>
                            {formatNumber(position.profit as any, 2)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {pips} pips
                          </span>
                        </div>
                      </div>
                      
                      {/* Right side: Comment and Expand Indicator */}
                      <div className="flex flex-col items-end space-y-2">
                        {position.comment && (
                          <div className="text-xs text-gray-300 text-right">
                            {position.comment}
                          </div>
                        )}
                        {/* Expand Indicator */}
                        <svg
                          className={`w-5 h-5 text-gray-500 transform transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 bg-gray-800/50">
                      <div className="p-3 space-y-3">
                        {/* Date and SL/TP */}
                        <div className="text-sm text-gray-400">
                          {position.open_time ? formatDateTime(position.open_time) : 'N/A'}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">S/L: </span>
                            <span className="font-medium text-gray-300">{formatNumber(position.sl as any, 5)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">T/P: </span>
                            <span className="font-medium text-gray-300">{formatNumber(position.tp as any, 5)}</span>
                          </div>
                        </div>
                        
                        {position.swap !== undefined && (
                          <div className="text-sm">
                            <span className="text-gray-500">Swap: </span>
                            <span className="font-medium text-gray-300">{formatNumber(position.swap as any, 2)}</span>
                          </div>
                        )}

                        {/* Additional Info */}
                        {position.magic && (
                          <div className="text-sm">
                            <span className="text-gray-500">Magic: </span>
                            <span className="font-medium text-gray-300">{position.magic}</span>
                          </div>
                        )}

                        {/* Settings Icon */}
                        <div className="pt-2 border-t border-gray-700">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPositionModal(prev => ({ ...prev, [position.ticket]: true }));
                            }}
                            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium text-sm flex items-center justify-center space-x-2 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Settings</span>
                          </button>
                        </div>

                        {/* Close Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeSinglePosition(position.ticket);
                          }}
                          disabled={closingPosition[position.ticket]}
                          className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm disabled:opacity-50 flex items-center justify-center space-x-2 transition-colors"
                        >
                          {closingPosition[position.ticket] ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Closing...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Close Position</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Padding for better scrolling */}
        <div className="pb-20"></div>
      </div>

      {/* Position Detail Modal */}
      {positions.map((position) => {
        if (!showPositionModal[position.ticket]) return null;
        
        return (
          <div
            key={`modal-${position.ticket}`}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPositionModal(prev => ({ ...prev, [position.ticket]: false }))}
          >
            <div
              className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Position #{position.ticket}</h2>
                  <button
                    onClick={() => setShowPositionModal(prev => ({ ...prev, [position.ticket]: false }))}
                    className="p-2 text-gray-400 hover:text-white"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Position Info */}
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Symbol</p>
                      <p className="text-white font-medium">{position.symbol}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Type</p>
                      <p className={`font-medium ${position.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                        {position.type.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Volume</p>
                      <p className="text-white font-medium">{position.volume}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Profit</p>
                      <p className={`font-medium ${getProfitColor(position.profit)}`}>
                        {formatCurrency(position.profit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Open Price</p>
                      <p className="text-white font-medium">{formatNumber(position.price_open as any, 5)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Current Price</p>
                      <p className="text-white font-medium">{formatNumber(position.price_current as any, 5)}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between space-x-2">
                        <div>
                          <p className="text-sm text-gray-400">S/L</p>
                          <p className="text-white font-medium">{formatNumber(position.sl as any, 5)}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveSL(position.ticket)}
                          className="mt-4 px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-700 text-white"
                        >
                          Remove SL
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">T/P</p>
                      <p className="text-white font-medium">{formatNumber(position.tp as any, 5)}</p>
                    </div>
                    {position.swap !== undefined && (
                      <div>
                      <p className="text-sm text-gray-400">Swap</p>
                      <p className="text-white font-medium">{formatNumber(position.swap as any, 2)}</p>
                      </div>
                    )}
                    {position.magic && (
                      <div>
                        <p className="text-sm text-gray-400">Magic Number</p>
                        <p className="text-white font-medium">{position.magic}</p>
                      </div>
                    )}
                    {position.comment && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-400">Comment</p>
                        <p className="text-white font-medium">{position.comment}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profit Lock Settings */}
                <div className="border-t border-gray-700 pt-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Profit Lock</h3>
                    <button
                      onClick={() => {
                        // Update local state only
                        setPositions(prev => prev.map(pos => 
                          pos.ticket === position.ticket 
                            ? { ...pos, profit_lock_enabled: !pos.profit_lock_enabled }
                            : pos
                        ));
                        setHasChanges(prev => ({ ...prev, [position.ticket]: true }));
                      }}
                      className={`w-12 h-7 rounded-full relative transition-colors ${
                        position.profit_lock_enabled ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transform transition-transform ${
                          position.profit_lock_enabled ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                  {position.profit_lock_enabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Start Pips</label>
                        <input
                          type="number"
                          value={getInputValue(position.ticket, 'profit_lock_start_pips', position.profit_lock_start_pips)}
                          onChange={(e) => {
                            handleInputChange(position.ticket, 'profit_lock_start_pips', e.target.value);
                            setHasChanges(prev => ({ ...prev, [position.ticket]: true }));
                          }}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Distance Pips</label>
                        <input
                          type="number"
                          value={getInputValue(position.ticket, 'profit_lock_distance_pips', position.profit_lock_distance_pips)}
                          onChange={(e) => {
                            handleInputChange(position.ticket, 'profit_lock_distance_pips', e.target.value);
                            setHasChanges(prev => ({ ...prev, [position.ticket]: true }));
                          }}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* SL Trailing Settings */}
                <div className="border-t border-gray-700 pt-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">SL Trailing</h3>
                    <button
                      onClick={() => {
                        // Update local state only
                        setPositions(prev => prev.map(pos => 
                          pos.ticket === position.ticket 
                            ? { ...pos, sl_trailing_enabled: !pos.sl_trailing_enabled }
                            : pos
                        ));
                        setHasChanges(prev => ({ ...prev, [position.ticket]: true }));
                      }}
                      className={`w-12 h-7 rounded-full relative transition-colors ${
                        position.sl_trailing_enabled ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transform transition-transform ${
                          position.sl_trailing_enabled ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                  {position.sl_trailing_enabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Start Pips</label>
                        <input
                          type="number"
                          value={getInputValue(position.ticket, 'sl_trailing_start_pips', position.sl_trailing_start_pips)}
                          onChange={(e) => {
                            handleInputChange(position.ticket, 'sl_trailing_start_pips', e.target.value);
                            setHasChanges(prev => ({ ...prev, [position.ticket]: true }));
                          }}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Distance Pips</label>
                        <input
                          type="number"
                          value={getInputValue(position.ticket, 'sl_trailing_distance_pips', position.sl_trailing_distance_pips)}
                          onChange={(e) => {
                            handleInputChange(position.ticket, 'sl_trailing_distance_pips', e.target.value);
                            setHasChanges(prev => ({ ...prev, [position.ticket]: true }));
                          }}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Restore Default Settings Button */}
                <div className="border-t border-gray-700 pt-4 mb-4">
                  <button
                    onClick={async () => {
                      await applyDefaultSettings(position.ticket);
                      setHasChanges(prev => ({ ...prev, [position.ticket]: true }));
                    }}
                    disabled={applyingDefaults[position.ticket]}
                    className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                  >
                    {applyingDefaults[position.ticket] ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Applying...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Restore Default Settings</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={async () => {
                      await handleSaveChanges(position.ticket);
                      setShowPositionModal(prev => ({ ...prev, [position.ticket]: false }));
                      setHasChanges(prev => ({ ...prev, [position.ticket]: false }));
                    }}
                    disabled={!hasChanges[position.ticket] || saving[position.ticket]}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {saving[position.ticket] ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => closeSinglePosition(position.ticket)}
                    disabled={closingPosition[position.ticket]}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    Close Position
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Success/Error Messages */}
      {closeMessage && (
        <div className={`fixed bottom-4 left-4 right-4 p-3 rounded-lg shadow-lg z-50 ${
          closeMessage.includes('Error') 
            ? 'bg-red-600 text-white' 
            : 'bg-green-600 text-white'
        }`}>
          {closeMessage}
        </div>
      )}
    </div>
  );
}
