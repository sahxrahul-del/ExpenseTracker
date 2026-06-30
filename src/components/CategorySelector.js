import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EXPENSE_CATEGORIES } from "../constants/categories";
import { INCOME_SOURCES } from "../constants/incomeSource";
import { categoryColors, sourceColors } from "../constants/colors";

function CategorySelector({
  type,
  selected,
  onSelect,
  columns = 3,
}) {
  const items = type === "income" ? INCOME_SOURCES : EXPENSE_CATEGORIES;
  const colorMap = type === "income" ? sourceColors : categoryColors;

  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {items.map((item) => {
        const isSelected = selected === item.key;
        const itemColor = colorMap[item.key] || "#6b7280";
        return (
          <TouchableOpacity
            key={item.key}
            className="items-center justify-center p-3 rounded-lg"
            style={{
              width: `${100 / columns - 3}%`,
              backgroundColor: isSelected ? itemColor + "20" : "#f9fafb",
              borderWidth: isSelected ? 2 : 1,
              borderColor: isSelected ? itemColor : "#e5e7eb",
            }}
            onPress={() => onSelect(item.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.icon}
              size={24}
              color={isSelected ? itemColor : "#6b7280"}
            />
            <Text
              className="text-xs mt-1 font-medium"
              style={{
                color: isSelected ? itemColor : "#6b7280",
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default memo(CategorySelector);
