import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, useRef } from "react";
import { todayISO, nowTimestamp, getMonthYearString } from "../utils/dateUtils";
import {
  loadTransactions,
  saveTransactions,
  loadAccounts,
  saveAccounts,
  loadBudgets,
  saveBudgets,
  loadSettings,
  saveSettings,
  clearAllData as clearAllStorage,
} from "../utils/storage";
import { checkAndRunAutoExport } from "../utils/autoExport";

const DataContext = createContext();
const SettingsContext = createContext();
const UIContext = createContext();

const initialState = {
  transactions: [],
  accounts: [],
  budgets: [],
  settings: { autoExport: false, exportFormat: "PDF", dailyReminder: false },
  selectedDate: todayISO(),
  selectedMonthYear: getMonthYearString(),
  selectedTimePeriod: 30,
  isLoading: true,
  error: null,
};

function appReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "LOAD_DATA":
      return {
        ...state,
        transactions: action.payload.transactions || [],
        accounts: action.payload.accounts || [],
        budgets: action.payload.budgets || [],
        settings: action.payload.settings || initialState.settings,
        isLoading: false,
      };
    case "ADD_TRANSACTION":
      return { ...state, transactions: [action.payload, ...state.transactions] };
    case "ADD_MULTIPLE_TRANSACTIONS":
      return { ...state, transactions: [...action.payload, ...state.transactions] };
    case "EDIT_TRANSACTION":
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload } : t
        ),
      };
    case "DELETE_TRANSACTION":
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.payload) };
    case "ADD_ACCOUNT":
      return { ...state, accounts: [...state.accounts, action.payload] };
    case "EDIT_ACCOUNT":
      return {
        ...state,
        accounts: state.accounts.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload } : a
        ),
      };
    case "DELETE_ACCOUNT":
      return { ...state, accounts: state.accounts.filter((a) => a.id !== action.payload) };
    case "SET_BUDGET":
      return { ...state, budgets: action.payload };
    case "ADD_BUDGET":
      return { ...state, budgets: [...state.budgets, action.payload] };
    case "EDIT_BUDGET":
      return {
        ...state,
        budgets: state.budgets.map((b) =>
          b.id === action.payload.id ? { ...b, ...action.payload } : b
        ),
      };
    case "DELETE_BUDGET":
      return { ...state, budgets: state.budgets.filter((b) => b.id !== action.payload) };
    case "UPDATE_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case "SET_SELECTED_DATE":
      return { ...state, selectedDate: action.payload };
    case "SET_SELECTED_MONTH":
      return { ...state, selectedMonthYear: action.payload };
    case "SET_TIME_PERIOD":
      return { ...state, selectedTimePeriod: action.payload };
    case "CLEAR_ALL":
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const [transactions, accounts, budgets, settings] = await Promise.all([
        loadTransactions(),
        loadAccounts(),
        loadBudgets(),
        loadSettings(),
      ]);
      dispatch({
        type: "LOAD_DATA",
        payload: { transactions, accounts, budgets, settings },
      });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: "Failed to load data" });
    }
  }

  const addTransaction = useCallback((transaction) => {
    const newTx = {
      ...transaction,
      id: transaction.id || (transaction.type === "income" ? "inc_" : "exp_") + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      timestamp: transaction.timestamp || nowTimestamp(),
      date: transaction.date || todayISO(),
    };
    dispatch({ type: "ADD_TRANSACTION", payload: newTx });
    return newTx;
  }, []);

  const addMultipleTransactions = useCallback((transactions) => {
    const now = Date.now();
    const newTxs = transactions.map((tx, i) => ({
      ...tx,
      id: (tx.type === "income" ? "inc_" : "exp_") + (now + i) + "_" + Math.random().toString(36).slice(2, 8),
      timestamp: now + i,
      date: tx.date || todayISO(),
    }));
    dispatch({ type: "ADD_MULTIPLE_TRANSACTIONS", payload: newTxs });
    return newTxs;
  }, []);

  const editTransaction = useCallback((id, updates) => {
    dispatch({ type: "EDIT_TRANSACTION", payload: { id, ...updates } });
  }, []);

  const deleteTransaction = useCallback((id) => {
    dispatch({ type: "DELETE_TRANSACTION", payload: id });
  }, []);

  const addAccount = useCallback((account) => {
    const newAcc = {
      ...account,
      id: account.id || "acc_" + Date.now() + Math.random(),
      createdDate: account.createdDate || todayISO(),
    };
    dispatch({ type: "ADD_ACCOUNT", payload: newAcc });
    return newAcc;
  }, []);

  const editAccount = useCallback((id, updates) => {
    dispatch({ type: "EDIT_ACCOUNT", payload: { id, ...updates } });
  }, []);

  const deleteAccount = useCallback((id) => {
    dispatch({ type: "DELETE_ACCOUNT", payload: id });
  }, []);

  const setBudget = useCallback((budgets) => {
    dispatch({ type: "SET_BUDGET", payload: budgets });
  }, []);

  const addBudget = useCallback((budget) => {
    const newBudget = {
      ...budget,
      id: budget.id || "bud_" + Date.now() + Math.random(),
    };
    dispatch({ type: "ADD_BUDGET", payload: newBudget });
    return newBudget;
  }, []);

  const editBudget = useCallback((id, updates) => {
    dispatch({ type: "EDIT_BUDGET", payload: { id, ...updates } });
  }, []);

  const deleteBudget = useCallback((id) => {
    dispatch({ type: "DELETE_BUDGET", payload: id });
  }, []);

  const updateSettings = useCallback((settings) => {
    dispatch({ type: "UPDATE_SETTINGS", payload: settings });
  }, []);

  const clearAllData = useCallback(async () => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeQueue.current = {};
    await clearAllStorage();
    dispatch({ type: "CLEAR_ALL" });
  }, []);

  const setSelectedDate = useCallback((date) => {
    dispatch({ type: "SET_SELECTED_DATE", payload: date });
  }, []);

  const setSelectedMonth = useCallback((monthYear) => {
    dispatch({ type: "SET_SELECTED_MONTH", payload: monthYear });
  }, []);

  const setTimePeriod = useCallback((days) => {
    dispatch({ type: "SET_TIME_PERIOD", payload: days });
  }, []);

  // Debounced write queue to prevent concurrent save race conditions
  const writeQueue = useRef({});
  const writeTimer = useRef(null);

  const scheduleWrite = useCallback((key, data, saveFn) => {
    writeQueue.current[key] = { data, saveFn };
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(async () => {
      const entries = Object.entries(writeQueue.current);
      writeQueue.current = {};
      for (const [, entry] of entries) {
        try {
          await entry.saveFn(entry.data);
        } catch (e) {
          console.warn("Persist failed for", entry.saveFn.name, e);
        }
      }
    }, 300);
  }, []);

  // Flush write queue on unmount to prevent data loss
  useEffect(() => {
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
      const entries = Object.entries(writeQueue.current);
      writeQueue.current = {};
      for (const [, entry] of entries) {
        entry.saveFn(entry.data).catch(e =>
          console.warn("Unmount persist failed for", entry.saveFn.name, e)
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!state.isLoading) {
      scheduleWrite("transactions", state.transactions, saveTransactions);
      scheduleWrite("accounts", state.accounts, saveAccounts);
      scheduleWrite("budgets", state.budgets, saveBudgets);
      scheduleWrite("settings", state.settings, saveSettings);
    }
  }, [state.isLoading, state.transactions, state.accounts, state.budgets, state.settings, scheduleWrite]);

  useEffect(() => {
    if (!state.isLoading) {
      checkAndRunAutoExport(
        state.transactions,
        state.settings
      );
    }
  }, [state.isLoading, state.settings.autoExport]);

  const refreshData = useCallback(async () => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    const entries = Object.entries(writeQueue.current);
    writeQueue.current = {};
    for (const [, entry] of entries) {
      try {
        await entry.saveFn(entry.data);
      } catch (e) {
        console.warn("Persist failed for", entry.saveFn.name, e);
      }
    }
    loadInitialData();
  }, []);

  // Separate memoized context values so each context only updates when its slice changes
  const dataValue = useMemo(() => ({
    transactions: state.transactions,
    accounts: state.accounts,
    budgets: state.budgets,
    addTransaction,
    addMultipleTransactions,
    editTransaction,
    deleteTransaction,
    addAccount,
    editAccount,
    deleteAccount,
    setBudget,
    addBudget,
    editBudget,
    deleteBudget,
    clearAllData,
    refreshData,
  }), [
    state.transactions, state.accounts, state.budgets,
    addTransaction, addMultipleTransactions, editTransaction, deleteTransaction,
    addAccount, editAccount, deleteAccount,
    setBudget, addBudget, editBudget, deleteBudget,
    clearAllData, refreshData,
  ]);

  const settingsValue = useMemo(() => ({
    settings: state.settings,
    updateSettings,
  }), [state.settings, updateSettings]);

  const uiValue = useMemo(() => ({
    selectedDate: state.selectedDate,
    selectedMonthYear: state.selectedMonthYear,
    selectedTimePeriod: state.selectedTimePeriod,
    isLoading: state.isLoading,
    error: state.error,
    setSelectedDate,
    setSelectedMonth,
    setTimePeriod,
  }), [
    state.selectedDate, state.selectedMonthYear, state.selectedTimePeriod,
    state.isLoading, state.error,
    setSelectedDate, setSelectedMonth, setTimePeriod,
  ]);

  return (
    <DataContext.Provider value={dataValue}>
      <SettingsContext.Provider value={settingsValue}>
        <UIContext.Provider value={uiValue}>
          {children}
        </UIContext.Provider>
      </SettingsContext.Provider>
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within AppProvider");
  return ctx;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within AppProvider");
  return ctx;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within AppProvider");
  return ctx;
}
