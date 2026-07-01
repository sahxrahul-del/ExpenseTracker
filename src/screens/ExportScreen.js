import React, { memo, useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useData, useSettings, useUI } from "../context/AppContext";
import { colors } from "../constants/colors";
import { getLastExportMonth } from "../utils/autoExport";
import {
  formatCurrency,
  formatMonthYear,
  formatDate,
  getMonthStart,
  getMonthEnd,
} from "../utils/dateUtils";
import {
  getTotalIncome,
  getTotalExpenses,
  getNetSavings,
  getSavingsRate,
  getCategoryTotals,
  getSourceTotals,
  getTransactionsInRange,
} from "../utils/calculationUtils";

function escapeXml(str) {
  if (typeof str !== "string") return String(str ?? "");
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

const { StorageAccessFramework } = FileSystem;
const EXPORTS_KEY = "@fintracker_exports";
const EXPORT_DIR_KEY = "@fintracker_export_dir";

const ExportScreen = memo(function ExportScreen() {
  const { transactions, accounts, budgets } = useData();
  const { settings, updateSettings } = useSettings();
  const { selectedMonthYear, setSelectedMonth } = useUI();

  const [includeBalance, setIncludeBalance] = useState(true);
  const [includeIncome, setIncludeIncome] = useState(true);
  const [includeExpenses, setIncludeExpenses] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(false);
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [viewType, setViewType] = useState("detailed");
  const [autoExport, setAutoExport] = useState(settings.autoExport || false);

  useEffect(() => {
    setAutoExport(settings.autoExport || false);
  }, [settings.autoExport]);
  const [exporting, setExporting] = useState(false);
  const [exportRecords, setExportRecords] = useState([]);
  const [resettingDir, setResettingDir] = useState(false);
  const [lastExportMonth, setLastExportMonth] = useState(null);

  const [year, month] = selectedMonthYear.split("-").map(Number);
  const monthStart = getMonthStart(selectedMonthYear);
  const monthEnd = getMonthEnd(selectedMonthYear);
  const monthLabel = formatMonthYear(year, month);

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
  const sourceTotals = useMemo(
    () => getSourceTotals(transactions, monthStart, monthEnd),
    [transactions, monthStart, monthEnd]
  );

  const monthTransactions = useMemo(
    () =>
      getTransactionsInRange(transactions, monthStart, monthEnd).sort(
        (a, b) => a.timestamp - b.timestamp
      ),
    [transactions, monthStart, monthEnd]
  );

  useEffect(() => {
    loadExportRecords();
    getLastExportMonth().then(setLastExportMonth);
  }, []);

  async function loadExportRecords() {
    try {
      const data = await AsyncStorage.getItem(EXPORTS_KEY);
      if (data) setExportRecords(JSON.parse(data));
    } catch (e) {
      console.warn("Failed to load export records:", e);
    }
  }

  const exportRecordsRef = useRef(exportRecords);
  useEffect(() => {
    exportRecordsRef.current = exportRecords;
  }, [exportRecords]);

  async function addExportRecord(record) {
    const prev = exportRecordsRef.current;
    const updated = [record, ...prev.filter((r) => r.name !== record.name)].slice(0, 20);
    exportRecordsRef.current = updated;
    setExportRecords(updated);
    await AsyncStorage.setItem(EXPORTS_KEY, JSON.stringify(updated));
  }

  async function getOrRequestDirUri() {
    let dirUri = await AsyncStorage.getItem(EXPORT_DIR_KEY);
    if (dirUri) {
      try {
        await StorageAccessFramework.readDirectoryAsync(dirUri);
        return dirUri;
      } catch (e) {
        console.warn("Stored export dir invalid, clearing:", e);
        await AsyncStorage.removeItem(EXPORT_DIR_KEY);
      }
    }
    const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync(
      StorageAccessFramework.getUriForDirectoryInRoot("Download")
    );
    if (!permissions.granted) {
      return null;
    }
    await AsyncStorage.setItem(EXPORT_DIR_KEY, permissions.directoryUri);
    return permissions.directoryUri;
  }

  function goPrevMonth() {
    let m = month - 1;
    let y = year;
    if (m < 1) { m = 12; y--; }
    setSelectedMonth(`${y}-${String(m).padStart(2, "0")}`);
  }

  function goNextMonth() {
    let m = month + 1;
    let y = year;
    if (m > 12) { m = 1; y++; }
    setSelectedMonth(`${y}-${String(m).padStart(2, "0")}`);
  }

  async function exportPDF() {
    try {
      setExporting(true);

      const incomeRows = Object.entries(sourceTotals)
        .map(
          ([source, amount]) =>
            `<tr><td>${source}</td><td style="text-align:right;color:#10b981">${formatCurrency(amount)}</td></tr>`
        )
        .join("");

      const expenseRows = Object.entries(categoryTotals)
        .map(
          ([cat, amount]) =>
            `<tr><td>${cat}</td><td style="text-align:right;color:#ef4444">${formatCurrency(amount)}</td></tr>`
        )
        .join("");

      const showTransactions = viewType === "detailed" && includeTransactions;

      let txRows = "";
      if (showTransactions) {
        txRows = monthTransactions
          .map(
            (tx) =>
              `<tr>
                <td>${formatDate(tx.date)}</td>
                <td>${tx.description || "-"}</td>
                <td>${tx.type === "income" ? tx.source : tx.category}</td>
                <td style="text-align:right;color:${tx.type === "income" ? "#10b981" : "#ef4444"}">${tx.type === "income" ? "+" : "-"}${formatCurrency(tx.amount)}</td>
                <td>${tx.account || "-"}</td>
              </tr>`
          )
          .join("");
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica', Arial, sans-serif; padding: 30px; color: #111827; }
    h1 { color: #14b8a6; font-size: 24px; margin-bottom: 5px; }
    h2 { color: #111827; font-size: 18px; margin-top: 20px; border-bottom: 2px solid #14b8a6; padding-bottom: 5px; }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
    .summary-grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0; }
    .summary-card { flex: 1; min-width: 120px; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
    .summary-card .label { font-size: 12px; color: #6b7280; }
    .summary-card .value { font-size: 18px; font-weight: bold; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th { background: #14b8a6; color: white; padding: 8px; text-align: left; font-size: 13px; }
    td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <h1>FinTracker Pro</h1>
  <div class="subtitle">Monthly Report - ${monthLabel}</div>

  <h2>Monthly Summary</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Total Income</div>
      <div class="value" style="color:#10b981">${formatCurrency(monthlyIncome)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Expenses</div>
      <div class="value" style="color:#ef4444">${formatCurrency(monthlyExpenses)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Net Savings</div>
      <div class="value" style="color:${monthlySavings >= 0 ? "#10b981" : "#ef4444"}">${formatCurrency(monthlySavings)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Savings Rate</div>
      <div class="value" style="color:#14b8a6">${monthlySavingsRate}%</div>
    </div>
  </div>

  ${includeBalance ? `
  <h2>Balance Summary</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th style="text-align:right">Amount</th>
    </tr>
    <tr><td>Opening Balance (1st)</td><td style="text-align:right">${formatCurrency(0)}</td></tr>
    <tr><td>Closing Balance (30th)</td><td style="text-align:right">${formatCurrency(monthlySavings)}</td></tr>
    <tr><td>Net Change</td><td style="text-align:right;color:${monthlySavings >= 0 ? "#10b981" : "#ef4444"}">${monthlySavings >= 0 ? "+" : ""}${formatCurrency(monthlySavings)}</td></tr>
  </table>
  ` : ""}

  ${includeIncome ? `
  <h2>Income Breakdown</h2>
  <table>
    <tr><th>Source</th><th style="text-align:right">Amount</th></tr>
    ${incomeRows || "<tr><td colspan='2' style='text-align:center'>No income</td></tr>"}
  </table>
  ` : ""}

  ${includeExpenses ? `
  <h2>Expense Breakdown</h2>
  <table>
    <tr><th>Category</th><th style="text-align:right">Amount</th></tr>
    ${expenseRows || "<tr><td colspan='2' style='text-align:center'>No expenses</td></tr>"}
  </table>
  ` : ""}

  ${includeCharts ? `
  <h2>Charts</h2>
  <div style="margin-bottom:15px">
    <h3 style="font-size:14px;color:#111827;margin-bottom:5px">Expense by Category</h3>
    ${Object.entries(categoryTotals).length > 0 ? Object.entries(categoryTotals).sort((a,b) => b[1]-a[1]).slice(0,5).map(([cat, amt]) => {
      const pct = monthlyExpenses > 0 ? (amt / monthlyExpenses * 100).toFixed(0) : 0;
      return `<div style="margin-bottom:4px"><span style="font-size:12px">${cat}</span><div style="background:#e5e7eb;border-radius:4px;height:12px;margin-top:2px"><div style="width:${pct}%;background:#ef4444;border-radius:4px;height:12px"></div></div><span style="font-size:11px;color:#6b7280">${formatCurrency(amt)} (${pct}%)</span></div>`;
    }).join("") : "<p style='color:#6b7280;font-size:12px'>No expense data</p>"}
    <h3 style="font-size:14px;color:#111827;margin-bottom:5px;margin-top:10px">Income by Source</h3>
    ${Object.entries(sourceTotals).length > 0 ? Object.entries(sourceTotals).sort((a,b) => b[1]-a[1]).slice(0,5).map(([src, amt]) => {
      const pct = monthlyIncome > 0 ? (amt / monthlyIncome * 100).toFixed(0) : 0;
      return `<div style="margin-bottom:4px"><span style="font-size:12px">${src}</span><div style="background:#e5e7eb;border-radius:4px;height:12px;margin-top:2px"><div style="width:${pct}%;background:#10b981;border-radius:4px;height:12px"></div></div><span style="font-size:11px;color:#6b7280">${formatCurrency(amt)} (${pct}%)</span></div>`;
    }).join("") : "<p style='color:#6b7280;font-size:12px'>No income data</p>"}
  </div>
  ` : ""}

  ${showTransactions ? `
  <h2>Daily Transactions</h2>
  <table>
    <tr><th>Date</th><th>Description</th><th>Category/Source</th><th style="text-align:right">Amount</th><th>Account</th></tr>
    ${txRows || "<tr><td colspan='5' style='text-align:center'>No transactions</td></tr>"}
  </table>
  ` : ""}

  <div class="footer">
    Generated by FinTracker Pro on ${new Date().toLocaleDateString()} | All data stored on device
  </div>
</body>
</html>`;

      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      const pdfName = `FinTracker_Report_${monthLabel.replace(" ", "")}.pdf`;

      if (Platform.OS === "android") {
        const dirUri = await getOrRequestDirUri();
        if (!dirUri) {
          Alert.alert("Cancelled", "Folder access is required to save the PDF.");
          return;
        }
        const fileUri = await StorageAccessFramework.createFileAsync(
          dirUri,
          pdfName.replace(".pdf", ""),
          "application/pdf"
        );
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const pdfCachePath = FileSystem.cacheDirectory + pdfName;
        await FileSystem.writeAsStringAsync(pdfCachePath, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await addExportRecord({
          id: Date.now().toString(),
          name: pdfName,
          path: fileUri,
          cachePath: pdfCachePath,
          type: "pdf",
          date: new Date().toISOString(),
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(pdfCachePath, {
            mimeType: "application/pdf",
            dialogTitle: `Share ${pdfName}`,
          });
        }
        Alert.alert("Saved", "PDF saved to your selected folder");
      } else {
        const dest = FileSystem.documentDirectory + pdfName;
        await FileSystem.writeAsStringAsync(dest, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await addExportRecord({
          id: Date.now().toString(),
          name: pdfName,
          path: dest,
          type: "pdf",
          date: new Date().toISOString(),
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(dest, {
            mimeType: "application/pdf",
            dialogTitle: `Share ${pdfName}`,
          });
        }
        Alert.alert("Done", "PDF shared successfully");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to generate PDF: " + error.message);
    } finally {
      setExporting(false);
    }
  }

  async function exportXML() {
    try {
      setExporting(true);

      const txXml = monthTransactions
        .map(
          (tx) => `
    <transaction>
      <id>${escapeXml(tx.id)}</id>
      <type>${escapeXml(tx.type)}</type>
      <amount>${escapeXml(tx.amount)}</amount>
      <${tx.type === "income" ? "source" : "category"}>${escapeXml(tx.type === "income" ? tx.source : tx.category)}</${tx.type === "income" ? "source" : "category"}>
      <description><![CDATA[${tx.description || ""}]]></description>
      <date>${escapeXml(tx.date)}</date>
      <account>${escapeXml(tx.account || "")}</account>
      <notes><![CDATA[${tx.notes || ""}]]></notes>
    </transaction>`
        )
        .join("");

      const accXml = accounts
        .map(
          (acc) => `
    <account>
      <id>${escapeXml(acc.id)}</id>
      <name>${escapeXml(acc.name)}</name>
      <type>${escapeXml(acc.type || "Custom")}</type>
      <balance>${escapeXml(acc.balance || 0)}</balance>
      <isDefault>${escapeXml(acc.isDefault || false)}</isDefault>
    </account>`
        )
        .join("");

      const budXml = budgets
        .filter((b) => b.monthYear === selectedMonthYear)
        .map(
          (b) => `
    <budget>
      <id>${escapeXml(b.id)}</id>
      <category>${escapeXml(b.category)}</category>
      <amount>${escapeXml(b.amount)}</amount>
      <monthYear>${escapeXml(b.monthYear)}</monthYear>
      <alertThreshold>${escapeXml(b.alertThreshold || 80)}</alertThreshold>
      <rolloverage>${escapeXml(b.rolloverage || false)}</rolloverage>
    </budget>`
        )
        .join("");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<FinTrackerData>
  <reportMonth>${selectedMonthYear}</reportMonth>
  <generatedAt>${new Date().toISOString()}</generatedAt>
  <summary>
    <totalIncome>${monthlyIncome}</totalIncome>
    <totalExpenses>${monthlyExpenses}</totalExpenses>
    <netSavings>${monthlySavings}</netSavings>
    <savingsRate>${monthlySavingsRate}</savingsRate>
  </summary>
  <accounts>${accXml || "\n    <none/>"}</accounts>
  <transactions>${txXml || "\n    <none/>"}</transactions>
  <budgets>${budXml || "\n    <none/>"}</budgets>
</FinTrackerData>`;

      const fileName = `FinTracker_Data_${monthLabel.replace(" ", "")}.xml`;

      if (Platform.OS === "android") {
        const dirUri = await getOrRequestDirUri();
        if (!dirUri) {
          Alert.alert("Cancelled", "Folder access is required to save the XML.");
          return;
        }
        const fileUri = await StorageAccessFramework.createFileAsync(
          dirUri,
          fileName.replace(".xml", ""),
          "application/xml"
        );
        await FileSystem.writeAsStringAsync(fileUri, xml, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const xmlCachePath = FileSystem.cacheDirectory + fileName;
        await FileSystem.writeAsStringAsync(xmlCachePath, xml, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        await addExportRecord({
          id: Date.now().toString(),
          name: fileName,
          path: fileUri,
          cachePath: xmlCachePath,
          type: "xml",
          date: new Date().toISOString(),
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(xmlCachePath, {
            mimeType: "application/xml",
            dialogTitle: `Share ${fileName}`,
          });
        }
        Alert.alert("Saved", "XML saved to your selected folder");
      } else {
        const filePath = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(filePath, xml, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        await addExportRecord({
          id: Date.now().toString(),
          name: fileName,
          path: filePath,
          type: "xml",
          date: new Date().toISOString(),
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(filePath, {
            mimeType: "application/xml",
            dialogTitle: `Share ${fileName}`,
          });
        }
        Alert.alert("Done", "XML shared successfully");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to generate XML: " + error.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleReshare(record) {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Not Available", "Sharing is not available on this device.");
        return;
      }
      const sharePath = record.cachePath || record.path;
      await Sharing.shareAsync(sharePath, {
        mimeType: record.type === "pdf" ? "application/pdf" : "application/xml",
        dialogTitle: `Share ${record.name}`,
      });
    } catch (error) {
      // If cache path failed, try the original path
      try {
        if (record.cachePath) {
          await Sharing.shareAsync(record.path, {
            mimeType: record.type === "pdf" ? "application/pdf" : "application/xml",
            dialogTitle: `Share ${record.name}`,
          });
          return;
        }
        } catch (innerError) {
          console.warn("Reshare retry failed:", innerError);
        }
      Alert.alert("Error", "Failed to share: " + error.message);
    }
  }

  async function handleResetExportDir() {
    setResettingDir(true);
    await AsyncStorage.multiRemove([EXPORT_DIR_KEY, EXPORTS_KEY]);
    setExportRecords([]);
    Alert.alert("Done", "Export folder preference and export records cleared.");
    setResettingDir(false);
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-text-dark">Export</Text>
          <Text className="text-text-light text-sm mt-1">
            Download reports and data
          </Text>
        </View>

        <View className="mx-4 my-2">
          <Text className="text-lg font-bold text-text-dark mb-2">
            Select Month
          </Text>
          <View className="flex-row items-center justify-center bg-white rounded-lg p-3" style={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
            <TouchableOpacity onPress={goPrevMonth}>
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text className="text-base font-bold text-text-dark mx-4">
              {monthLabel}
            </Text>
            <TouchableOpacity onPress={goNextMonth}>
              <Ionicons name="chevron-forward" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mx-4 mt-4">
          <Text className="text-lg font-bold text-text-dark mb-3">
            PDF Export
          </Text>
          <View className="bg-white rounded-lg p-4" style={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text className="text-text-dark font-medium mb-2">View Type</Text>
            <View className="flex-row mb-3" style={{ gap: 8 }}>
              <TouchableOpacity
                className="px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: viewType === "detailed" ? colors.primary : "#f3f4f6",
                }}
                onPress={() => setViewType("detailed")}
              >
                <Text style={{ color: viewType === "detailed" ? "#fff" : colors.textDark }}>
                  Detailed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: viewType === "summary" ? colors.primary : "#f3f4f6",
                }}
                onPress={() => setViewType("summary")}
              >
                <Text style={{ color: viewType === "summary" ? "#fff" : colors.textDark }}>
                  Summary
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="text-text-dark font-medium mb-2">Include in PDF</Text>
            {[
              { key: "includeBalance", label: "Opening/Closing Balance", state: includeBalance, set: setIncludeBalance },
              { key: "includeIncome", label: "Income Breakdown", state: includeIncome, set: setIncludeIncome },
              { key: "includeExpenses", label: "Expense Breakdown", state: includeExpenses, set: setIncludeExpenses },
              { key: "includeCharts", label: "Charts", state: includeCharts, set: setIncludeCharts },
              { key: "includeTransactions", label: "Daily Transactions", state: includeTransactions, set: setIncludeTransactions },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                className="flex-row items-center py-2"
                onPress={() => item.set(!item.state)}
              >
                <View
                  className="w-5 h-5 rounded items-center justify-center mr-2"
                  style={{
                    backgroundColor: item.state ? colors.primary : "#f3f4f6",
                    borderWidth: 1,
                    borderColor: item.state ? colors.primary : "#d1d5db",
                  }}
                >
                  {item.state && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text className="text-text-dark text-sm">{item.label}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              className="mt-4 py-3 rounded-lg items-center"
              style={{ backgroundColor: colors.primary, opacity: exporting ? 0.6 : 1 }}
              onPress={exportPDF}
              disabled={exporting}
            >
              <View className="flex-row items-center">
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text className="text-white font-bold ml-2">
                  {exporting ? "Exporting..." : "Download PDF"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mx-4 mt-4">
          <Text className="text-lg font-bold text-text-dark mb-3">
            XML Export
          </Text>
          <View className="bg-white rounded-lg p-4" style={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text className="text-text-light text-sm mb-3">
              Export all transactions for Excel/accounting software import
            </Text>
            <TouchableOpacity
              className="py-3 rounded-lg items-center"
              style={{ backgroundColor: colors.primary, opacity: exporting ? 0.6 : 1 }}
              onPress={exportXML}
              disabled={exporting}
            >
              <View className="flex-row items-center">
                <Ionicons name="code-outline" size={18} color="#fff" />
                <Text className="text-white font-bold ml-2">
                  {exporting ? "Exporting..." : "Download XML"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {Platform.OS === "android" && (
          <View className="mx-4 mt-4">
            <Text className="text-lg font-bold text-text-dark mb-3">
              Export Folder
            </Text>
            <View className="bg-white rounded-lg p-4" style={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
              <Text className="text-text-light text-sm mb-3">
                Files are saved to a folder you choose on first export. You can reset it here to pick a different folder.
              </Text>
              <TouchableOpacity
                className="py-3 rounded-lg items-center"
                style={{ backgroundColor: "#ef4444", opacity: resettingDir ? 0.6 : 1 }}
                onPress={handleResetExportDir}
                disabled={resettingDir}
              >
                <View className="flex-row items-center">
                  <Ionicons name="folder-open-outline" size={18} color="#fff" />
                  <Text className="text-white font-bold ml-2">
                    {resettingDir ? "Resetting..." : "Reset Export Folder"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View className="mx-4 mt-4">
          <Text className="text-lg font-bold text-text-dark mb-3">
            Auto-Export Settings
          </Text>
          <View className="bg-white rounded-lg p-4" style={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
            <TouchableOpacity
              className="flex-row items-center justify-between py-2"
              onPress={() => {
                const next = !autoExport;
                setAutoExport(next);
                updateSettings({ autoExport: next });
              }}
            >
              <Text className="text-text-dark">Enable auto-export on month-end</Text>
              <View
                className="w-12 h-6 rounded-full"
                style={{
                  backgroundColor: autoExport ? colors.primary : "#d1d5db",
                }}
              >
                <View
                  className="w-5 h-5 rounded-full bg-white mt-0.5"
                  style={{
                    marginLeft: autoExport ? 26 : 2,
                    elevation: 2,
                  }}
                />
              </View>
            </TouchableOpacity>
            <Text className="text-text-light text-xs mt-1">
              Automatically saves PDF and XML on last day of month
            </Text>
            {autoExport && (
              <Text className="text-text-light text-xs mt-2">
                {lastExportMonth === selectedMonthYear
                  ? "✓ Auto-export completed for this month"
                  : "→ Will auto-export at month-end"}
              </Text>
            )}
          </View>
        </View>

        <View className="mx-4 my-6">
          <Text className="text-lg font-bold text-text-dark mb-3">
            Previous Exports
          </Text>
          {exportRecords.length > 0 ? (
            <View style={{ gap: 8 }}>
              {exportRecords.map((record) => (
                <TouchableOpacity
                  key={record.id}
                  className="flex-row items-center bg-white px-4 py-3 rounded-lg"
                  style={{ borderWidth: 1, borderColor: "#e5e7eb" }}
                  onPress={() => handleReshare(record)}
                >
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center mr-3"
                    style={{
                      backgroundColor:
                        record.type === "pdf" ? "#d1fae5" : "#dbeafe",
                    }}
                  >
                    <Ionicons
                      name={record.type === "pdf" ? "document-text" : "code-slash"}
                      size={16}
                      color={record.type === "pdf" ? "#10b981" : "#3b82f6"}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-text-dark text-sm font-medium" numberOfLines={1}>
                      {record.name}
                    </Text>
                    <Text className="text-text-light text-xs">
                      {new Date(record.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="share-outline" size={18} color={colors.textLight} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="bg-white rounded-lg p-6 items-center" style={{ borderWidth: 1, borderColor: "#e5e7eb" }}>
              <Ionicons name="folder-open-outline" size={40} color="#d1d5db" />
              <Text className="text-text-light text-sm mt-2 text-center">
                No previous exports found
              </Text>
              <Text className="text-text-light text-xs mt-1">
                Exported files will appear here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
});

export default ExportScreen;
