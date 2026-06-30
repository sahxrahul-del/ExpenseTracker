import React, { memo } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency, formatTime } from "../utils/dateUtils";
import { colors } from "../constants/colors";

const CATEGORY_ICONS = {
  Food: "fast-food",
  Mess: "restaurant",
  Transport: "car",
  Education: "school",
  Stationery: "book",
  Rent: "home",
  Internet: "wifi",
  Shopping: "cart",
  Entertainment: "film",
  Health: "medkit",
  Sports: "football",
  Events: "ticket",
  Utilities: "flash",
  "Pocket Money": "wallet",
  Scholarship: "ribbon",
  "Part-time Job": "briefcase",
  Internship: "laptop",
  Freelance: "code-slash",
  Gift: "gift",
  "Prize Money": "trophy",
  Refund: "cash",
  Other: "ellipsis-horizontal",
};

function TransactionCard({
  transaction,
  onPress,
  onDelete,
  onLongPress,
}) {
  const isIncome = transaction.type === "income";
  const iconName = CATEGORY_ICONS[transaction.category || transaction.source] || "ellipsis-horizontal";
  const amountColor = isIncome ? colors.income : colors.expense;
  const sign = isIncome ? "+" : "-";
  const label = isIncome ? transaction.source : transaction.category;

  function handleDelete() {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete && onDelete(transaction.id),
        },
      ]
    );
  }

  return (
    <TouchableOpacity
      className="flex-row items-center bg-white px-4 py-3 mx-4 my-1 rounded-lg"
      style={{ borderWidth: 1, borderColor: "#e5e7eb", elevation: 1 }}
      onPress={() => onPress && onPress(transaction)}
      onLongPress={() => {
        if (onLongPress) {
          onLongPress(transaction);
        } else {
          handleDelete();
        }
      }}
      activeOpacity={0.7}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{
          backgroundColor: isIncome ? colors.incomeLight : colors.expenseLight,
        }}
      >
        <Ionicons
          name={iconName}
          size={18}
          color={isIncome ? colors.income : colors.expense}
        />
      </View>

      <View className="flex-1">
        <Text className="text-text-dark font-medium text-sm" numberOfLines={1}>
          {transaction.description || label}
        </Text>
        <Text className="text-text-light text-xs mt-1">
          {label} • {transaction.timestamp ? formatTime(transaction.timestamp) : transaction.date}
        </Text>
      </View>

      <View className="items-end">
        <Text
          className="font-bold text-sm"
          style={{ color: amountColor }}
        >
          {sign}{formatCurrency(transaction.amount)}
        </Text>
        {transaction.notes ? (
          <Text className="text-text-light text-xs mt-1" numberOfLines={1}>
            {transaction.notes}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default memo(TransactionCard);
