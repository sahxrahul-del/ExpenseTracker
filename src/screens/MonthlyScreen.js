import React, { memo, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Svg, { Circle, Path, Rect, Text as SvgText } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useData, useUI } from "../context/AppContext";
import SummaryCard from "../components/SummaryCard";
import { colors, categoryColors, sourceColors } from "../constants/colors";
const { chartColors: fallbackChartColors } = colors;
import {
  formatCurrency,
  formatMonthYear,
  formatDateShort,
  getMonthStart,
  getMonthEnd,
  getDaysInRange,
} from "../utils/dateUtils";
import {
  getTotalIncome,
  getTotalExpenses,
  getNetSavings,
  getSavingsRate,
  getCategoryTotals,
  getSourceTotals,
  getAccountExpenses,
  getAccountIncome,
} from "../utils/calculationUtils";

const SCREEN_WIDTH = (Dimensions.get("window") || {}).width || 360;
const CHART_SIZE = SCREEN_WIDTH * 0.4;
const PIE_RADIUS = 70;

function PieChart({ data, size, radius, colors: chartColorMap }) {
  if (!data || data.length === 0) {
    return (
      <View
        style={{ width: size, height: size }}
        className="items-center justify-center"
      >
        <Text className="text-text-light text-sm">No data</Text>
      </View>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <View
        style={{ width: size, height: size }}
        className="items-center justify-center"
      >
        <Text className="text-text-light text-sm">No data</Text>
      </View>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = radius || PIE_RADIUS;

  let cumulativeAngle = -Math.PI / 2;
  const slices = data.map((item, index) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle = endAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const midAngle = startAngle + sliceAngle / 2;
    const labelR = r * 0.65;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);
    const percent = ((item.value / total) * 100).toFixed(0);

    return {
      path: pathData,
      color: chartColorMap?.[item.label] || (fallbackChartColors ? fallbackChartColors[index % fallbackChartColors.length] : "#6b7280"),
      label: item.label,
      percent,
      lx,
      ly,
    };
  });

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        {slices.map((slice) => (
          <Path
            key={slice.label}
            d={slice.path}
            fill={slice.color}
            opacity={0.9}
          />
        ))}
        <Circle cx={cx} cy={cy} r={r * 0.4} fill="white" />
      </Svg>
    </View>
  );
}

