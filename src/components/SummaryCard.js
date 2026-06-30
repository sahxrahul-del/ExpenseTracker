import React, { memo } from "react";
import { View, Text } from "react-native";

function SummaryCard({ icon, label, value, color, bgColor }) {
  return (
    <View
      className="bg-white rounded-lg p-4 shadow-sm"
      style={{ elevation: 1, borderWidth: 1, borderColor: "#e5e7eb" }}
    >
      <View className="flex-row items-center mb-2">
        <View
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: bgColor || "#f3f4f6" }}
        >
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
      </View>
      <Text className="text-sm text-text-light">{label}</Text>
      <Text
        className="text-lg font-bold mt-1"
        style={{ color: color || "#111827" }}
      >
        {value}
      </Text>
    </View>
  );
}

export default memo(SummaryCard);
