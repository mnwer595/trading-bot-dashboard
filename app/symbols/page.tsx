"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountSelector from "../components/AccountSelector";

const API_URL = "http://198.23.206.54";
const GET_SYMBOLS_URL = `${API_URL}/getsymbols`;
const SAVE_SYMBOLS_URL = `${API_URL}/savesymbols`;

type SymbolSettings = {
  symbol: string;
  name: string;
  profit_secure_enabled: boolean;
  profit_lock_enabled: boolean;
  profit_lock_start_pips: number;
  profit_lock_distance_pips: number;
  sl_trailing_enabled: boolean;
  sl_trailing_start_pips: number;
  sl_trailing_distance_pips: number;
  standard_lot: number;
  digits: number;
  price2pips: number;
  default_sl_pips: number;
};

export default function SymbolsPage() {
  const [symbols, setSymbols] = useState<SymbolSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<{ [symbol: string]: boolean }>({});
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalSymbols, setOriginalSymbols] = useState<SymbolSettings[]>([]);
  const [editingFields, setEditingFields] = useState<{ [key: string]: string }>({});
  const [selectedAccount, setSelectedAccount] = useState<string>("test");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState<Partial<SymbolSettings>>({
    symbol: '',
    name: '',
    profit_secure_enabled: false,
    profit_lock_enabled: false,
    profit_lock_start_pips: 0,
    profit_lock_distance_pips: 0,
    sl_trailing_enabled: false,
    sl_trailing_start_pips: 0,
    sl_trailing_distance_pips: 0,
    standard_lot: 100000,
    digits: 5,
    price2pips: 100000,
    default_sl_pips: 0,
  });

  const cleanSymbolData = (symbol: any): SymbolSettings => {
    return {
      symbol: symbol.symbol || '',
      name: symbol.name || '',
      profit_secure_enabled: symbol.profit_secure_enabled || false,
      profit_lock_enabled: symbol.profit_lock_enabled || false,
      profit_lock_start_pips: symbol.profit_lock_start_pips || 0,
      profit_lock_distance_pips: symbol.profit_lock_distance_pips || 0,
      sl_trailing_enabled: symbol.sl_trailing_enabled || false,
      sl_trailing_start_pips: symbol.sl_trailing_start_pips || 0,
      sl_trailing_distance_pips: symbol.sl_trailing_distance_pips || 0,
      standard_lot: symbol.standard_lot || 0,
      digits: symbol.digits || 0,
      price2pips: symbol.price2pips || 0,
      default_sl_pips: symbol.default_sl_pips || 0,
    };
  };

  const fetchSymbols = async () => {
    try {
      const url = new URL(GET_SYMBOLS_URL);
      url.searchParams.append('account_id', selectedAccount);
      
      console.log("Fetching symbols from:", url.toString());
      
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
      console.log("Symbols data:", data);
      
      // Clean the data to ensure all properties have default values
      const cleanedData = data.map(cleanSymbolData);
      console.log("Cleaned symbols data:", cleanedData);
      
      setSymbols(cleanedData);
      setOriginalSymbols(cleanedData);
      setHasUnsavedChanges(false);
      setEditingFields({});
      setError(null);
    } catch (err: any) {
      console.error("Error fetching symbols:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSymbols = async (symbolsToSave: SymbolSettings[]) => {
    try {
      // Clean the data before sending to ensure all properties have default values
      const cleanedSymbolsToSave = symbolsToSave.map(cleanSymbolData);
      console.log("Saving symbols:", cleanedSymbolsToSave);

      const url = new URL(SAVE_SYMBOLS_URL);
      url.searchParams.append('account_id', selectedAccount);

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedSymbolsToSave),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Save response:", result);
      
      return result;
    } catch (err: any) {
      console.error("Error saving symbol settings:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchSymbols();
  }, [selectedAccount]);

  const handleAccountChange = (accountId: string) => {
    setSelectedAccount(accountId);
  };

  const handleAddSymbol = () => {
    setShowAddModal(true);
    // Reset form
    setNewSymbol({
      symbol: '',
      name: '',
      profit_secure_enabled: false,
      profit_lock_enabled: false,
      profit_lock_start_pips: 0,
      profit_lock_distance_pips: 0,
      sl_trailing_enabled: false,
      sl_trailing_start_pips: 0,
      sl_trailing_distance_pips: 0,
      standard_lot: 100000,
      digits: 5,
      price2pips: 100000,
      default_sl_pips: 0,
    });
  };

  const handleNewSymbolChange = (field: string, value: any) => {
    setNewSymbol(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNewSymbolNumberChange = (field: string, value: string) => {
    // Allow empty string and 0 values, store as string to preserve user input
    setNewSymbol(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateSymbol = async () => {
    if (!newSymbol.symbol || !newSymbol.name) {
      setError('Symbol and name are required');
      return;
    }

    // Check if symbol already exists
    if (symbols.some(s => s.symbol === newSymbol.symbol)) {
      setError('Symbol already exists');
      return;
    }

    try {
      // Convert string values to numbers for numeric fields
      const processedSymbol = {
        ...newSymbol,
        standard_lot: (newSymbol.standard_lot as any) === '' ? 100000 : Number(newSymbol.standard_lot) || 100000,
        digits: (newSymbol.digits as any) === '' ? 5 : Number(newSymbol.digits) || 5,
        price2pips: (newSymbol.price2pips as any) === '' ? 100000 : Number(newSymbol.price2pips) || 100000,
        default_sl_pips: (newSymbol.default_sl_pips as any) === '' ? 0 : Number(newSymbol.default_sl_pips) || 0,
        profit_lock_start_pips: (newSymbol.profit_lock_start_pips as any) === '' ? 0 : Number(newSymbol.profit_lock_start_pips) || 0,
        profit_lock_distance_pips: (newSymbol.profit_lock_distance_pips as any) === '' ? 0 : Number(newSymbol.profit_lock_distance_pips) || 0,
        sl_trailing_start_pips: (newSymbol.sl_trailing_start_pips as any) === '' ? 0 : Number(newSymbol.sl_trailing_start_pips) || 0,
        sl_trailing_distance_pips: (newSymbol.sl_trailing_distance_pips as any) === '' ? 0 : Number(newSymbol.sl_trailing_distance_pips) || 0,
      };
      
      const symbolToAdd = cleanSymbolData(processedSymbol);
      const updatedSymbols = [...symbols, symbolToAdd];
      
      setSymbols(updatedSymbols);
      setHasUnsavedChanges(true);
      setShowAddModal(false);
      setError(null);
      
      console.log('New symbol added:', symbolToAdd);
    } catch (err: any) {
      console.error('Error adding symbol:', err);
      setError(err.message);
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setError(null);
  };

  const handleSymbolChange = (symbolName: string, field: string, value: any) => {
      const updatedSymbols = symbols.map(symbol => {
        if (symbol.symbol === symbolName) {
            return {
              ...symbol,
              [field]: value
            };
        }
        return symbol;
      });
      
      setSymbols(updatedSymbols);
    
    // Check if there are unsaved changes
    const hasChanges = JSON.stringify(updatedSymbols) !== JSON.stringify(originalSymbols);
    setHasUnsavedChanges(hasChanges);
      
      console.log(`Updated ${field} for symbol ${symbolName}:`, value);
  };

  const handleSymbolFieldChange = (oldSymbol: string, field: string, value: any) => {
    if (field === 'symbol') {
      // If changing the symbol itself, check for duplicates
      if (value !== oldSymbol && symbols.some(s => s.symbol === value && s.symbol !== oldSymbol)) {
        setError(`Symbol "${value}" already exists`);
        return;
      }
      
      // Clear any previous errors
      if (error) setError(null);
      
      // If changing the symbol itself, we need to handle it specially
      const updatedSymbols = symbols.map(symbol => {
        if (symbol.symbol === oldSymbol) {
            return {
              ...symbol,
              symbol: value
            };
        }
        return symbol;
      });
      
      setSymbols(updatedSymbols);
      
      // Check if there are unsaved changes
      const hasChanges = JSON.stringify(updatedSymbols) !== JSON.stringify(originalSymbols);
      setHasUnsavedChanges(hasChanges);
      
      console.log(`Updated symbol from ${oldSymbol} to ${value}`);
    } else {
      // For other fields, use the regular handler
      handleSymbolChange(oldSymbol, field, value);
    }
  };

  const toggleSymbolExpansion = (symbolName: string) => {
    setExpandedSymbols(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbolName)) {
        newSet.delete(symbolName);
      } else {
        newSet.add(symbolName);
      }
      return newSet;
    });
  };

  const handleSaveChanges = async () => {
    setSaving(prev => ({ ...prev, 'all': true }));
    
    try {
      await saveSymbols(symbols);
      setOriginalSymbols(symbols);
      setHasUnsavedChanges(false);
      console.log('All symbol changes saved successfully');
    } catch (err) {
      console.error("Error saving symbol changes:", err);
      // Revert the changes on error
      setSymbols(originalSymbols);
      setHasUnsavedChanges(false);
    } finally {
      setSaving(prev => ({ ...prev, 'all': false }));
    }
  };

  const handleDiscardChanges = () => {
    setSymbols(originalSymbols);
    setHasUnsavedChanges(false);
    setEditingFields({});
    console.log('Changes discarded');
  };

  const handleInputFocus = (symbolName: string, field: string, currentValue: number) => {
    const fieldKey = `${symbolName}-${field}`;
    if (currentValue === 0) {
      setEditingFields(prev => ({ ...prev, [fieldKey]: '' }));
    }
  };

  const handleInputBlur = (symbolName: string, field: string, currentValue: string) => {
    const fieldKey = `${symbolName}-${field}`;
    if (currentValue === '') {
      setEditingFields(prev => ({ ...prev, [fieldKey]: '0' }));
    }
  };

  const getInputValue = (symbolName: string, field: string, currentValue: number) => {
    const fieldKey = `${symbolName}-${field}`;
    return editingFields[fieldKey] !== undefined ? editingFields[fieldKey] : (currentValue || 0).toString();
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

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-white">Symbol Settings</h1>
            <p className="text-gray-400 mt-1">Configure individual symbol parameters and trading rules</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
             <AccountSelector 
               selectedAccount={selectedAccount}
               onAccountChange={handleAccountChange}
             />
             <button 
               onClick={handleAddSymbol}
               className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors flex items-center space-x-2"
             >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
               </svg>
               <span>Add Symbol</span>
             </button>
            <Link 
              href="/" 
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Back to Dashboard
            </Link>
            <button 
               onClick={fetchSymbols} 
              disabled={loading} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

         {/* Save Changes Bar */}
         {hasUnsavedChanges && (
           <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4 mb-6">
             <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
               <div className="flex items-center space-x-3">
                 <div className="flex-shrink-0">
                   <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                   </svg>
                 </div>
                 <div>
                   <h3 className="text-sm font-medium text-yellow-300">Unsaved Changes</h3>
                   <p className="text-sm text-yellow-400">You have unsaved changes to symbol settings</p>
                 </div>
               </div>
               <div className="flex space-x-2">
                 <button
                   onClick={handleDiscardChanges}
                   disabled={saving['all']}
                   className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
                 >
                   Discard
                 </button>
                 <button
                   onClick={handleSaveChanges}
                   disabled={saving['all']}
                   className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors flex items-center space-x-2"
                 >
                   {saving['all'] && (
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                   )}
                   <span>{saving['all'] ? 'Saving...' : 'Save Changes'}</span>
                 </button>
               </div>
             </div>
           </div>
         )}

        {/* Loading State */}
        {loading && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading symbols...</p>
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
                <h3 className="text-sm font-medium text-red-300">Error loading symbols</h3>
                <div className="mt-2 text-sm text-red-400">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Symbols Grid */}
        {symbols.length > 0 && (
           <div className="space-y-4">
            {symbols.map((symbol) => (
               <div key={symbol.symbol} className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden">
                 {/* Symbol Header - Always Visible */}
                 <div 
                   className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                   onClick={() => toggleSymbolExpansion(symbol.symbol)}
                   onKeyDown={(e) => e.key === 'Enter' && toggleSymbolExpansion(symbol.symbol)}
                   tabIndex={0}
                   aria-label={`Toggle ${symbol.symbol} settings`}
                 >
                   <div className="flex items-center space-x-3">
                     <div className={`w-2 h-2 rounded-full ${
                       symbol.profit_lock_enabled || symbol.sl_trailing_enabled || symbol.profit_secure_enabled 
                         ? 'bg-green-400' 
                         : 'bg-gray-500'
                     }`}></div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{symbol.symbol}</h3>
                    <p className="text-sm text-gray-400">{symbol.name}</p>
                  </div>
                   </div>
                                       <div className="flex items-center space-x-3">
                      {/* Status Indicators */}
                      <div className="flex space-x-1">
                        {symbol.profit_lock_enabled && (
                          <div className="w-2 h-2 rounded-full bg-green-400" title="Profit Lock Enabled"></div>
                        )}
                        {symbol.sl_trailing_enabled && (
                          <div className="w-2 h-2 rounded-full bg-orange-400" title="SL Trailing Enabled"></div>
                        )}
                        {symbol.profit_secure_enabled && (
                          <div className="w-2 h-2 rounded-full bg-purple-400" title="Profit Secure Enabled"></div>
                  )}
                </div>

                      {/* Expand/Collapse Icon */}
                      <svg
                        className={`w-5 h-5 text-gray-400 transform transition-transform ${
                          expandedSymbols.has(symbol.symbol) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                 </div>

                 {/* Symbol Settings - Expandable */}
                 {expandedSymbols.has(symbol.symbol) && (
                   <div className="border-t border-gray-700 p-4">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-blue-400 border-b border-gray-700 pb-1">Basic Info</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Symbol</label>
                      <input
                        type="text"
                        value={symbol.symbol}
                        onChange={(e) => handleSymbolFieldChange(symbol.symbol, 'symbol', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., XAUUSDm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                      <input
                        type="text"
                        value={symbol.name}
                        onChange={(e) => handleSymbolFieldChange(symbol.symbol, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Gold vs US Dollar"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Standard Lot</label>
                      <input
                        type="number"
                              value={getInputValue(symbol.symbol, 'standard_lot', symbol.standard_lot)}
                              onChange={(e) => {
                                const fieldKey = `${symbol.symbol}-standard_lot`;
                                setEditingFields(prev => ({ ...prev, [fieldKey]: e.target.value }));
                                handleSymbolChange(symbol.symbol, 'standard_lot', Number(e.target.value) || 0);
                              }}
                              onFocus={() => handleInputFocus(symbol.symbol, 'standard_lot', symbol.standard_lot)}
                              onBlur={(e) => handleInputBlur(symbol.symbol, 'standard_lot', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Digits</label>
                      <input
                        type="number"
                              value={getInputValue(symbol.symbol, 'digits', symbol.digits)}
                              onChange={(e) => {
                                const fieldKey = `${symbol.symbol}-digits`;
                                setEditingFields(prev => ({ ...prev, [fieldKey]: e.target.value }));
                                handleSymbolChange(symbol.symbol, 'digits', Number(e.target.value) || 0);
                              }}
                              onFocus={() => handleInputFocus(symbol.symbol, 'digits', symbol.digits)}
                              onBlur={(e) => handleInputBlur(symbol.symbol, 'digits', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        max="10"
                            />
                         </div>
                         
                         <div>
                           <label className="block text-sm font-medium text-gray-300 mb-1">Price to Pips</label>
                                                       <input
                              type="number"
                              value={getInputValue(symbol.symbol, 'price2pips', symbol.price2pips)}
                              onChange={(e) => {
                                const fieldKey = `${symbol.symbol}-price2pips`;
                                setEditingFields(prev => ({ ...prev, [fieldKey]: e.target.value }));
                                handleSymbolChange(symbol.symbol, 'price2pips', Number(e.target.value) || 0);
                              }}
                              onFocus={() => handleInputFocus(symbol.symbol, 'price2pips', symbol.price2pips)}
                              onBlur={(e) => handleInputBlur(symbol.symbol, 'price2pips', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              min="1"
                            />
                         </div>
                         
                         <div>
                           <label className="block text-sm font-medium text-gray-300 mb-1">Default SL Pips</label>
                                                       <input
                              type="number"
                              value={getInputValue(symbol.symbol, 'default_sl_pips', symbol.default_sl_pips)}
                              onChange={(e) => {
                                const fieldKey = `${symbol.symbol}-default_sl_pips`;
                                setEditingFields(prev => ({ ...prev, [fieldKey]: e.target.value }));
                                handleSymbolChange(symbol.symbol, 'default_sl_pips', Number(e.target.value) || 0);
                              }}
                              onFocus={() => handleInputFocus(symbol.symbol, 'default_sl_pips', symbol.default_sl_pips)}
                              onBlur={(e) => handleInputBlur(symbol.symbol, 'default_sl_pips', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              min="0"
                      />
                    </div>
                  </div>

                       {/* Trading Features */}
                       <div className="space-y-4">
                         {/* Profit Lock Settings */}
                  <div className="space-y-3">
                           <h4 className="text-sm font-medium text-green-400 border-b border-gray-700 pb-1">Profit Lock</h4>
                    
                    <ToggleButton
                              checked={symbol.profit_lock_enabled}
                              onChange={(value) => handleSymbolChange(symbol.symbol, 'profit_lock_enabled', value)}
                      label="Enabled"
                    />
                    
                           {symbol.profit_lock_enabled && (
                      <>
                        <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-1">Start Pips</label>
                          <input
                            type="number"
                                    value={getInputValue(symbol.symbol, 'profit_lock_start_pips', symbol.profit_lock_start_pips)}
                                    onChange={(e) => {
                                      const fieldKey = `${symbol.symbol}-profit_lock_start_pips`;
                                      setEditingFields(prev => ({ ...prev, [fieldKey]: e.target.value }));
                                      handleSymbolChange(symbol.symbol, 'profit_lock_start_pips', Number(e.target.value) || 0);
                                    }}
                                    onFocus={() => handleInputFocus(symbol.symbol, 'profit_lock_start_pips', symbol.profit_lock_start_pips)}
                                    onBlur={(e) => handleInputBlur(symbol.symbol, 'profit_lock_start_pips', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                          />
                        </div>
                        
                        <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-1">Distance Pips</label>
                          <input
                            type="number"
                                    value={getInputValue(symbol.symbol, 'profit_lock_distance_pips', symbol.profit_lock_distance_pips)}
                                    onChange={(e) => {
                                      const fieldKey = `${symbol.symbol}-profit_lock_distance_pips`;
                                      setEditingFields(prev => ({ ...prev, [fieldKey]: e.target.value }));
                                      handleSymbolChange(symbol.symbol, 'profit_lock_distance_pips', Number(e.target.value) || 0);
                                    }}
                                    onFocus={() => handleInputFocus(symbol.symbol, 'profit_lock_distance_pips', symbol.profit_lock_distance_pips)}
                                    onBlur={(e) => handleInputBlur(symbol.symbol, 'profit_lock_distance_pips', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                          />
                        </div>
                             </>
                           )}
                         </div>

                         {/* SL Trailing Settings */}
                         <div className="space-y-3">
                           <h4 className="text-sm font-medium text-orange-400 border-b border-gray-700 pb-1">SL Trailing</h4>
                           
                                                       <ToggleButton
                              checked={symbol.sl_trailing_enabled}
                              onChange={(value) => handleSymbolChange(symbol.symbol, 'sl_trailing_enabled', value)}
                              label="Enabled"
                            />
                           
                           {symbol.sl_trailing_enabled && (
                             <>
                        <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-1">Start Pips</label>
                          <input
                            type="number"
                                    value={getInputValue(symbol.symbol, 'sl_trailing_start_pips', symbol.sl_trailing_start_pips)}
                                    onChange={(e) => {
                                      const fieldKey = `${symbol.symbol}-sl_trailing_start_pips`;
                                      setEditingFields(prev => ({ ...prev, [fieldKey]: e.target.value }));
                                      handleSymbolChange(symbol.symbol, 'sl_trailing_start_pips', Number(e.target.value) || 0);
                                    }}
                                    onFocus={() => handleInputFocus(symbol.symbol, 'sl_trailing_start_pips', symbol.sl_trailing_start_pips)}
                                    onBlur={(e) => handleInputBlur(symbol.symbol, 'sl_trailing_start_pips', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    min="0"
                          />
                        </div>
                        
                        <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-1">Distance Pips</label>
                          <input
                            type="number"
                                    value={getInputValue(symbol.symbol, 'sl_trailing_distance_pips', symbol.sl_trailing_distance_pips)}
                                    onChange={(e) => {
                                      const fieldKey = `${symbol.symbol}-sl_trailing_distance_pips`;
                                      setEditingFields(prev => ({ ...prev, [fieldKey]: e.target.value }));
                                      handleSymbolChange(symbol.symbol, 'sl_trailing_distance_pips', Number(e.target.value) || 0);
                                    }}
                                    onFocus={() => handleInputFocus(symbol.symbol, 'sl_trailing_distance_pips', symbol.sl_trailing_distance_pips)}
                                    onBlur={(e) => handleInputBlur(symbol.symbol, 'sl_trailing_distance_pips', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                          />
                        </div>
                      </>
                    )}
                         </div>

                         {/* Profit Secure Settings */}
                         <div className="space-y-3">
                           <h4 className="text-sm font-medium text-purple-400 border-b border-gray-700 pb-1">Profit Secure</h4>
                           
                                                       <ToggleButton
                              checked={symbol.profit_secure_enabled}
                              onChange={(value) => handleSymbolChange(symbol.symbol, 'profit_secure_enabled', value)}
                              label="Enabled"
                            />
                         </div>
                  </div>
                </div>
                   </div>
                 )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && symbols.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-300">No symbols found</h3>
            <p className="mt-1 text-sm text-gray-500">There are currently no symbols configured.</p>
          </div>
        )}

        {/* Add Symbol Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h3 className="text-xl font-semibold text-white">Add New Symbol</h3>
                <button
                  onClick={handleCloseAddModal}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Error Display */}
                {error && (
                  <div className="mb-4 bg-red-900/50 border border-red-700 rounded-lg p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-300">Error</h3>
                        <div className="mt-1 text-sm text-red-400">{error}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white">Basic Information</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Symbol *</label>
                        <input
                          type="text"
                          value={newSymbol.symbol || ''}
                          onChange={(e) => handleNewSymbolChange('symbol', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., XAUUSDm"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                        <input
                          type="text"
                          value={newSymbol.name || ''}
                          onChange={(e) => handleNewSymbolChange('name', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., Gold vs US Dollar"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Symbol Properties */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white">Symbol Properties</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Standard Lot</label>
                        <input
                          type="number"
                          value={newSymbol.standard_lot || ''}
                          onChange={(e) => handleNewSymbolNumberChange('standard_lot', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min="0"
                          placeholder="100000"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Digits</label>
                        <input
                          type="number"
                          value={newSymbol.digits || ''}
                          onChange={(e) => handleNewSymbolNumberChange('digits', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min="0"
                          max="10"
                          placeholder="5"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Price to Pips</label>
                        <input
                          type="number"
                          value={newSymbol.price2pips || ''}
                          onChange={(e) => handleNewSymbolNumberChange('price2pips', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min="0"
                          placeholder="100000"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Default SL Pips</label>
                        <input
                          type="number"
                          value={newSymbol.default_sl_pips || ''}
                          onChange={(e) => handleNewSymbolNumberChange('default_sl_pips', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min="0"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Trading Features */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white">Trading Features</h4>
                    
                    <div className="space-y-4">
                      {/* Profit Lock */}
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-medium text-green-400">Profit Lock</h5>
                          <ToggleButton
                            checked={newSymbol.profit_lock_enabled || false}
                            onChange={(value) => handleNewSymbolChange('profit_lock_enabled', value)}
                            label=""
                          />
                        </div>
                        
                        {(newSymbol.profit_lock_enabled) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Start Pips</label>
                              <input
                                type="number"
                                value={newSymbol.profit_lock_start_pips || ''}
                                onChange={(e) => handleNewSymbolNumberChange('profit_lock_start_pips', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="0"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Distance Pips</label>
                              <input
                                type="number"
                                value={newSymbol.profit_lock_distance_pips || ''}
                                onChange={(e) => handleNewSymbolNumberChange('profit_lock_distance_pips', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="0"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SL Trailing */}
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-medium text-orange-400">SL Trailing</h5>
                          <ToggleButton
                            checked={newSymbol.sl_trailing_enabled || false}
                            onChange={(value) => handleNewSymbolChange('sl_trailing_enabled', value)}
                            label=""
                          />
                        </div>
                        
                        {(newSymbol.sl_trailing_enabled) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Start Pips</label>
                              <input
                                type="number"
                                value={newSymbol.sl_trailing_start_pips || ''}
                                onChange={(e) => handleNewSymbolNumberChange('sl_trailing_start_pips', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="0"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Distance Pips</label>
                              <input
                                type="number"
                                value={newSymbol.sl_trailing_distance_pips || ''}
                                onChange={(e) => handleNewSymbolNumberChange('sl_trailing_distance_pips', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="0"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Profit Secure */}
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium text-purple-400">Profit Secure</h5>
                          <ToggleButton
                            checked={newSymbol.profit_secure_enabled || false}
                            onChange={(value) => handleNewSymbolChange('profit_secure_enabled', value)}
                            label=""
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-700">
                <button
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSymbol}
                  disabled={!newSymbol.symbol || !newSymbol.name}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add Symbol</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
