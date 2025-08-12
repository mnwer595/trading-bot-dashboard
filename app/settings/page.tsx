"use client";

import { useState } from "react";

// Mock data for accounts
const mockAccounts = [
  {
    id: "acc1",
    name: "Account 1",
    generalSettings: {
      risk: "Medium",
      mode: "Auto",
      telegram: "@trader1",
      maxDrawdown: 10,
      stopLoss: 5,
      takeProfit: 15,
    },
  },
  {
    id: "acc2",
    name: "Account 2",
    generalSettings: {
      risk: "High",
      mode: "Manual",
      telegram: "@trader2",
      maxDrawdown: 20,
      stopLoss: 10,
      takeProfit: 25,
    },
  },
];

type Account = typeof mockAccounts[number];
type GeneralSettings = Account["generalSettings"];

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>(mockAccounts);
  const [selectedId, setSelectedId] = useState<string>(accounts[0].id);

  const selectedAccount = accounts.find((acc) => acc.id === selectedId)!;

  const handleAccountChange = (id: string) => {
    setSelectedId(id);
  };

  const handleSettingChange = (field: keyof GeneralSettings, value: string | number) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === selectedId
          ? { ...acc, generalSettings: { ...acc.generalSettings, [field]: value } }
          : acc
      )
    );
  };

  const handleSave = () => {
    // Here you would typically send the settings to your backend API
    console.log("Saving settings for account:", selectedId, selectedAccount.generalSettings);
    alert("Settings saved successfully!");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Account Selection Sidebar */}
          <aside className="w-full sm:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
              <h2 className="text-lg font-semibold mb-4">Select Account</h2>
              <div className="flex flex-col gap-2">
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    className={`w-full text-left px-4 py-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      acc.id === selectedId
                        ? "bg-blue-600 text-white dark:bg-blue-500"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                    onClick={() => handleAccountChange(acc.id)}
                    aria-label={`Select ${acc.name}`}
                    tabIndex={0}
                  >
                    {acc.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Settings Form */}
          <main className="flex-1">
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{selectedAccount.name} - General Settings</h1>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={handleSave}
                  aria-label="Save settings"
                  tabIndex={0}
                >
                  Save Settings
                </button>
              </div>

              <form className="space-y-6">
                {/* Trading Settings */}
                <section>
                  <h3 className="text-lg font-semibold mb-4 text-blue-600 dark:text-blue-400">Trading Settings</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-2">
                      <span className="font-medium">Risk Level</span>
                      <select
                        className="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedAccount.generalSettings.risk}
                        onChange={(e) => handleSettingChange("risk", e.target.value)}
                        aria-label="Risk level"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="font-medium">Trading Mode</span>
                      <select
                        className="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedAccount.generalSettings.mode}
                        onChange={(e) => handleSettingChange("mode", e.target.value)}
                        aria-label="Trading mode"
                      >
                        <option value="Manual">Manual</option>
                        <option value="Auto">Auto</option>
                        <option value="Semi-Auto">Semi-Auto</option>
                      </select>
                    </label>
                  </div>
                </section>

                {/* Risk Management */}
                <section>
                  <h3 className="text-lg font-semibold mb-4 text-green-600 dark:text-green-400">Risk Management</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <label className="flex flex-col gap-2">
                      <span className="font-medium">Max Drawdown (%)</span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        className="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedAccount.generalSettings.maxDrawdown}
                        onChange={(e) => handleSettingChange("maxDrawdown", Number(e.target.value))}
                        aria-label="Maximum drawdown percentage"
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="font-medium">Stop Loss (%)</span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        className="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedAccount.generalSettings.stopLoss}
                        onChange={(e) => handleSettingChange("stopLoss", Number(e.target.value))}
                        aria-label="Stop loss percentage"
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="font-medium">Take Profit (%)</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedAccount.generalSettings.takeProfit}
                        onChange={(e) => handleSettingChange("takeProfit", Number(e.target.value))}
                        aria-label="Take profit percentage"
                      />
                    </label>
                  </div>
                </section>

                {/* Notifications */}
                <section>
                  <h3 className="text-lg font-semibold mb-4 text-purple-600 dark:text-purple-400">Notifications</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-2">
                      <span className="font-medium">Telegram Channel</span>
                      <input
                        type="text"
                        className="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedAccount.generalSettings.telegram}
                        onChange={(e) => handleSettingChange("telegram", e.target.value)}
                        placeholder="@channel_name"
                        aria-label="Telegram channel"
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="font-medium">Email Notifications</span>
                      <select
                        className="rounded border border-zinc-300 dark:border-zinc-600 px-3 py-2 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Email notification preference"
                      >
                        <option value="all">All Notifications</option>
                        <option value="trades">Trade Notifications Only</option>
                        <option value="errors">Error Notifications Only</option>
                        <option value="none">No Email Notifications</option>
                      </select>
                    </label>
                  </div>
                </section>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
} 