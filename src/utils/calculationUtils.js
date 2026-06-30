import { getDaysInRange } from "./dateUtils";

export function getTransactionsForDate(transactions, dateStr) {
  return transactions.filter((t) => t.date === dateStr);
}

export function getTransactionsInRange(transactions, startDate, endDate) {
  return transactions.filter((t) => {
    return t.date >= startDate && t.date <= endDate;
  });
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDailyIncome(transactions, dateStr) {
  return transactions
    .filter((t) => t.type === "income" && t.date === dateStr)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

export function getDailyExpenses(transactions, dateStr) {
  return transactions
    .filter((t) => t.type === "expense" && t.date === dateStr)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

function getDailyNet(transactions, dateStr) {
  let net = 0;
  for (const t of transactions) {
    if (t.date === dateStr) {
      net += t.type === "income" ? Number(t.amount) : -Number(t.amount);
    }
  }
  return net;
}

export function getOpeningBalance(transactions, dateStr, allDates) {
  if (!allDates || allDates.length === 0) return 0;
  const dateIndex = allDates.indexOf(dateStr);
  if (dateIndex <= 0) return 0;

  const dailyNet = {};
  for (const t of transactions) {
    if (!t.date) continue;
    const change = t.type === "income" ? Number(t.amount) : -Number(t.amount);
    dailyNet[t.date] = (dailyNet[t.date] || 0) + change;
  }

  let balance = 0;
  for (let i = 0; i < dateIndex; i++) {
    balance += dailyNet[allDates[i]] || 0;
  }
  return balance;
}

export function getClosingBalance(transactions, dateStr, allDates) {
  const opening = getOpeningBalance(transactions, dateStr, allDates);
  return opening + getDailyNet(transactions, dateStr);
}

export function getTotalIncome(transactions, startDate, endDate) {
  return transactions
    .filter((t) => t.type === "income" && t.date >= startDate && t.date <= endDate)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

export function getTotalExpenses(transactions, startDate, endDate) {
  return transactions
    .filter((t) => t.type === "expense" && t.date >= startDate && t.date <= endDate)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

export function getNetSavings(transactions, startDate, endDate) {
  return getTotalIncome(transactions, startDate, endDate) - getTotalExpenses(transactions, startDate, endDate);
}

export function getSavingsRate(transactions, startDate, endDate) {
  const income = getTotalIncome(transactions, startDate, endDate);
  const expenses = getTotalExpenses(transactions, startDate, endDate);
  if (income === 0) return 0;
  return Math.round(((income - expenses) / income) * 100);
}

export function getDailyAverage(transactions, startDate, endDate, type) {
  const days = getDaysInRange(startDate, endDate).length || 1;
  const total = type === "income"
    ? getTotalIncome(transactions, startDate, endDate)
    : getTotalExpenses(transactions, startDate, endDate);
  return Math.round(total / days);
}

export function getHighestDay(transactions, startDate, endDate, type) {
  const dailyTotals = {};
  for (const t of transactions) {
    if (t.type === (type === "income" ? "income" : "expense") && t.date >= startDate && t.date <= endDate) {
      dailyTotals[t.date] = (dailyTotals[t.date] || 0) + Number(t.amount);
    }
  }
  let maxAmount = 0;
  let maxDay = null;
  for (const [date, total] of Object.entries(dailyTotals)) {
    if (total > maxAmount) {
      maxAmount = total;
      maxDay = date;
    }
  }
  return { date: maxDay, amount: maxAmount };
}

export function getCategoryTotals(transactions, startDate, endDate) {
  const expenses = transactions.filter(
    (t) => t.type === "expense" && t.date >= startDate && t.date <= endDate
  );
  const totals = {};
  expenses.forEach((t) => {
    const cat = t.category || "Other";
    totals[cat] = (totals[cat] || 0) + Number(t.amount);
  });
  return totals;
}

export function getSourceTotals(transactions, startDate, endDate) {
  const incomes = transactions.filter(
    (t) => t.type === "income" && t.date >= startDate && t.date <= endDate
  );
  const totals = {};
  incomes.forEach((t) => {
    const src = t.source || "Other";
    totals[src] = (totals[src] || 0) + Number(t.amount);
  });
  return totals;
}

export function getAccountExpenses(transactions, startDate, endDate) {
  return transactions
    .filter((t) => t.type === "expense" && t.date >= startDate && t.date <= endDate)
    .reduce((acc, t) => {
      const acct = t.account || "Cash";
      acc[acct] = (acc[acct] || 0) + Number(t.amount);
      return acc;
    }, {});
}

export function getAccountIncome(transactions, startDate, endDate) {
  return transactions
    .filter((t) => t.type === "income" && t.date >= startDate && t.date <= endDate)
    .reduce((acc, t) => {
      const acct = t.account || "Cash";
      acc[acct] = (acc[acct] || 0) + Number(t.amount);
      return acc;
    }, {});
}

export function getBudgetSpending(transactions, monthYear, category) {
  const [year, month] = monthYear.split("-").map(Number);
  const start = formatDate(new Date(year, month - 1, 1));
  const end = formatDate(new Date(year, month, 0));
  return transactions
    .filter(
      (t) =>
        t.type === "expense" &&
        t.category === category &&
        t.date >= start &&
        t.date <= end
    )
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

export function getAllDates(transactions) {
  if (!transactions || transactions.length === 0) return [];
  const dates = transactions
    .filter((t) => t.date)
    .map((t) => t.date)
    .sort();
  if (dates.length === 0) return [];
  const earliest = dates[0];
  const latest = dates[dates.length - 1];
  const today = new Date().toISOString().split("T")[0];
  const endDate = latest > today ? latest : today;
  return getDaysInRange(earliest, endDate);
}


