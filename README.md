# Merchant Reconciliation Dashboard

A web-based tool built with **Vue 3 + Vite** that helps businesses reconcile financial transactions between two data sources — typically a merchant export and a bank statement.  
It visualizes discrepancies, identifies missing or mismatched records, and provides key insights to ensure accurate financial reporting.

---

## 🧠 Overview

This app compares two CSV files — one representing merchant transactions and one representing bank transactions.  
It then automatically matches records using unique identifiers like `transactionId` and `amount`, while highlighting discrepancies in real-time.

You’ll get:
- **Summary cards** showing total matched, missing, and mismatched records  
- **Visual charts** (donut + bar) summarizing reconciliation health  
- **Adjustable tolerance** for small rounding differences  
- **Downloadable filtered results** for easy audit and sharing  

---

## ⚙️ Features

✅ Upload and parse large CSV files (optimized for thousands of records)  
✅ Reconcile automatically based on transaction ID and amount  
✅ Customize tolerance to allow minor discrepancies  
✅ Real-time visualizations: donut + bar trend charts  
✅ Filter results by match status  
✅ Export filtered reconciled data as CSV  
✅ Lightweight, client-side only — no backend required  

---

## 🧩 Tech Stack

- **Vue 3 (Composition API + TypeScript)**
- **Vite** for fast dev/build setup  
- **PapaParse** for CSV parsing  
- **Chart.js** for data visualization  
- **Vanilla CSS + Scoped Styles** for a clean, modern UI  

---

## 🪜 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/merchant-reconciliation-dashboard.git
cd merchant-reconciliation-dashboard
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Open in Browser
Visit:  
👉 [http://localhost:5173](http://localhost:5173)

---

## 📂 File Upload Format

Both files **must** include the following columns:

| Column | Description |
|---------|--------------|
| transactionId | Unique identifier for each transaction |
| date | Date of transaction (YYYY-MM-DD or MM/DD/YYYY) |
| amount | Transaction amount (number) |

Extra columns (like currency or fee) are allowed.

Example:
```csv
transactionId,date,amount
TXN-1001,2025-07-01,125.50
TXN-1002,2025-07-02,89.00
```

---

## 📊 Charts & Insights

- **Reconciliation Status Donut:**  
  Displays a visual breakdown of matched, missing, and mismatched records.

- **Daily Net Difference Bar Chart:**  
  Shows the day-by-day difference between merchant and bank totals.

---

## 🧮 Reconciliation Settings

The “Amount Tolerance” input lets you specify a small acceptable difference between merchant and bank values.  
Example:  
If tolerance = `0.05`, then $100.00 and $100.03 will be considered a match.

---

## 🧱 Project Structure

```
src/
├── components/
│   ├── UploadArea.vue
│   ├── SummaryCards.vue
│   ├── ReconciliationTable.vue
│   ├── StatusDonut.vue
│   ├── DailyNetBar.vue
│   └── DownloadButton.vue
├── utils/
│   └── reconcile.ts
├── types/
│   └── index.ts
└── App.vue
```

---

## 🚀 Deployment

You can deploy this project for free using:
- [Vercel](https://vercel.com/)
- [Netlify](https://www.netlify.com/)
- [Render](https://render.com/)

Simply connect your GitHub repo and deploy the `main` branch.  
These platforms automatically detect Vue + Vite and build the project for you.

---

## 🧩 Future Enhancements

- Virtualized table for huge CSVs  
- Matched % trend line visualization  
- Filtered CSV export  
- Multi-currency tolerance  
- Smart reconciliation rules (date range, fuzzy ID match)  

---

## 🧑‍💻 Contributing

Pull requests are welcome!  
Please open an issue first to discuss major changes or new feature ideas.

---

## 🪙 License

This project is open source and available under the **MIT License**.
