import React, { memo, useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useData, useUI } from "../context/AppContext";
import BalanceCard from "../components/BalanceCard";
import TransactionCard from "../components/TransactionCard";
import TransactionForm from "../components/TransactionForm";
import { colors } from "../constants/colors";
import {
  todayISO,
  formatDate,
  formatDateShort,
  formatCurrency,
} from "../utils/dateUtils";
import { format, parseISO, addDays, subDays } from "date-fns";
import {
  getDailyIncome,
  getDailyExpenses,
  getOpeningBalance,
  getClosingBalance,
  getTransactionsForDate,
  getAllDates,
} from "../utils/calculationUtils";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "income", label: "Income" },
  { key: "expense", label: "Expense" },
];

const DailyScreen = memo(function DailyScreen() {
  const { transactions, addTransaction, editTransaction, deleteTransaction, refreshData } = useData();
  const { selectedDate, setSelectedDate } = useUI();

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  const todayRef = useRef(null);
  if (!todayRef.current) todayRef.current = todayISO();
  const today = todayRef.current;

  const allDates = useMemo(() => {
    const dates = [...getAllDates(transactions)];
    if (!dates.includes(today)) {
      dates.push(today);
    }
    return dates.sort();
  }, [transactions, today]);

  const dateRange = useMemo(() => {
    const today = todayISO();
    const end = selectedDate > today ? selectedDate : today;
    const endParsed = parseISO(end);
    const startParsed = subDays(endParsed, 29);
    const dates = [];
    let current = startParsed;
    while (current <= endParsed) {
      dates.push(format(current, "yyyy-MM-dd"));
      current = addDays(current, 1);
    }
    if (!dates.includes(selectedDate)) {
      dates.push(selectedDate);
      dates.sort();
    }
    return dates;
  }, [selectedDate]);

  const dateIndex = useMemo(
    () => dateRange.indexOf(selectedDate),
    [selectedDate, dateRange]
  );

  const dayTransactions = useMemo(() => {
    const dayTxs = getTransactionsForDate(transactions, selectedDate);
    if (activeFilter === "all") return dayTxs;
    return dayTxs.filter((t) => t.type === activeFilter);
  }, [transactions, selectedDate, activeFilter]);

  const dailyIncome = useMemo(
    () => getDailyIncome(transactions, selectedDate),
    [transactions, selectedDate]
  );
  const dailyExpenses = useMemo(
    () => getDailyExpenses(transactions, selectedDate),
    [transactions, selectedDate]
  );
  const openingBal = useMemo(
    () => getOpeningBalance(transactions, selectedDate, allDates),
    [transactions, selectedDate, allDates]
  );
  const closingBal = useMemo(
    () => getClosingBalance(transactions, selectedDate, allDates),
    [transactions, selectedDate, allDates]
  );

  const refreshTimerRef = useRef(null);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshData();
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => setRefreshing(false), 500);
  }, [refreshData]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  function handlePrevDay() {
    const idx = dateRange.indexOf(selectedDate);
    if (idx > 0) {
      setSelectedDate(dateRange[idx - 1]);
    }
  }

  function handleNextDay() {
    const idx = dateRange.indexOf(selectedDate);
    if (idx < dateRange.length - 1) {
      setSelectedDate(dateRange[idx + 1]);
    }
  }

  const handleTransactionPress = useCallback((tx) => {
    setEditingTx(tx);
    setShowForm(true);
  }, []);

  const handleDeleteTx = useCallback((id) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTransaction(id),
        },
      ]
    );
  }, [deleteTransaction]);

  const renderTransactionItem = useCallback(
    ({ item }) => (
      <TransactionCard
        transaction={item}
        onPress={handleTransactionPress}
        onDelete={handleDeleteTx}
      />
    ),
    [handleTransactionPress, handleDeleteTx]
  );

  function handleFormSubmit(formData) {
    if (editingTx) {
      editTransaction(editingTx.id, formData);
    } else {
      addTransaction(formData);
    }
    setShowForm(false);
    setEditingTx(null);
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={dayTransactions}
        keyExtractor={(item) => item.id}
        getItemLayout={(data, index) => ({
          length: 72,
          offset: 72 * index,
          index,
        })}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <>
            <View className="px-4 pt-4 pb-2">
              <Text className="text-2xl font-bold text-text-dark">
                Daily View
              </Text>
            </View>

            <View className="mx-4 my-2">
              <View className="flex-row items-center justify-between">
                <TouchableOpacity onPress={handlePrevDay}>
                  <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-text-dark">
                  {formatDate(selectedDate)}
                </Text>
                <TouchableOpacity onPress={handleNextDay}>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-2"
              >
                {dateRange.map((date) => (
                  <TouchableOpacity
                    key={date}
                    className="px-3 py-2 mr-2 rounded-lg"
                    style={{
                      backgroundColor:
                        date === selectedDate ? colors.primary : "#f3f4f6",
                    }}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{
                        color: date === selectedDate ? "#fff" : colors.textDark,
                      }}
                    >
                      {formatDateShort(date)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <BalanceCard
              date=""
              openingBalance={openingBal}
              totalIncome={dailyIncome}
              totalExpenses={dailyExpenses}
              closingBalance={closingBal}
            />

            <View className="flex-row mx-4 my-2" style={{ gap: 8 }}>
              {FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor:
                      activeFilter === filter.key
                        ? colors.primary
                        : "#f3f4f6",
                  }}
                  onPress={() => setActiveFilter(filter.key)}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color:
                        activeFilter === filter.key ? "#fff" : colors.textDark,
                    }}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="px-4 mt-2 mb-1">
              <Text className="text-lg font-bold text-text-dark">
                Transactions
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View className="bg-white rounded-lg mx-4 p-8 items-center mt-4">
            <Ionicons name="document-text-outline" size={40} color="#d1d5db" />
            <Text className="text-text-light mt-2 text-center">
              No transactions for this day.
            </Text>
            <TouchableOpacity
              className="mt-3 px-4 py-2 rounded-lg"
              style={{ backgroundColor: colors.primary }}
              onPress={() => setShowForm(true)}
            >
              <Text className="text-white font-medium">
                Add Transaction
              </Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={renderTransactionItem}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        style={{ backgroundColor: colors.primary, elevation: 4 }}
        onPress={() => {
          setEditingTx(null);
          setShowForm(true);
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {showForm && (
        <TransactionForm
          transaction={editingTx}
          defaultDate={selectedDate}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingTx(null);
          }}
        />
      )}
    </View>
  );
});

export default DailyScreen;
