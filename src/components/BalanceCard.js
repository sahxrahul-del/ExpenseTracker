import React, { memo } from "react";
import { View, Text } from "react-native";
import { formatCurrency } from "../utils/dateUtils";

function BalanceCard({
  openingBalance,
  totalIncome,
  totalExpenses,
  closingBalance,
  date,
}) {
  return (
    <View
      className="bg-white rounded-lg p-4 mx-4 my-2 shadow-sm"
      style={{ elevation: 2, borderWidth: 1, borderColor: "#e5e7eb" }}
    >
      {date && (
        <Text className="text-text-light text-sm mb-2">{date}</Text>
      )}
      <View className="flex-row justify-between mb-2">
        <Text className="text-text-light text-sm">Opening Balance</Text>
        <Text className="text-text-dark font-semibold">
          {formatCurrency(openingBalance || 0)}
        </Text>
      </View>
      <View className="border-t border-border-gray my-2" />
      <View className="flex-row justify-between mb-1">
        <Text className="text-text-light text-sm">Income</Text>
        <Text className="text-income font-semibold">
          +{formatCurrency(totalIncome || 0)}
        </Text>
      </View>
      <View className="flex-row justify-between mb-2">
        <Text className="text-text-light text-sm">Expenses</Text>
        <Text className="text-expense font-semibold">
          -{formatCurrency(totalExpenses || 0)}
        </Text>
      </View>
      <View className="border-t border-border-gray my-2" />
      <View className="flex-row justify-between">
        <Text className="text-text-dark font-bold text-base">
          Closing Balance
        </Text>
        <Text
          className="font-bold text-base"
          style={{
            color:
              (closingBalance || 0) >= (openingBalance || 0)
                ? "#10b981"
                : "#ef4444",
          }}
        >
          {formatCurrency(closingBalance || 0)}
        </Text>
      </View>
    </View>
  );
}

export default memo(BalanceCard);
