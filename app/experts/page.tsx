"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "http://198.23.206.54";
const GET_EXPERTS_URL = `${API_URL}/getexperts`;
const SAVE_EXPERTS_URL = `${API_URL}/saveexperts`;

type Expert = {
  name: string;
  enabled: boolean;
  buy_only: boolean;
  lot_size: number;
  "multi-actions": boolean;
  "multi-tp": boolean;
  tp_enabled: boolean;
  tp_when_in_profit: boolean;
  signal_in_same_direction: boolean;
  volume_keep: number;
  last_signal: string;
};

export default function ExpertsPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalExperts, setOriginalExperts] = useState<Expert[]>([]);
  const [editingFields, setEditingFields] = useState<{ [key: string]: string }>({});
  const [expandedExperts, setExpandedExperts] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpertName, setNewExpertName] = useState("");
  const [editingExpertName, setEditingExpertName] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  const cleanExpertData = (expert: any): Expert => {
    // Remove duplicate fields and ensure consistent field names
    const { multi_actions, multi_tp, ...cleanedExpert } = expert;
    
    return {
      ...cleanedExpert,
      "multi-actions": expert["multi-actions"] !== undefined ? expert["multi-actions"] : expert.multi_actions || false,
      "multi-tp": expert["multi-tp"] !== undefined ? expert["multi-tp"] : expert.multi_tp || false,
    } as Expert;
  };

  const fetchExperts = async () => {
    try {
      console.log("Fetching experts from:", GET_EXPERTS_URL);
      
      const response = await fetch(GET_EXPERTS_URL, {
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
      console.log("Experts data:", data);
      
      // Clean the data to remove duplicate fields
      const cleanedData = data.map(cleanExpertData);
      console.log("Cleaned experts data:", cleanedData);
      
      setExperts(cleanedData);
      setOriginalExperts(cleanedData);
      setHasUnsavedChanges(false);
      setEditingFields({});
      setError(null);
    } catch (err: any) {
      console.error("Error fetching experts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveExperts = async (expertsToSave: Expert[]) => {
    try {
      // Clean the data before sending to ensure no duplicate fields
      const cleanedExpertsToSave = expertsToSave.map(cleanExpertData);
      console.log("Saving experts:", cleanedExpertsToSave);

      const response = await fetch(SAVE_EXPERTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedExpertsToSave),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Save response:", result);
      
      return result;
    } catch (err: any) {
      console.error("Error saving experts:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchExperts();
  }, []);

  const toggleExpertExpansion = (expertName: string) => {
    setExpandedExperts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(expertName)) {
        newSet.delete(expertName);
      } else {
        newSet.add(expertName);
      }
      return newSet;
    });
  };

  const handleExpertChange = (expertName: string, field: string, value: any) => {
    const updatedExperts = experts.map(expert => {
      if (expert.name === expertName) {
        return {
          ...expert,
          [field]: value
        };
      }
      return expert;
    });
    
    setExperts(updatedExperts);
    
    // Check if there are unsaved changes
    const hasChanges = JSON.stringify(updatedExperts) !== JSON.stringify(originalExperts);
    setHasUnsavedChanges(hasChanges);
    
    console.log(`Updated ${field} for expert ${expertName}:`, value);
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    
    try {
      await saveExperts(experts);
      setOriginalExperts(experts);
      setHasUnsavedChanges(false);
      console.log('All expert changes saved successfully');
    } catch (err) {
      console.error("Error saving expert changes:", err);
      // Revert the changes on error
      setExperts(originalExperts);
      setHasUnsavedChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setExperts(originalExperts);
    setHasUnsavedChanges(false);
    setEditingFields({});
    console.log('Changes discarded');
  };

  const handleAddNewExpert = () => {
    setNewExpertName("");
    setShowAddModal(true);
  };

  const handleCreateExpert = () => {
    if (!newExpertName.trim()) {
      alert("Please enter a name for the expert");
      return;
    }

    // Check if name already exists
    if (experts.some(expert => expert.name === newExpertName.trim())) {
      alert("An expert with this name already exists");
      return;
    }

    const newExpert: Expert = {
      name: newExpertName.trim(),
      enabled: false,
      buy_only: false,
      lot_size: 0.01,
      "multi-actions": false,
      "multi-tp": false,
      tp_enabled: false,
      tp_when_in_profit: false,
      signal_in_same_direction: true,
      volume_keep: 0,
      last_signal: "buy"
    };

    const updatedExperts = [...experts, newExpert];
    setExperts(updatedExperts);
    
    // Check if there are unsaved changes
    const hasChanges = JSON.stringify(updatedExperts) !== JSON.stringify(originalExperts);
    setHasUnsavedChanges(hasChanges);
    
    // Auto-expand the new expert
    setExpandedExperts(prev => new Set([...prev, newExpert.name]));
    
    // Close modal and reset
    setShowAddModal(false);
    setNewExpertName("");
    
    console.log('Added new expert:', newExpert.name);
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setNewExpertName("");
  };

  const handleStartEditName = (expertName: string) => {
    setEditingExpertName(expertName);
    setEditingNameValue(expertName);
  };

  const handleSaveName = (oldName: string) => {
    const newName = editingNameValue.trim();
    
    if (!newName) {
      alert("Expert name cannot be empty");
      return;
    }

    if (newName === oldName) {
      setEditingExpertName(null);
      setEditingNameValue("");
      return;
    }

    // Check if name already exists
    if (experts.some(expert => expert.name === newName)) {
      alert("An expert with this name already exists");
      return;
    }

    // Update the expert name
    const updatedExperts = experts.map(expert => {
      if (expert.name === oldName) {
        return {
          ...expert,
          name: newName
        };
      }
      return expert;
    });

    setExperts(updatedExperts);
    
    // Check if there are unsaved changes
    const hasChanges = JSON.stringify(updatedExperts) !== JSON.stringify(originalExperts);
    setHasUnsavedChanges(hasChanges);
    
    // Update expanded set with new name
    setExpandedExperts(prev => {
      const newSet = new Set(prev);
      newSet.delete(oldName);
      newSet.add(newName);
      return newSet;
    });

    setEditingExpertName(null);
    setEditingNameValue("");
    
    console.log(`Renamed expert from "${oldName}" to "${newName}"`);
  };

  const handleCancelEditName = () => {
    setEditingExpertName(null);
    setEditingNameValue("");
  };

  const handleDeleteExpert = (expertName: string) => {
    if (window.confirm(`Are you sure you want to delete "${expertName}"?`)) {
      const updatedExperts = experts.filter(expert => expert.name !== expertName);
      setExperts(updatedExperts);
      
      // Check if there are unsaved changes
      const hasChanges = JSON.stringify(updatedExperts) !== JSON.stringify(originalExperts);
      setHasUnsavedChanges(hasChanges);
      
      // Remove from expanded set
      setExpandedExperts(prev => {
        const newSet = new Set(prev);
        newSet.delete(expertName);
        return newSet;
      });
      
      console.log('Deleted expert:', expertName);
    }
  };

  const handleInputFocus = (expertName: string, field: string, currentValue: number) => {
    const fieldKey = `${expertName}-${field}`;
    if (currentValue === 0) {
      setEditingFields(prev => ({ ...prev, [fieldKey]: '' }));
    }
  };

  const handleInputBlur = (expertName: string, field: string, currentValue: string) => {
    const fieldKey = `${expertName}-${field}`;
    if (currentValue === '') {
      setEditingFields(prev => ({ ...prev, [fieldKey]: '0' }));
    }
  };

  const getInputValue = (expertName: string, field: string, currentValue: number) => {
    const fieldKey = `${expertName}-${field}`;
    return editingFields[fieldKey] !== undefined ? editingFields[fieldKey] : currentValue.toString();
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
            <h1 className="text-3xl font-bold text-white">Expert Advisors</h1>
            <p className="text-gray-400 mt-1">Manage and configure trading expert advisors</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link 
              href="/" 
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Back to Dashboard
            </Link>
            <button 
              onClick={handleAddNewExpert} 
              disabled={loading} 
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add New Expert</span>
            </button>
            <button 
              onClick={fetchExperts} 
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
                  <p className="text-sm text-yellow-400">You have unsaved changes to expert settings</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleDiscardChanges}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {saving && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading experts...</p>
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
                <h3 className="text-sm font-medium text-red-300">Error loading experts</h3>
                <div className="mt-2 text-sm text-red-400">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Experts Grid */}
        {experts.length > 0 && (
          <div className="space-y-4">
            {experts.map((expert) => {
              const isExpanded = expandedExperts.has(expert.name);
              return (
                <div key={expert.name} className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden">
                  {/* Expert Header - Always Visible */}
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                    onClick={() => toggleExpertExpansion(expert.name)}
                    onKeyDown={(e) => e.key === 'Enter' && toggleExpertExpansion(expert.name)}
                    tabIndex={0}
                    aria-label={`Toggle ${expert.name} settings`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${expert.enabled ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                      <div className="flex-1">
                        {editingExpertName === expert.name ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingNameValue}
                              onChange={(e) => setEditingNameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveName(expert.name);
                                } else if (e.key === 'Escape') {
                                  handleCancelEditName();
                                }
                              }}
                              onBlur={() => handleSaveName(expert.name)}
                              className="text-lg font-semibold text-white bg-gray-700 border border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              autoFocus
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveName(expert.name);
                              }}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              title="Save name"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEditName();
                              }}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Cancel edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 group">
                            <h3 
                              className="text-lg font-semibold text-white cursor-pointer hover:text-blue-300 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditName(expert.name);
                              }}
                              title="Click to edit name"
                            >
                              {expert.name}
                            </h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditName(expert.name);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-300 transition-all"
                              title="Edit name"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        )}
                        <p className="text-sm text-gray-400">Last Signal: {expert.last_signal}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {/* Status Indicators */}
                      <div className="flex space-x-1">
                        {expert.enabled && (
                          <div className="w-2 h-2 rounded-full bg-green-400" title="Enabled"></div>
                        )}
                        {expert.buy_only && (
                          <div className="w-2 h-2 rounded-full bg-blue-400" title="Buy Only"></div>
                        )}
                        {expert.tp_enabled && (
                          <div className="w-2 h-2 rounded-full bg-orange-400" title="TP Enabled"></div>
                        )}
                      </div>
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExpert(expert.name);
                        }}
                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                        title="Delete Expert"
                        aria-label={`Delete ${expert.name}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      
                      {/* Expand/Collapse Icon */}
                      <svg
                        className={`w-5 h-5 text-gray-400 transform transition-transform ${
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

                  {/* Expert Settings - Expandable */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 p-4">
                      <div className="space-y-4">
                        {/* Basic Settings */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-blue-400 border-b border-gray-700 pb-1">Basic Settings</h4>
                          
                          <ToggleButton
                            checked={expert.enabled}
                            onChange={(value) => handleExpertChange(expert.name, 'enabled', value)}
                            label="Enabled"
                          />
                          
                          <ToggleButton
                            checked={expert.buy_only}
                            onChange={(value) => handleExpertChange(expert.name, 'buy_only', value)}
                            label="Buy Only"
                          />
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Lot Size</label>
                            <input
                              type="number"
                              value={getInputValue(expert.name, 'lot_size', expert.lot_size)}
                              onChange={(e) => {
                                const fieldKey = `${expert.name}-lot_size`;
                                setEditingFields(prev => ({ ...prev, [fieldKey]: e.target.value }));
                                handleExpertChange(expert.name, 'lot_size', Number(e.target.value) || 0);
                              }}
                              onFocus={() => handleInputFocus(expert.name, 'lot_size', expert.lot_size)}
                              onBlur={(e) => handleInputBlur(expert.name, 'lot_size', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              min="0.01"
                              step="0.01"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Volume Keep</label>
                            <input
                              type="number"
                              value={getInputValue(expert.name, 'volume_keep', expert.volume_keep)}
                              onChange={(e) => {
                                const fieldKey = `${expert.name}-volume_keep`;
                                setEditingFields(prev => ({ ...prev, [fieldKey]: e.target.value }));
                                handleExpertChange(expert.name, 'volume_keep', Number(e.target.value) || 0);
                              }}
                              onFocus={() => handleInputFocus(expert.name, 'volume_keep', expert.volume_keep)}
                              onBlur={(e) => handleInputBlur(expert.name, 'volume_keep', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>

                        {/* Trading Settings */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-green-400 border-b border-gray-700 pb-1">Trading Settings</h4>
                          
                          <ToggleButton
                                            checked={expert["multi-actions"]}
                onChange={(value) => handleExpertChange(expert.name, 'multi-actions', value)}
                            label="Multi Actions"
                          />
                          
                          <ToggleButton
                            checked={expert.signal_in_same_direction}
                            onChange={(value) => handleExpertChange(expert.name, 'signal_in_same_direction', value)}
                            label="Signal in Same Direction"
                          />
                        </div>

                        {/* Take Profit Settings */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-orange-400 border-b border-gray-700 pb-1">Take Profit Settings</h4>
                          
                          <ToggleButton
                            checked={expert.tp_enabled}
                            onChange={(value) => handleExpertChange(expert.name, 'tp_enabled', value)}
                            label="TP Enabled"
                          />
                          
                          <ToggleButton
                            checked={expert.tp_when_in_profit}
                            onChange={(value) => handleExpertChange(expert.name, 'tp_when_in_profit', value)}
                            label="TP When in Profit"
                          />
                          
                          <ToggleButton
                                            checked={expert["multi-tp"]}
                onChange={(value) => handleExpertChange(expert.name, 'multi-tp', value)}
                            label="Multi TP"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && experts.length === 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-300">No experts found</h3>
            <p className="mt-1 text-sm text-gray-500">There are currently no expert advisors configured.</p>
          </div>
        )}

        {/* Add Expert Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Add New Expert</h3>
                <button
                  onClick={handleCancelAdd}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="expertName" className="block text-sm font-medium text-gray-300 mb-2">
                    Expert Name
                  </label>
                  <input
                    id="expertName"
                    type="text"
                    value={newExpertName}
                    onChange={(e) => setNewExpertName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateExpert();
                      } else if (e.key === 'Escape') {
                        handleCancelAdd();
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter expert name..."
                    autoFocus
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleCancelAdd}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateExpert}
                    disabled={!newExpertName.trim()}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Create Expert
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
