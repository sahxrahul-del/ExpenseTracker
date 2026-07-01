import React, { memo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useData, useSettings, useUI } from "../context/AppContext";
import { colors } from "../constants/colors";
import { ACCOUNT_TYPES } from "../constants/accountTypes";
import { EXPENSE_CATEGORIES } from "../constants/categories";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { exportAllData } from "../utils/storage";

const SettingsScreen = memo(function SettingsScreen() {
  const { accounts, budgets, addAccount, deleteAccount, addBudget, editBudget, deleteBudget, clearAllData: clearAll } = useData();
  const { settings, updateSettings } = useSettings();
  const { selectedMonthYear } = useUI();

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("Bank");
  const [newBudgetCategory, setNewBudgetCategory] = useState("");
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const notificationListenerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (notificationListenerRef.current) {
        try {
          Notifications.removeNotificationSubscription(notificationListenerRef.current);
        } catch {}
      }
    };
  }, []);

  async function scheduleDailyReminder() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (!mountedRef.current) return;
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Enable notifications in Settings to receive daily reminders."
        );
        updateSettings({ dailyReminder: false });
        return;
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!mountedRef.current) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "FinTracker Pro",
          body: "📝 Don't forget to log today's expenses!",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 0,
        },
      });
      if (!mountedRef.current) return;
      if (notificationListenerRef.current) {
        try {
          Notifications.removeNotificationSubscription(notificationListenerRef.current);
        } catch {}
      }
      notificationListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
        // Could navigate to entry screen here
      });
    } catch (error) {
      console.warn("Daily reminder error:", error);
    }
  }

  async function cancelDailyReminder() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (notificationListenerRef.current) {
        try {
          Notifications.removeNotificationSubscription(notificationListenerRef.current);
        } catch {}
        notificationListenerRef.current = null;
      }
    } catch (error) {
      console.warn("Cancel reminder error:", error);
    }
  }

  function handleAddAccount() {
    if (!newAccountName.trim()) {
      Alert.alert("Error", "Please enter an account name.");
      return;
    }
    addAccount({
      name: newAccountName.trim(),
      type: newAccountType,
      balance: 0,
      isDefault: !accounts || accounts.length === 0,
    });
    setNewAccountName("");
    setShowAddAccount(false);
    Alert.alert("Success", "Account added successfully.");
  }

  function handleDeleteAccount(id, name) {
    Alert.alert(
      "Delete Account",
      `Are you sure you want to delete "${name}"? This will not delete transactions.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteAccount(id),
        },
      ]
    );
  }

  function handleAddBudget() {
    if (!newBudgetCategory || !newBudgetAmount) {
      Alert.alert("Error", "Please select a category and enter an amount.");
      return;
    }
    const existing = budgets.find(
      (b) =>
        b.category === newBudgetCategory &&
        b.monthYear === selectedMonthYear
    );
    if (existing) {
      editBudget(existing.id, { amount: Number(newBudgetAmount) });
    } else {
      addBudget({
        category: newBudgetCategory,
        amount: Number(newBudgetAmount),
        monthYear: selectedMonthYear,
        alertThreshold: 80,
        rolloverage: false,
      });
    }
    setNewBudgetCategory("");
    setNewBudgetAmount("");
    setShowAddBudget(false);
    Alert.alert("Success", "Budget saved.");
  }

  function handleClearAll() {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all transactions, accounts, and budgets. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            await Notifications.cancelAllScheduledNotificationsAsync();
            await clearAll();
            Alert.alert("Done", "All data has been cleared.");
          },
        },
      ]
    );
  }

  function handleBackup() {
    Alert.alert(
      "Backup Data",
      "This will export all data as JSON to your device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Backup",
          onPress: async () => {
            const data = await exportAllData();
              if (data) {
                const json = JSON.stringify(data, null, 2);
                const fileName = `FinTracker_Backup_${new Date().toISOString().slice(0, 10)}.json`;
                const filePath = FileSystem.documentDirectory + fileName;
                await FileSystem.writeAsStringAsync(filePath, json, {
                  encoding: FileSystem.EncodingType.UTF8,
                });
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                  await Sharing.shareAsync(filePath, {
                    mimeType: "application/json",
                    dialogTitle: "Save Backup",
                  });
                }
                Alert.alert("Success", `Backup saved as ${fileName}`);
              }
          },
        },
      ]
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-text-dark">Settings</Text>
        </View>

        <View className="mx-4 mt-4">
          <Text className="text-lg font-bold text-text-dark mb-3">
            Account Management
          </Text>
          <View className="bg-white rounded-lg p-4" style={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
            {accounts.map((acc) => (
              <View
                key={acc.id}
                className="flex-row items-center justify-between py-3 border-b border-border-gray"
              >
                <View className="flex-1">
                  <Text className="text-text-dark font-medium">
                    {acc.name}
                  </Text>
                  <Text className="text-text-light text-xs">
                    {acc.type} {acc.isDefault ? "(Default)" : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  className="p-2"
                  onPress={() => handleDeleteAccount(acc.id, acc.name)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.expense} />
                </TouchableOpacity>
              </View>
            ))}

            {showAddAccount ? (
              <View className="mt-3">
                <TextInput
                  className="bg-gray-50 rounded-lg px-4 py-3 mb-2"
                  style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
                  placeholder="Account name"
                  value={newAccountName}
                  onChangeText={setNewAccountName}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                  <View className="flex-row" style={{ gap: 8 }}>
                    {ACCOUNT_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t.key}
                        className="px-3 py-2 rounded-lg"
                        style={{
                          backgroundColor:
                            newAccountType === t.key ? colors.primary : "#f3f4f6",
                        }}
                        onPress={() => setNewAccountType(t.key)}
                      >
                        <Text
                          style={{
                            color:
                              newAccountType === t.key ? "#fff" : colors.textDark,
                          }}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <View className="flex-row" style={{ gap: 8 }}>
                  <TouchableOpacity
                    className="flex-1 py-2 rounded-lg items-center bg-gray-200"
                    onPress={() => setShowAddAccount(false)}
                  >
                    <Text className="text-text-dark font-medium">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 py-2 rounded-lg items-center"
                    style={{ backgroundColor: colors.primary }}
                    onPress={handleAddAccount}
                  >
                    <Text className="text-white font-medium">Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                className="flex-row items-center justify-center py-3 mt-2"
                onPress={() => setShowAddAccount(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text className="text-primary font-medium ml-2">Add Account</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="mx-4 mt-6">
          <Text className="text-lg font-bold text-text-dark mb-3">
            Budget Settings
          </Text>
          <View className="bg-white rounded-lg p-4" style={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
            {budgets.map((b) => (
              <View
                key={b.id}
                className="flex-row items-center justify-between py-3 border-b border-border-gray"
              >
                <View>
                  <Text className="text-text-dark font-medium">{b.category}</Text>
                  <Text className="text-text-light text-xs">
                    ₹{b.amount}/month
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteBudget(b.id)}>
                  <Ionicons name="trash-outline" size={18} color={colors.expense} />
                </TouchableOpacity>
              </View>
            ))}

            {showAddBudget ? (
              <View className="mt-3">
                <Text className="text-text-dark text-sm mb-1">Category</Text>
                <View className="flex-row flex-wrap mb-2" style={{ gap: 8 }}>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.key}
                      className="px-3 py-2 rounded-lg"
                      style={{
                        backgroundColor:
                          newBudgetCategory === cat.key
                            ? colors.primary
                            : "#f3f4f6",
                      }}
                      onPress={() => setNewBudgetCategory(cat.key)}
                    >
                      <Text
                        style={{
                          color:
                            newBudgetCategory === cat.key
                              ? "#fff"
                              : colors.textDark,
                        }}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  className="bg-gray-50 rounded-lg px-4 py-3 mb-2"
                  style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
                  placeholder="Monthly budget amount"
                  keyboardType="decimal-pad"
                  value={newBudgetAmount}
                  onChangeText={setNewBudgetAmount}
                />
                <View className="flex-row" style={{ gap: 8 }}>
                  <TouchableOpacity
                    className="flex-1 py-2 rounded-lg items-center bg-gray-200"
                    onPress={() => setShowAddBudget(false)}
                  >
                    <Text className="text-text-dark font-medium">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 py-2 rounded-lg items-center"
                    style={{ backgroundColor: colors.primary }}
                    onPress={handleAddBudget}
                  >
                    <Text className="text-white font-medium">Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                className="flex-row items-center justify-center py-3 mt-2"
                onPress={() => setShowAddBudget(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text className="text-primary font-medium ml-2">Set Budget</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="mx-4 mt-6">
          <Text className="text-lg font-bold text-text-dark mb-3">
            Preferences
          </Text>
          <View className="bg-white rounded-lg p-4" style={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
            <View className="flex-row items-center justify-between py-2">
              <Text className="text-text-dark">Daily Reminder</Text>
              <TouchableOpacity
                onPress={async () => {
                  const next = !settings.dailyReminder;
                  updateSettings({ dailyReminder: next });
                  if (next) {
                    await scheduleDailyReminder();
                  } else {
                    await cancelDailyReminder();
                  }
                }}
              >
                <View
                  className="w-12 h-6 rounded-full"
                  style={{
                    backgroundColor: settings.dailyReminder
                      ? colors.primary
                      : "#d1d5db",
                  }}
                >
                  <View
                    className="w-5 h-5 rounded-full bg-white mt-0.5"
                    style={{
                      marginLeft: settings.dailyReminder ? 26 : 2,
                      elevation: 2,
                    }}
                  />
                </View>
              </TouchableOpacity>
            </View>
            <Text className="text-text-light text-xs">
              Get reminded to log your expenses daily
            </Text>
          </View>
        </View>

        <View className="mx-4 mt-6">
          <Text className="text-lg font-bold text-text-dark mb-3">
            Backup & Restore
          </Text>
          <View className="bg-white rounded-lg p-4" style={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
            <TouchableOpacity
              className="flex-row items-center py-3"
              onPress={handleBackup}
            >
              <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
              <Text className="text-primary font-medium ml-3">
                Manual Backup
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mx-4 mt-6">
          <Text className="text-lg font-bold text-text-dark mb-3">
            Data Management
          </Text>
          <View className="bg-white rounded-lg p-4" style={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
            <TouchableOpacity
              className="flex-row items-center py-3"
              onPress={handleClearAll}
            >
              <Ionicons name="warning-outline" size={22} color={colors.expense} />
              <Text className="text-expense font-medium ml-3">
                Clear All Data
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mx-4 my-6">
          <Text className="text-lg font-bold text-text-dark mb-3">About</Text>
          <View className="bg-white rounded-lg p-4" style={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text className="text-text-dark font-medium">FinTracker Pro</Text>
            <Text className="text-text-light text-sm mt-1">
              Version 1.0.0
            </Text>
            <Text className="text-text-light text-sm mt-2">
              Complete income & expense tracking with analytics and reports.
              All data stays on your device.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
});

export default SettingsScreen;
