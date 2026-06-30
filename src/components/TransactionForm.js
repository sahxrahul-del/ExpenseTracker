import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useData } from "../context/AppContext";
import CategorySelector from "./CategorySelector";
import { colors } from "../constants/colors";
import { todayISO } from "../utils/dateUtils";

export default function TransactionForm({
  transaction,
  defaultDate,
  onSubmit,
  onClose,
}) {
  const { accounts } = useData();
  const isEditing = !!transaction;

  const [type, setType] = useState(transaction?.type || "expense");
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : ""
  );
  const [category, setCategory] = useState(
    transaction?.category || transaction?.source || ""
  );
  const [description, setDescription] = useState(
    transaction?.description || ""
  );
  const [account, setAccount] = useState(
    transaction?.account || (accounts && accounts.length > 0 ? accounts[0].name : "")
  );
  const [date, setDate] = useState(transaction?.date || defaultDate || todayISO());
  const [notes, setNotes] = useState(transaction?.notes || "");

  const defaultAcc = accounts && accounts.find((a) => a.isDefault);
  const displayAccount =
    account ||
    defaultAcc?.name ||
    (accounts && accounts.length > 0 ? accounts[0].name : "Cash");

  function handleSubmit() {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive amount.");
      return;
    }
    if (!category) {
      Alert.alert("Missing Field", `Please select a ${type === "income" ? "source" : "category"}.`);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert("Invalid Date", "Please enter date in YYYY-MM-DD format.");
      return;
    }

    const data = {
      type,
      amount: Number(amount),
      description: description || category,
      account: displayAccount,
      date,
      notes,
    };

    if (type === "income") {
      data.source = category;
    } else {
      data.category = category;
    }

    onSubmit(data);
  }

  return (
    <Modal visible={true} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-4 max-h-[90%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-text-dark">
                {isEditing ? "Edit Transaction" : "Add Transaction"}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {!isEditing && (
                <View className="flex-row mb-4" style={{ gap: 8 }}>
                  <TouchableOpacity
                    className="flex-1 py-3 rounded-lg items-center"
                    style={{
                      backgroundColor:
                        type === "income" ? colors.income : "#f3f4f6",
                    }}
                    onPress={() => {
                      setType("income");
                      setCategory("");
                    }}
                  >
                    <Text
                      className="font-bold"
                      style={{
                        color: type === "income" ? "#fff" : colors.textDark,
                      }}
                    >
                      Income
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 py-3 rounded-lg items-center"
                    style={{
                      backgroundColor:
                        type === "expense" ? colors.expense : "#f3f4f6",
                    }}
                    onPress={() => {
                      setType("expense");
                      setCategory("");
                    }}
                  >
                    <Text
                      className="font-bold"
                      style={{
                        color: type === "expense" ? "#fff" : colors.textDark,
                      }}
                    >
                      Expense
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text className="text-text-dark font-medium mb-1">Amount</Text>
              <TextInput
                className="bg-gray-50 rounded-lg px-4 py-3 text-lg font-bold"
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  color: type === "income" ? colors.income : colors.expense,
                }}
                placeholder="0"
                placeholderTextColor="#d1d5db"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />

              <Text className="text-text-dark font-medium mt-4 mb-1">
                {type === "income" ? "Source" : "Category"}
              </Text>
              <CategorySelector
                type={type}
                selected={category}
                onSelect={setCategory}
                columns={3}
              />

              <Text className="text-text-dark font-medium mt-4 mb-1">
                Description
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg px-4 py-3"
                style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
                placeholder="Enter description"
                placeholderTextColor="#d1d5db"
                value={description}
                onChangeText={setDescription}
              />

              <Text className="text-text-dark font-medium mt-4 mb-1">
                Account
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {!accounts || accounts.length === 0 ? (
                  <TouchableOpacity
                    className="px-4 py-3 rounded-lg"
                    style={{ backgroundColor: "#f3f4f6" }}
                  >
                    <Text className="text-text-light">Cash (Default)</Text>
                  </TouchableOpacity>
                ) : (
                  accounts.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      className="px-4 py-3 rounded-lg"
                      style={{
                        backgroundColor:
                          displayAccount === acc.name
                            ? colors.primary + "20"
                            : "#f3f4f6",
                        borderWidth:
                          displayAccount === acc.name ? 1 : 0,
                        borderColor: colors.primary,
                      }}
                      onPress={() => setAccount(acc.name)}
                    >
                      <Text
                        className="font-medium"
                        style={{
                          color:
                            displayAccount === acc.name
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

              <Text className="text-text-dark font-medium mt-4 mb-1">Date</Text>
              <TextInput
                className="bg-gray-50 rounded-lg px-4 py-3"
                style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#d1d5db"
                value={date}
                onChangeText={setDate}
              />

              <Text className="text-text-dark font-medium mt-4 mb-1">Notes</Text>
              <TextInput
                className="bg-gray-50 rounded-lg px-4 py-3"
                style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
                placeholder="Optional notes"
                placeholderTextColor="#d1d5db"
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <TouchableOpacity
                className="py-4 rounded-lg items-center mt-6 mb-4"
                style={{
                  backgroundColor:
                    type === "income" ? colors.income : colors.expense,
                }}
                onPress={handleSubmit}
              >
                <Text className="text-white font-bold text-lg">
                  {isEditing ? "Save Changes" : `Add ${type === "income" ? "Income" : "Expense"}`}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
