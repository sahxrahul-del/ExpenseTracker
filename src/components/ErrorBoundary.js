import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-gray-50 items-center justify-center p-6">
          <Text className="text-2xl font-bold text-expense mb-4">
            Something went wrong
          </Text>
          <ScrollView className="bg-white rounded-lg p-4 w-full max-h-60 mb-4"
            style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
          >
            <Text className="text-text-dark text-sm font-mono">
              {this.state.error?.message}
            </Text>
          </ScrollView>
          <TouchableOpacity
            className="px-6 py-3 rounded-lg"
            style={{ backgroundColor: "#14b8a6" }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text className="text-white font-bold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
