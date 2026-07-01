import React, { memo, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useData, useUI } from "../context/AppContext";
import BalanceCard from "../components/BalanceCard";
import SummaryCard from "../components/SummaryCard";
import TransactionCard from "../components/TransactionCard";
import { colors } from "../constants/colors";
import { TIME_PERIODS } from "../constants/timePeriods";
import {
  formatCurrency,
  formatDate,
} from "../utils/dateUtils";
import {
  getDailyIncome,
  getDailyExpenses,
  getOpeningBalance,
  getClosingBalance,
  getTotalIncome,
  getTotalExpenses,
  getNetSavings,
  getSavingsRate,
  getDailyAverage,
  getHighestDay,
  getAllDates,
} from "../utils/calculationUtils";

const HomeScreen = memo(function HomeScreen({ navigation }) {
  const { transactions, deleteTransaction, refreshData } = useData();
  const { selectedTimePeriod, setTimePeriod, setSelectedDate } = useUI();

  const [refreshing, setRefreshing] = useState(false);
  const todayRef = useRef(null);
  if (!todayRef.current) todayRef.current = new Date().toISOString().split("T")[0];
  const today = todayRef.current;
  const allDates = useMemo(() => getAllDates(transactions), [transactions]);

  const todayOpening = useMemo(
    () => getOpeningBalance(transactions, today, allDates),
    [transactions, today, allDates]
  );
  const todayIncome = useMemo(
    () => getDailyIncome(transactions, today),
    [transactions, today]
  );
  const todayExpenses = useMemo(
    () => getDailyExpenses(transactions, today),
    [transactions, today]
  );
  const todayClosing = useMemo(
    () => getClosingBalance(transactions, today, allDates),
    [transactions, today, allDates]
  );

  const dateRange = useMemo(() => {
    const end = today;
    const start = new Date();
    start.setDate(start.getDate() - selectedTimePeriod + 1);
    const startStr = start.toISOString().split("T")[0];
    return { startDate: startStr, endDate: end };
  }, [selectedTimePeriod, today]);

  const periodIncome = useMemo(
    () => getTotalIncome(transactions, dateRange.startDate, dateRange.endDate),
    [transactions, dateRange]
  );
  const periodExpenses = useMemo(
    () =>
      getTotalExpenses(transactions, dateRange.startDate, dateRange.endDate),
    [transactions, dateRange]
  );
  const periodSavings = useMemo(
    () => getNetSavings(transactions, dateRange.startDate, dateRange.endDate),
    [transactions, dateRange]
  );
  const periodSavingsRate = useMemo(
    () =>
      getSavingsRate(transactions, dateRange.startDate, dateRange.endDate),
    [transactions, dateRange]
  );

  const dailyAvgExpense = useMemo(
    () =>
      getDailyAverage(
        transactions,
        dateRange.startDate,
        dateRange.endDate,
        "expense"
      ),
    [transactions, dateRange]
  );

  const highestSpendDay = useMemo(
    () =>
      getHighestDay(
        transactions,
        dateRange.startDate,
        dateRange.endDate,
        "expense"
      ),
    [transactions, dateRange]
  );

  const highestIncomeDay = useMemo(
    () =>
      getHighestDay(
        transactions,
        dateRange.startDate,
        dateRange.endDate,
        "income"
      ),
    [transactions, dateRange]
  );

  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10),
    [transactions]
  );

  function onRefresh() {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 500);
  }

  function handleTransactionPress(tx) {
    setSelectedDate(tx.date);
    navigation.navigate("Daily");
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-text-dark">
            Welcome Back!
          </Text>
          <Text className="text-xl font-italic text-text-dark">
            {formatDate(today)}
          </Text>
        </View>

        <BalanceCard
          date="Today's Balance"
          openingBalance={todayOpening}
          totalIncome={todayIncome}
          totalExpenses={todayExpenses}
          closingBalance={todayClosing}
        />

        <View className="px-4 mt-2">
          <Text className="text-lg font-bold text-text-dark mb-2">
            This Period Summary
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            <View style={{ width: "48%" }}>
              <SummaryCard
                icon="💰"
                label="Total Income"
                value={formatCurrency(periodIncome)}
                color={colors.income}
                bgColor={colors.incomeLight}
              />
            </View>
            <View style={{ width: "48%" }}>
              <SummaryCard
                icon="💸"
                label="Total Expenses"
                value={formatCurrency(periodExpenses)}
                color={colors.expense}
                bgColor={colors.expenseLight}
              />
            </View>
            <View style={{ width: "48%" }}>
              <SummaryCard
                icon="🏦"
                label="Net Savings"
                value={formatCurrency(periodSavings)}
                color={periodSavings >= 0 ? colors.income : colors.expense}
                bgColor={periodSavings >= 0 ? colors.incomeLight : colors.expenseLight}
              />
            </View>
            <View style={{ width: "48%" }}>
              <SummaryCard
                icon="📊"
                label="Savings Rate"
                value={periodSavingsRate + "%"}
                color={colors.primary}
                bgColor="#ccfbf1"
              />
            </View>
          </View>
        </View>

        <View className="px-4 mt-4">
          <Text className="text-lg font-bold text-text-dark mb-2">
            Quick Stats
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            <View style={{ width: "48%" }}>
              <SummaryCard
                icon="📅"
                label="Daily Avg Expense"
                value={formatCurrency(dailyAvgExpense)}
                color={colors.textDark}
              />
            </View>
            <View style={{ width: "48%" }}>
              <SummaryCard
                icon="🔴"
                label="Highest Spend"
                value={
                  highestSpendDay.date
                    ? formatCurrency(highestSpendDay.amount)
                    : "₹0"
                }
                color={colors.expense}
                bgColor={colors.expenseLight}
              />
            </View>
            <View style={{ width: "48%" }}>
              <SummaryCard
                icon="🟢"
                label="Highest Income"
                value={
                  highestIncomeDay.date
                    ? formatCurrency(highestIncomeDay.amount)
                    : "₹0"
                }
                color={colors.income}
                bgColor={colors.incomeLight}
              />
            </View>
            <View style={{ width: "48%" }}>
              <SummaryCard
                icon="📆"
                label="Days Tracked"
                value={allDates.length + " days"}
                color={colors.primary}
              />
            </View>
          </View>
        </View>

        <View className="px-4 mt-4">
          <Text className="text-lg font-bold text-text-dark mb-2">
            Time Period
          </Text>
          <View className="flex-row" style={{ gap: 8 }}>
            {TIME_PERIODS.map((period) => (
              <TouchableOpacity
                key={period.days}
                className="px-3 py-2 rounded-lg"
                style={{
                  backgroundColor:
                    selectedTimePeriod === period.days
                      ? colors.primary
                      : "#f3f4f6",
                }}
                onPress={() => setTimePeriod(period.days)}
              >
                <Text
                  className="text-sm font-medium"
                  style={{
                    color:
                      selectedTimePeriod === period.days
                        ? "#fff"
                        : colors.textDark,
                  }}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="px-4 mt-4 mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-lg font-bold text-text-dark">
              Recent Transactions
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Daily")}>
              <Text className="text-primary text-sm font-medium">
                Show All
              </Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.length === 0 ? (
            <View className="bg-white rounded-lg p-8 items-center">
              <Ionicons name="receipt-outline" size={40} color="#d1d5db" />
              <Text className="text-text-light mt-2 text-center">
                No transactions yet. Add your first one!
              </Text>
            </View>
          ) : (
            recentTransactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                onPress={handleTransactionPress}
                onDelete={deleteTransaction}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
});

export default HomeScreen;
