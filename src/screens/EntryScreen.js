import React, { useState, useMemo, useRef, useEffect, memo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useData } from "../context/AppContext";
import CategorySelector from "../components/CategorySelector";
import { EXPENSE_CATEGORIES } from "../constants/categories";
import { INCOME_SOURCES } from "../constants/incomeSource";
import { colors, categoryColors, sourceColors } from "../constants/colors";
import { todayISO, formatCurrency, formatDate } from "../utils/dateUtils";

const QUICK_AMOUNTS_INCOME = [1000, 5000, 10000, 25000, 50000];
const QUICK_AMOUNTS_EXPENSE = [100, 200, 500, 1000, 2000];

const BatchCategoryItem = memo(function BatchCategoryItem({
  item, colorMap, amount, description, onAmountChange, onDescriptionChange,
}) {
  const itemColor = colorMap[item.key] || "#6b7280";
  const hasAmount = amount && !isNaN(Number(amount)) && Number(amount) > 0;
  return (
    <View
      className="bg-white rounded-lg px-3 py-3 mb-2"
      style={{
        borderWidth: 1,
        borderColor: hasAmount ? itemColor : "#e5e7eb",
      }}
    >
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <View
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: itemColor + "20" }}
        >
          <Ionicons name={item.icon} size={18} color={itemColor} />
        </View>
        <Text className="flex-1 text-text-dark font-medium text-sm">
          {item.label}
        </Text>
        <View className="w-28">
          <TextInput
            className="text-right font-bold text-sm px-2 py-1.5 rounded"
            style={{
              borderWidth: 1,
              borderColor: hasAmount ? itemColor : "#e5e7eb",
              color: itemColor,
              backgroundColor: hasAmount ? itemColor + "08" : "#f9fafb",
            }}
            placeholder="₹0"
            placeholderTextColor="#d1d5db"
            keyboardType="decimal-pad"
            value={amount || ""}
            onChangeText={(val) => onAmountChange(item.key, val)}
          />
        </View>
      </View>
      {hasAmount && (
        <TextInput
          className="mt-2 px-2 py-1.5 rounded text-sm"
          style={{
            borderWidth: 1,
            borderColor: "#e5e7eb",
            backgroundColor: "#f9fafb",
          }}
          placeholder="Description (optional)"
          placeholderTextColor="#d1d5db"
          value={description || ""}
          onChangeText={(val) => onDescriptionChange(item.key, val)}
        />
      )}
    </View>
  );
});

