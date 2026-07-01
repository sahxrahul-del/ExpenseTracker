import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  TRANSACTIONS: "@fintracker_transactions",
  ACCOUNTS: "@fintracker_accounts",
  BUDGETS: "@fintracker_budgets",
  RECURRING: "@fintracker_recurring",
  SETTINGS: "@fintracker_settings",
};

const CHUNK_THRESHOLD = 500 * 1024;
const CHUNK_SIZE = 400 * 1024;

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

async function saveLargeData(key, data) {
  try {
    const str = JSON.stringify(data);
    const checksum = simpleHash(str);
    const payload = JSON.stringify({ data, checksum });
    if (payload.length < CHUNK_THRESHOLD) {
      await AsyncStorage.setItem(key, payload);
      return true;
    }
    const metaKey = key + "_meta";
    const chunks = [];
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      chunks.push(payload.slice(i, i + CHUNK_SIZE));
    }
    await AsyncStorage.setItem(metaKey, JSON.stringify({ count: chunks.length }));
    const pairs = chunks.map((chunk, i) => [key + "_c" + i, chunk]);
    await AsyncStorage.multiSet(pairs);
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error("Error saving large data:", error);
    return false;
  }
}

async function loadLargeData(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    let payload;
    if (raw !== null) {
      payload = raw;
    } else {
      const metaRaw = await AsyncStorage.getItem(key + "_meta");
      if (!metaRaw) return null;
      const { count } = JSON.parse(metaRaw);
      const chunkKeys = Array.from({ length: count }, (_, i) => key + "_c" + i);
      const pairs = await AsyncStorage.multiGet(chunkKeys);
      payload = pairs.map(([, val]) => val).join("");
    }
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === "object" && "checksum" in parsed) {
      const expected = parsed.checksum;
      const actual = simpleHash(JSON.stringify(parsed.data));
      if (expected !== actual) {
        console.error("Data integrity check failed for", key);
        return null;
      }
      return parsed.data;
    }
    return parsed;
  } catch (error) {
    console.error("Error loading large data:", error);
    return null;
  }
}

export async function saveTransactions(transactions) {
  return saveLargeData(KEYS.TRANSACTIONS, transactions);
}

export async function loadTransactions() {
  const data = await loadLargeData(KEYS.TRANSACTIONS);
  return data || [];
}

export async function saveAccounts(accounts) {
  return saveLargeData(KEYS.ACCOUNTS, accounts);
}

export async function loadAccounts() {
  const data = await loadLargeData(KEYS.ACCOUNTS);
  return data || [];
}

export async function saveBudgets(budgets) {
  return saveLargeData(KEYS.BUDGETS, budgets);
}

export async function loadBudgets() {
  const data = await loadLargeData(KEYS.BUDGETS);
  return data || [];
}

export async function saveSettings(settings) {
  try {
    const str = JSON.stringify(settings);
    const checksum = simpleHash(str);
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify({ data: settings, checksum }));
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    return false;
  }
}

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (!raw) return { autoExport: false, exportFormat: "PDF", dailyReminder: false };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "checksum" in parsed) {
      const expected = parsed.checksum;
      const actual = simpleHash(JSON.stringify(parsed.data));
      if (expected !== actual) {
        console.error("Data integrity check failed for settings");
        return { autoExport: false, exportFormat: "PDF", dailyReminder: false };
      }
      return parsed.data;
    }
    return parsed;
  } catch (error) {
    console.error("Error loading settings:", error);
    return { autoExport: false, exportFormat: "PDF", dailyReminder: false };
  }
}

export async function clearAllData() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const dataKeys = allKeys.filter((k) => k.startsWith("@fintracker_"));
    await AsyncStorage.multiRemove(dataKeys);
    return true;
  } catch (error) {
    console.error("Error clearing data:", error);
    return false;
  }
}

export async function exportAllData() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const dataKeys = keys.filter((k) => k.startsWith("@fintracker_"));
    const pairs = await AsyncStorage.multiGet(dataKeys);
    const allData = {};
    for (const [key, value] of pairs) {
      try {
        allData[key] = value ? JSON.parse(value) : null;
      } catch (e) {
        console.debug("Failed to parse stored value for key", key, e);
        allData[key] = value;
      }
    }
    return allData;
  } catch (error) {
    console.error("Error exporting data:", error);
    return null;
  }
}

export async function importAllData(data) {
  try {
    const pairs = Object.entries(data).map(([key, value]) => [
      key,
      typeof value === "string" ? value : JSON.stringify(value),
    ]);
    await AsyncStorage.multiSet(pairs);
    return true;
  } catch (error) {
    console.error("Error importing data:", error);
    return false;
  }
}
