import "./global.css";

import React from "react";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View, Platform } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppProvider } from "./src/context/AppContext";
import ErrorBoundary from "./src/components/ErrorBoundary";
import { colors } from "./src/constants/colors";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

import HomeScreen from "./src/screens/HomeScreen";
import DailyScreen from "./src/screens/DailyScreen";
import EntryScreen from "./src/screens/EntryScreen";
import MonthlyScreen from "./src/screens/MonthlyScreen";
import ExportScreen from "./src/screens/ExportScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Daily") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else if (route.name === "Entry") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "Monthly") {
            iconName = focused ? "bar-chart" : "bar-chart-outline";
          } else if (route.name === "Export") {
            iconName = focused ? "download" : "download-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: colors.borderGray,
          paddingBottom: 4 + insets.bottom,
          paddingTop: 4,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Daily" component={DailyScreen} />
      <Tab.Screen
        name="Entry"
        component={EntryScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <View
              className="w-12 h-12 -mt-4 rounded-full items-center justify-center"
              style={{
                backgroundColor: focused ? colors.primary : colors.primaryDark,
                elevation: 4,
              }}
            >
              <Ionicons
                name={focused ? "add" : "add-outline"}
                size={26}
                color="#fff"
              />
            </View>
          ),
        }}
      />
      <Tab.Screen name="Monthly" component={MonthlyScreen} />
      <Tab.Screen name="Export" component={ExportScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <SafeAreaProvider>
    <AppProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="MainTabs"
            component={TabNavigator}
            options={({ navigation }) => ({
              title: "FinTracker Pro",
              headerStyle: {
                backgroundColor: "#fff",
              },
              headerTintColor: colors.textDark,
              headerTitleStyle: { fontWeight: "600", fontSize: 20 },
              headerShadowVisible: false,
              headerRight: () => (
                <TouchableOpacity
                  className="mr-4"
                  onPress={() => navigation.navigate("Settings")}
                >
                  <Ionicons name="settings-outline" size={22} color={colors.textDark} />
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: "Settings",
              headerStyle: { backgroundColor: "#fff" },
              headerTintColor: colors.textDark,
              headerTitleStyle: { fontWeight: "600" },
              headerShadowVisible: false,
            }}
          />
        </Stack.Navigator>
        <StatusBar style="dark" />
      </NavigationContainer>
    </AppProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}