const EntryScreen = memo(function EntryScreen() {
  const { addTransaction, addMultipleTransactions, transactions, accounts } =
    useData();

  const [entryMode, setEntryMode] = useState("quick");
  const [activeTab, setActiveTab] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(
    accounts && accounts.length > 0 ? accounts[0].name : "Cash"
  );
  const [batchAmounts, setBatchAmounts] = useState({});
  const [batchDescriptions, setBatchDescriptions] = useState({});
  const successTimerRef = useRef(null);

  const isIncome = activeTab === "income";
  const categoryItems = isIncome ? INCOME_SOURCES : EXPENSE_CATEGORIES;
  const colorMap = isIncome ? sourceColors : categoryColors;

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5),
    [transactions]
  );

  const quickAmounts = isIncome ? QUICK_AMOUNTS_INCOME : QUICK_AMOUNTS_EXPENSE;

  const batchTotal = useMemo(() => {
    return Object.values(batchAmounts).reduce((sum, val) => {
      const num = Number(val);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [batchAmounts]);

  const batchTxCount = useMemo(() => {
    return Object.entries(batchAmounts).filter(([, val]) => {
      const num = Number(val);
      return !isNaN(num) && num > 0;
    }).length;
  }, [batchAmounts]);

  function resetQuickForm() {
    setAmount("");
    setCategory("");
    setDescription("");
    setNotes("");
    setDate(todayISO());
  }

  function resetBatchForm() {
    setBatchAmounts({});
    setBatchDescriptions({});
    setDate(todayISO());
  }

  function handleQuickSubmit() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Invalid Amount", "Enter a valid positive amount.");
      return;
    }
    if (!category) {
      Alert.alert(
        "Missing Field",
        `Select a ${isIncome ? "source" : "category"}.`
      );
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Invalid Date", "Enter date in YYYY-MM-DD format.");
      return;
    }

    const tx = {
      type: isIncome ? "income" : "expense",
      amount: Number(amount),
      description: description || category,
      date,
      notes,
      account: selectedAccount,
    };
    if (isIncome) {
      tx.source = category;
    } else {
      tx.category = category;
    }

    addTransaction(tx);
    setSuccessMessage("Transaction added successfully!");
    setSuccess(true);
    resetQuickForm();
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccess(false), 2500);
  }

  function handleBatchSubmit() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Invalid Date", "Enter date in YYYY-MM-DD format.");
      return;
    }
    const txs = [];
    for (const item of categoryItems) {
      const amt = batchAmounts[item.key];
      if (amt && !isNaN(Number(amt)) && Number(amt) > 0) {
        const tx = {
          type: isIncome ? "income" : "expense",
          amount: Number(amt),
          description: batchDescriptions[item.key] || item.key,
          date,
          account: selectedAccount,
          notes: "",
        };
        if (isIncome) {
          tx.source = item.key;
        } else {
          tx.category = item.key;
        }
        txs.push(tx);
      }
    }
    if (txs.length === 0) {
      Alert.alert("No Entries", "Enter at least one amount.");
      return;
    }
    addMultipleTransactions(txs);
    setSuccessMessage(`${txs.length} transactions added successfully!`);
    setSuccess(true);
    resetBatchForm();
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setSuccess(false), 2500);
  }

  function handleDuplicate(tx) {
    setAmount(String(tx.amount));
    setCategory(tx.category || tx.source || "");
    setDescription(tx.description || "");
    setNotes(tx.notes || "");
    if (tx.type === "income") {
      switchTab("income");
    } else {
      switchTab("expense");
    }
    setSelectedAccount(tx.account || (accounts && accounts.length > 0 ? accounts[0].name : "Cash"));
    setDate(todayISO());
  }

  function switchMode(mode) {
    setEntryMode(mode);
    if (mode === "quick") resetQuickForm();
    if (mode === "batch") resetBatchForm();
  }

  function switchTab(tab) {
    setActiveTab(tab);
    setCategory("");
    setBatchAmounts({});
    setBatchDescriptions({});
  }

  const updateBatchAmount = useCallback((key, value) => {
    setBatchAmounts((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateBatchDescription = useCallback((key, value) => {
    setBatchDescriptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      const exists = accounts.some((a) => a.name === selectedAccount);
      if (!exists) {
        setSelectedAccount(accounts[0].name);
      }
    }
  }, [accounts]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-text-dark">
            Quick Entry
          </Text>
          <Text className="text-text-light text-sm mt-1">
            {entryMode === "quick"
              ? "Add transactions fast"
              : "Add all transactions for the day at once"}
          </Text>
        </View>

        {/* Mode Toggle */}
        <View className="flex-row mx-4 mb-4" style={{ gap: 8 }}>
          <TouchableOpacity
            className="flex-1 py-3 rounded-lg items-center"
            style={{
              backgroundColor:
                entryMode === "quick" ? colors.primary : "#f3f4f6",
            }}
            onPress={() => switchMode("quick")}
          >
            <Text
              className="font-bold"
              style={{
                color: entryMode === "quick" ? "#fff" : colors.textDark,
              }}
            >
              Quick Entry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-3 rounded-lg items-center"
            style={{
              backgroundColor:
                entryMode === "batch" ? colors.primary : "#f3f4f6",
            }}
            onPress={() => switchMode("batch")}
          >
            <Text
              className="font-bold"
              style={{
                color: entryMode === "batch" ? "#fff" : colors.textDark,
              }}
            >
              Batch Entry
            </Text>
          </TouchableOpacity>
        </View>

        {/* Type Toggle */}
        <View className="flex-row mx-4 mb-4" style={{ gap: 8 }}>
          <TouchableOpacity
            className="flex-1 py-3 rounded-lg items-center"
            style={{
              backgroundColor: activeTab === "income"
                ? colors.income
                : "#f3f4f6",
            }}
            onPress={() => switchTab("income")}
          >
            <Text
              className="font-bold"
              style={{
                color: activeTab === "income" ? "#fff" : colors.textDark,
              }}
            >
              Income
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-3 rounded-lg items-center"
            style={{
              backgroundColor: activeTab === "expense"
                ? colors.expense
                : "#f3f4f6",
            }}
            onPress={() => switchTab("expense")}
          >
            <Text
              className="font-bold"
              style={{
                color: activeTab === "expense" ? "#fff" : colors.textDark,
              }}
            >
              Expense
            </Text>
          </TouchableOpacity>
        </View>

        {entryMode === "quick" ? (
          <>
            <View className="mx-4 mb-4">
              <Text className="text-text-dark font-medium mb-2">
                Quick Amounts
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {quickAmounts.map((val) => (
                  <TouchableOpacity
                    key={val}
                    className="px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: isIncome ? "#d1fae5" : "#fee2e2",
                    }}
                    onPress={() => setAmount(String(val))}
                  >
                    <Text
                      className="font-medium"
                      style={{
                        color: isIncome ? colors.income : colors.expense,
                      }}
                    >
                      ₹{val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mx-4 mb-4">
              <Text className="text-text-dark font-medium mb-2">Amount</Text>
              <TextInput
                className="bg-white rounded-lg px-4 py-3 text-lg font-bold"
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  color: isIncome ? colors.income : colors.expense,
                }}
                placeholder="Enter amount"
                placeholderTextColor="#d1d5db"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <View className="mx-4 mb-4">
              <Text className="text-text-dark font-medium mb-2">
                {isIncome ? "Source" : "Category"}
              </Text>
              <CategorySelector
                type={isIncome ? "income" : "expense"}
                selected={category}
                onSelect={setCategory}
                columns={3}
              />
            </View>

            <View className="mx-4 mb-4">
              <Text className="text-text-dark font-medium mb-2">
                Description
              </Text>
              <TextInput
                className="bg-white rounded-lg px-4 py-3"
                style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
                placeholder="What was this for?"
                placeholderTextColor="#d1d5db"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View className="mx-4 mb-4">
              <Text className="text-text-dark font-medium mb-2">Account</Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {!accounts || accounts.length === 0 ? (
                  <TouchableOpacity className="px-4 py-3 rounded-lg bg-gray-100">
                    <Text className="text-text-light">Cash</Text>
                  </TouchableOpacity>
                ) : (
                  accounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      className="px-4 py-3 rounded-lg"
                      style={{
                        backgroundColor:
                          selectedAccount === acc.name
                            ? colors.primary + "20"
                            : "#f3f4f6",
                        borderWidth: selectedAccount === acc.name ? 1 : 0,
                        borderColor: colors.primary,
                      }}
                      onPress={() => setSelectedAccount(acc.name)}
                    >
                      <Text
                        className="font-medium"
                        style={{
                          color:
                            selectedAccount === acc.name
                              ? colors.primary
                              : colors.textDark,
                        }}
                      >
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            <View className="mx-4 mb-4">
              <Text className="text-text-dark font-medium mb-2">Date</Text>
              <TextInput
                className="bg-white rounded-lg px-4 py-3"
                style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
                placeholder="YYYY-MM-DD (e.g. 2026-06-17)"
                placeholderTextColor="#d1d5db"
                value={date}
                onChangeText={setDate}
              />
              <TouchableOpacity
                onPress={() => setDate(todayISO())}
                className="mt-1"
              >
                <Text className="text-primary text-sm">Today</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="mx-4 py-4 rounded-lg items-center mb-4"
              style={{
                backgroundColor: isIncome ? colors.income : colors.expense,
              }}
              onPress={handleQuickSubmit}
            >
              <Text className="text-white font-bold text-lg">
                Add {isIncome ? "Income" : "Expense"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View className="mx-4 mb-4">
              <Text className="text-text-dark font-medium mb-2">Date</Text>
              <TextInput
                className="bg-white rounded-lg px-4 py-3"
                style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
                placeholder="YYYY-MM-DD (e.g. 2026-06-17)"
                placeholderTextColor="#d1d5db"
                value={date}
                onChangeText={setDate}
              />
              <TouchableOpacity
                onPress={() => setDate(todayISO())}
                className="mt-1"
              >
                <Text className="text-primary text-sm">Today</Text>
              </TouchableOpacity>
            </View>

            <View className="mx-4 mb-4">
              <Text className="text-text-dark font-medium mb-2">Account</Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {!accounts || accounts.length === 0 ? (
                  <TouchableOpacity className="px-4 py-3 rounded-lg bg-gray-100">
                    <Text className="text-text-light">Cash</Text>
                  </TouchableOpacity>
                ) : (
                  accounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      className="px-4 py-3 rounded-lg"
                      style={{
                        backgroundColor:
                          selectedAccount === acc.name
                            ? colors.primary + "20"
                            : "#f3f4f6",
                        borderWidth: selectedAccount === acc.name ? 1 : 0,
                        borderColor: colors.primary,
                      }}
                      onPress={() => setSelectedAccount(acc.name)}
                    >
                      <Text
                        className="font-medium"
                        style={{
                          color:
                            selectedAccount === acc.name
                              ? colors.primary
                              : colors.textDark,
                        }}
                      >
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            <View className="mx-4 mb-4">
              <Text className="text-text-dark font-medium mb-3 text-base">
                {isIncome ? "Income Sources" : "Expense Categories"}
              </Text>
              {categoryItems.map((item) => (
                <BatchCategoryItem
                  key={item.key}
                  item={item}
                  colorMap={colorMap}
                  amount={batchAmounts[item.key]}
                  description={batchDescriptions[item.key]}
                  onAmountChange={updateBatchAmount}
                  onDescriptionChange={updateBatchDescription}
                />
              ))}
            </View>

            <View className="mx-4 mb-4 flex-row items-center justify-between">
              <Text className="text-text-dark font-bold text-base">
                Total
              </Text>
              <Text
                className="font-bold text-lg"
                style={{
                  color: isIncome ? colors.income : colors.expense,
                }}
              >
                {formatCurrency(batchTotal)}
              </Text>
            </View>

            <TouchableOpacity
              className="mx-4 py-4 rounded-lg items-center mb-4"
              style={{
                backgroundColor: isIncome ? colors.income : colors.expense,
                opacity: batchTxCount === 0 ? 0.5 : 1,
              }}
              onPress={handleBatchSubmit}
              disabled={batchTxCount === 0}
            >
              <Text className="text-white font-bold text-lg">
                {batchTxCount > 0
                  ? `Add All (${batchTxCount} ${isIncome ? "incomes" : "expenses"})`
                  : "Enter amounts to add"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {entryMode === "quick" && recentTransactions.length > 0 && (
          <View className="mx-4 mb-6">
            <Text className="text-lg font-bold text-text-dark mb-2">
              Recent Entries
            </Text>
            {recentTransactions.map((tx) => (
              <TouchableOpacity
                key={tx.id}
                className="flex-row items-center bg-white px-4 py-3 rounded-lg mb-1"
                style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
                onPress={() => handleDuplicate(tx)}
              >
                <View
                  className="w-8 h-8 rounded-full items-center justify-center mr-3"
                  style={{
                    backgroundColor:
                      tx.type === "income"
                        ? colors.incomeLight
                        : colors.expenseLight,
                  }}
                >
                  <Ionicons
                    name={tx.type === "income" ? "trending-up" : "trending-down"}
                    size={16}
                    color={tx.type === "income" ? colors.income : colors.expense}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-text-dark text-sm font-medium">
                    {tx.description}
                  </Text>
                  <Text className="text-text-light text-xs">
                    {formatDate(tx.date)}
                  </Text>
                </View>
                <Text
                  className="font-bold text-sm"
                  style={{
                    color:
                      tx.type === "income" ? colors.income : colors.expense,
                  }}
                >
                  {tx.type === "income" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </Text>
              </TouchableOpacity>
            ))}
            <Text className="text-text-light text-xs mt-2 text-center">
              Tap to duplicate
            </Text>
          </View>
        )}
      </ScrollView>

      {success && (
        <View
          className="absolute top-4 left-4 right-4 py-3 rounded-lg items-center"
          style={{ backgroundColor: colors.income }}
        >
          <Text className="text-white font-bold">{successMessage}</Text>
        </View>
      )}
    </View>
  );
}