function BarChart({ data, height: chartHeight }) {
  if (!data || data.length === 0) {
    return (
      <View style={{ height: chartHeight }} className="items-center justify-center">
        <Text className="text-text-light text-sm">No data</Text>
      </View>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(4, (CHART_SIZE - 20) / data.length - 2);
  const labelInterval = Math.max(1, Math.floor(data.length / 6));
  const avgVal = data.reduce((s, d) => s + d.value, 0) / data.length;

  return (
    <View style={{ height: chartHeight }}>
      <Svg width={CHART_SIZE} height={chartHeight}>
        {data.map((item, i) => {
          const barH = (item.value / maxVal) * (chartHeight - 30);
          const x = 10 + i * (barWidth + 2);
          const y = chartHeight - 20 - barH;
          const color =
            item.value > maxVal * 0.7
              ? colors.expense
              : item.value > maxVal * 0.4
              ? colors.warning
              : colors.income;
          return (
            <Rect
              key={item.label}
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={2}
              fill={color}
              opacity={0.8}
            />
          );
        })}
        {data.map((item, i) => {
          if (i % labelInterval !== 0) return null;
          const x = 10 + i * (barWidth + 2);
          return (
            <SvgText
              key={"lbl-" + item.label}
              x={x + barWidth / 2}
              y={chartHeight - 2}
              fontSize={8}
              fill="#6b7280"
              textAnchor="middle"
            >
              {item.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const MonthlyScreen = memo(function MonthlyScreen({ navigation }) {
  const { transactions, budgets, accounts } = useData();
  const { selectedMonthYear, setSelectedMonth, setSelectedDate } = useUI();

  const [year, month] = selectedMonthYear.split("-").map(Number);
  const monthStart = getMonthStart(selectedMonthYear);
  const monthEnd = getMonthEnd(selectedMonthYear);

  const monthlyIncome = useMemo(
    () => getTotalIncome(transactions, monthStart, monthEnd),
    [transactions, monthStart, monthEnd]
  );
  const monthlyExpenses = useMemo(
    () => getTotalExpenses(transactions, monthStart, monthEnd),
    [transactions, monthStart, monthEnd]
  );
  const monthlySavings = useMemo(
    () => getNetSavings(transactions, monthStart, monthEnd),
    [transactions, monthStart, monthEnd]
  );
  const monthlySavingsRate = useMemo(
    () => getSavingsRate(transactions, monthStart, monthEnd),
    [transactions, monthStart, monthEnd]
  );

  const categoryTotals = useMemo(
    () => getCategoryTotals(transactions, monthStart, monthEnd),
    [transactions, monthStart, monthEnd]
  );
  const categoryData = useMemo(
    () =>
      Object.entries(categoryTotals)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    [categoryTotals]
  );

  const sourceTotals = useMemo(
    () => getSourceTotals(transactions, monthStart, monthEnd),
    [transactions, monthStart, monthEnd]
  );
  const sourceData = useMemo(
    () =>
      Object.entries(sourceTotals)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
    [sourceTotals]
  );

  const accountExpenseTotals = useMemo(
    () => getAccountExpenses(transactions, monthStart, monthEnd),
    [transactions, monthStart, monthEnd]
  );
  const accountIncomeTotals = useMemo(
    () => getAccountIncome(transactions, monthStart, monthEnd),
    [transactions, monthStart, monthEnd]
  );
  const accountKeys = useMemo(
    () => [...new Set([...Object.keys(accountExpenseTotals), ...Object.keys(accountIncomeTotals)])],
    [accountExpenseTotals, accountIncomeTotals]
  );

  const daysInMonth = useMemo(() => getDaysInRange(monthStart, monthEnd), [monthStart, monthEnd]);

  // Precompute daily totals in a single pass (eliminates O(d×n) inline computation)
  const dailyTotals = useMemo(() => {
    const expenses = {};
    const incomes = {};
    for (const t of transactions) {
      if (t.date >= monthStart && t.date <= monthEnd) {
        if (t.type === "expense") {
          expenses[t.date] = (expenses[t.date] || 0) + Number(t.amount);
        } else {
          incomes[t.date] = (incomes[t.date] || 0) + Number(t.amount);
        }
      }
    }
    return { expenses, incomes };
  }, [transactions, monthStart, monthEnd]);

  const maxExp = useMemo(
    () => Math.max(...Object.values(dailyTotals.expenses), 1),
    [dailyTotals]
  );

  const barData = useMemo(
    () =>
      daysInMonth.map((day) => ({
        label: formatDateShort(day),
        value: dailyTotals.expenses[day] || 0,
      })),
    [daysInMonth, dailyTotals]
  );

  // Precompute budget spending in a single pass
  const budgetSpending = useMemo(() => {
    const spending = {};
    for (const t of transactions) {
      if (t.type === "expense" && t.date >= monthStart && t.date <= monthEnd) {
        spending[t.category] = (spending[t.category] || 0) + Number(t.amount);
      }
    }
    return spending;
  }, [transactions, monthStart, monthEnd]);

  function goPrevMonth() {
    let m = month - 1;
    let y = year;
    if (m < 1) {
      m = 12;
      y--;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, "0")}`);
  }

  function goNextMonth() {
    let m = month + 1;
    let y = year;
    if (m > 12) {
      m = 1;
      y++;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, "0")}`);
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-text-dark">
            Monthly Analytics
          </Text>
        </View>

        <View className="flex-row items-center justify-center mx-4 my-2">
          <TouchableOpacity onPress={goPrevMonth}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-text-dark mx-4">
            {formatMonthYear(year, month)}
          </Text>
          <TouchableOpacity onPress={goNextMonth}>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        <View className="flex-row flex-wrap mx-2" style={{ gap: 8 }}>
          <View style={{ width: "47%" }}>
            <SummaryCard
              icon="💰"
              label="Total Income"
              value={formatCurrency(monthlyIncome)}
              color={colors.income}
              bgColor={colors.incomeLight}
            />
          </View>
          <View style={{ width: "47%" }}>
            <SummaryCard
              icon="💸"
              label="Total Expenses"
              value={formatCurrency(monthlyExpenses)}
              color={colors.expense}
              bgColor={colors.expenseLight}
            />
          </View>
          <View style={{ width: "47%" }}>
            <SummaryCard
              icon="🏦"
              label="Net Savings"
              value={formatCurrency(monthlySavings)}
              color={monthlySavings >= 0 ? colors.income : colors.expense}
              bgColor={monthlySavings >= 0 ? colors.incomeLight : colors.expenseLight}
            />
          </View>
          <View style={{ width: "47%" }}>
            <SummaryCard
              icon="📊"
              label="Savings Rate"
              value={monthlySavingsRate + "%"}
              color={colors.primary}
              bgColor="#ccfbf1"
            />
          </View>
        </View>

        <View className="mx-4 mt-4">
          <Text className="text-lg font-bold text-text-dark mb-2">
            Calendar View
          </Text>
          <View className="bg-white rounded-lg p-3" style={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
            <View className="flex-row mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <View key={d} style={{ width: `${100 / 7}%` }} className="items-center">
                  <Text className="text-text-light text-xs">{d}</Text>
                </View>
              ))}
            </View>
            <View className="flex-row flex-wrap">
              {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => (
                <View key={`empty-${i}`} style={{ width: `${100 / 7}%` }} className="items-center p-1" />
              ))}
              {daysInMonth.map((day) => {
                const exp = dailyTotals.expenses[day] || 0;
                const inc = dailyTotals.incomes[day] || 0;
                const intensity = exp / maxExp;
                let bg =
                  exp === 0
                    ? "#f9fafb"
                    : intensity > 0.7
                    ? "#fee2e2"
                    : intensity > 0.4
                    ? "#fef3c7"
                    : "#d1fae5";
                return (
                  <TouchableOpacity
                    key={day}
                    style={{ width: `${100 / 7}%` }}
                    className="items-center p-1"
                    onPress={() => {
                      setSelectedDate(day);
                      navigation.navigate("Daily");
                    }}
                  >
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: bg }}
                    >
                      <Text className="text-xs font-medium">
                        {new Date(day).getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View className="mx-4 mt-4">
          <Text className="text-lg font-bold text-text-dark mb-2">
            Charts
          </Text>
          <View
            className="bg-white rounded-lg p-4 mb-3"
            style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
          >
            <Text className="text-base font-bold text-text-dark mb-2">
              Income Breakdown
            </Text>
            <View className="items-center">
              <PieChart
                data={sourceData}
                size={CHART_SIZE}
                radius={PIE_RADIUS}
                chartColorMap={sourceColors}
              />
            </View>
            <View className="mt-3">
              {sourceData.map((item) => (
                <View
                  key={item.label}
                  className="flex-row justify-between items-center py-1"
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-3 h-3 rounded-full mr-2"
                      style={{
                        backgroundColor:
                          sourceColors[item.label] || colors.textLight,
                      }}
                    />
                    <Text className="text-text-dark text-sm">
                      {item.label}
                    </Text>
                  </View>
                  <Text className="text-text-dark text-sm font-medium">
                    {((item.value / monthlyIncome) * 100 || 0).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View
            className="bg-white rounded-lg p-4 mb-3"
            style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
          >
            <Text className="text-base font-bold text-text-dark mb-2">
              Expense Breakdown
            </Text>
            <View className="items-center">
              <PieChart
                data={categoryData}
                size={CHART_SIZE}
                radius={PIE_RADIUS}
                chartColorMap={categoryColors}
              />
            </View>
            <View className="mt-3">
              {categoryData.map((item) => (
                <View
                  key={item.label}
                  className="flex-row justify-between items-center py-1"
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-3 h-3 rounded-full mr-2"
                      style={{
                        backgroundColor:
                          categoryColors[item.label] || colors.textLight,
                      }}
                    />
                    <Text className="text-text-dark text-sm">
                      {item.label}
                    </Text>
                  </View>
                  <Text className="text-text-dark text-sm font-medium">
                    {formatCurrency(item.value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View
            className="bg-white rounded-lg p-4 mb-3"
            style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
          >
            <Text className="text-base font-bold text-text-dark mb-2">
              Daily Spending Trend
            </Text>
            <View className="items-center">
              <BarChart data={barData} height={150} />
            </View>
          </View>

          {accountKeys.length > 0 && (
            <View
              className="bg-white rounded-lg p-4 mb-3"
              style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
            >
              <Text className="text-base font-bold text-text-dark mb-2">
                Spending by Account
              </Text>
              {accountKeys.map((acct) => {
                const exp = accountExpenseTotals[acct] || 0;
                const inc = accountIncomeTotals[acct] || 0;
                return (
                  <View
                    key={acct}
                    className="flex-row items-center justify-between py-2 border-b border-border-gray last:border-b-0"
                  >
                    <View className="flex-1">
                      <Text className="text-text-dark font-medium text-sm">
                        {acct}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-expense text-xs">
                        -{formatCurrency(exp)}
                      </Text>
                      <Text className="text-income text-xs">
                        +{formatCurrency(inc)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {budgets.length > 0 && (
          <View className="mx-4 mt-4">
            <Text className="text-lg font-bold text-text-dark mb-2">
              Budget Status
            </Text>
            {budgets
              .filter((b) => b.monthYear === selectedMonthYear)
              .map((budget) => {
                const spent = budgetSpending[budget.category] || 0;
                const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
                const remaining = budget.amount - spent;
                const barColor =
                  percent >= 100
                    ? colors.expense
                    : percent >= budget.alertThreshold
                    ? colors.warning
                    : colors.income;

                return (
                  <View
                    key={budget.id}
                    className="bg-white rounded-lg p-4 mb-2"
                    style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
                  >
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-text-dark font-medium">
                        {budget.category}
                      </Text>
                      <Text
                        className="text-sm font-bold"
                        style={{ color: barColor }}
                      >
                        {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                      </Text>
                    </View>
                    <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(percent, 100)}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </View>
                    <Text className="text-text-light text-xs mt-1">
                      {percent >= 100
                        ? "Over budget!"
                        : `${formatCurrency(remaining)} remaining (${percent.toFixed(0)}%)`}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}

        <TouchableOpacity
          className="mx-4 my-6 py-4 rounded-lg items-center"
          style={{ backgroundColor: colors.primary }}
          onPress={() => navigation.navigate("Export")}
        >
          <View className="flex-row items-center">
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text className="text-white font-bold ml-2">Export Report</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
});

export default MonthlyScreen;
