# Authentic Lanka Exports ERP
## Comprehensive Project Report

**Document Title**: System Development and Architecture Project Report  
**Version**: 1.0.0  
**Target Organization**: Authentic Lanka Exports (Pvt) Ltd  
**Author**: Antigravity Developer Team  
**Date**: June 24, 2026  

---

## 1. Executive Summary

### Business Context
**Authentic Lanka Exports (Pvt) Ltd** is a leading agricultural manufacturing and wholesale distribution enterprise specializing in premium Sri Lankan exports. Operational growth has introduced complexities across multiple departments, including cataloging, warehouse management, factory-floor processing, sales, international logistics, financial tracking, and workforce payroll.

### System Purpose
The **Authentic Lanka Exports ERP** is a unified, real-time Enterprise Resource Planning system developed to replace disconnected legacy worksheets and isolated tools. The platform serves as a single source of truth, automating:
* **Product Cataloging**: Utilizing Julian date sequence schemas.
* **Procurement (GRN)**: Logging inbound raw material weights and rejection handling.
* **Manufacturing Execution (MES)**: Monitoring recipe compositions (BOM), wood/electricity resource utility loads, batch efficiencies, and Quality Control (QC) pipelines.
* **Logistics & Shipments**: Controlling container logs, Gate Passes, and fleet vehicles.
* **Financial Ledgers**: Managing Petty Cash, Cheque Ledger, Bank accounts, and Daily Profit & Loss.
* **HR & Payroll**: Tracking swiped attendance data, leave balances, and salary payouts.

---

## 2. Technical Stack & System Architecture

The application is structured as a modern, decoupled **MERN** application leveraging real-time events and atomic database updates:

```
[ Frontend: React + Vite + Tailwind CSS ]
               │ (HTTPS REST API / WebSocket connection)
               ▼
[ Backend: Node.js + Express.js Server ]
               │ (Mongoose ODM / Atomic Operations)
               ▼
[ Database: MongoDB Cloud / Local Cluster ]
```

### Frontend Architecture
* **Framework**: React.js with Vite for high-speed module compilation.
* **Styling**: Vanilla CSS alongside Tailwind CSS utility frameworks for a modern light aesthetic layout.
* **State Management**: Zustand stores for user session variables, authorization status, and notification flags.
* **Server State**: React Query (TanStack Query) for cached data fetching, mutations, pagination, and automated refetching.
* **Icons & UI Elements**: Lucide React icons, customized buttons, badging, select dropdowns, tables, and pagination components.

### Backend Architecture
* **Runtime**: Node.js with Express.js REST API framework.
* **Database Driver**: Mongoose ODM (Object Document Mapper) enforcing strict schemas over MongoDB's document architecture.
* **Security & Tokens**: JSON Web Token (JWT) authorization using Bearer headers.
* **Real-time Synchronizations**: Socket.io enabling instant UI refreshes across multi-user environments when stock levels or order statuses shift.
* **Utilities**: Bcryptjs for secure password hashing and Winston/Morgan for request logs.

---

## 3. Database Schema Design (Key Collections)

The database schema is designed around MongoDB document relationships. The core models include:

### A. Core User & Employee Models
* **User**: Stores login credentials (email, hashed password), account state flags (`isActive`, `failedLoginAttempts`, `lockedUntil`), and authorization properties (`role`, `permissions` override arrays).
* **Employee**: Linked to a user account, containing employee records, department associations, job designations, shifts, attendance sheets, and default salary structures.

### B. Catalog & Inventory Models
* **Product**: Tracks product records, category abbreviations, units of measure (UOM), base pricing, and tax structures.
* **Warehouse**: Logs storage sites (e.g. MAIN, TRANSIT) and coordinates stock levels.
* **Stock & Stock Movement**: Records current stock quantities per warehouse and traces chronological transactions (e.g. "Purchase Receipt", "Batch Consumption", "Sales Dispatch").

### C. Purchasing & Production Models
* **Supplier & Customer**: Registries containing contact, billing, and credit term profiles.
* **Purchase Order (PO)**: Details procurement contracts, raw items, agreed unit costs, and delivery states.
* **Goods Receipt Note (GRN)**: Tracks actual incoming packages, recording accepted vs. rejected weights and perishability expiries.
* **Bill of Materials (BOM)**: Defines recipes containing ingredient quantities, estimated wastage coefficients, labor, and overhead constants.
* **Production Batch**: Monitors active production floor runs, recording headcount, wood/electricity draws, output weights, batch efficiency rates, and Quality Control parameters.

### D. Sales, Logistics & Finance Models
* **Sales Order (SO)**: Records client orders, checkouts, and manager credit overrides.
* **Invoice & Credit Note**: Governs commercial billing and adjustment records.
* **Gate Pass**: Acts as security checkout documents tracking vehicles, driver IDs, and item dispatches.
* **Fleet/Vehicle & Trip Log**: Tracks fleet assets, fuel draws, mileage logs, and maintenance logs.
* **Petty Cash**: Logs cash drawer payouts, expense categories, and approvals.
* **Daily P&L**: Compiled daily ledger logging net revenue and operational expenditures.

---

## 4. Core Modules & Calculation Engines

The platform eliminates operational errors by performing calculations server-side:

### A. Procurement Inspection
When raw material packages arrive, physical inspection metrics are computed as:

$$\text{Accepted Quantity} = \text{Received Quantity} - \text{Rejected Quantity}$$

If the raw material has a recipe conversion rule configured, the system projects finished output using:

$$\text{Live Yield Forecast} = \text{Accepted Quantity} \times \text{Conversion Coefficient}$$

### B. Bill of Materials (BOM) Costing
When creating or editing a BOM recipe, the true unit cost is dynamically computed:

$$\text{Total Cost} = \sum_{i=1}^{n} \left( \text{Qty}_i \times \left(1 + \frac{\text{Wastage}\%_i}{100}\right) \times \text{Unit Cost}_i \right) + \text{Labor Cost} + \text{Overhead Cost}$$

### C. Production Batch Performance & Analytics
Following a production run, the system grades batch output metrics:

$$\text{Batch Efficiency}\% = \left( \frac{\text{Total Output Weight}}{\text{Total Input Weight}} \right) \times 100$$

To predict future performance, the system uses two forecasting algorithms:
1. **Linear Regression**: Fits historical batch run indices ($x$) against output efficiency percentages ($y$) using the least-squares method ($y = mx + c$):

$$m = \frac{N\sum(xy) - \sum x\sum y}{N\sum(x^2) - (\sum x)^2}$$

$$c = \frac{\sum y - m\sum x}{N}$$

2. **Moving Average**: A rolling mathematical average of the last 5 completed batches to set immediate yield baselines.

Additionally, resource consumption coefficients are tracked:

$$\text{Firewood Rate} = \frac{\text{Firewood Consumed (Kg)}}{\text{Total Input Weight (Kg)}}$$

$$\text{Electricity Rate} = \frac{\text{Electricity Consumed (kWh)}}{\text{Total Input Weight (Kg)}}$$

---

## 5. Unique Key & Code Generation Formulas

All core documents are indexed using automated naming schemas.

### A. Products Julian Date Code
Generates a unique catalog code automatically upon category selection:

$$\text{Format: } P - [\text{CategoryShortCode}] - [\text{YearShort}][\text{JulianDayOfYear}] - [\text{SequenceNo}]$$

* **`P-`**: Static prefix for product entries.
* **`CategoryShortCode`**: uppercase abbreviation (e.g. `RAW` = Raw Material, `FNG` = Finished Goods, `MAC` = Mechanical).
* **`YearShort`**: Last two digits of the year (e.g. 2026 becomes `26`).
* **`JulianDayOfYear`**: Padded 3-digit day of the year (001 to 365/366).
* **`SequenceNo`**: 2-digit counter starting at `01` that resets daily per category.

*Example*: **`P-RAW-26155-02`** (The 2nd raw material item registered in the system on Julian Day 155, 2026).

### B. Production Batch Code
Tracks manufacturing batches back to raw material suppliers for quality assurance:

$$\text{Format: } [\text{SupplierShortCode}] - \text{ALE}[\text{YearShort}][\text{JulianDayOfYear}]$$

* **`SupplierShortCode`**: Identifier for the source supplier (e.g. `CHAMINDA`).
* **`ALE`**: Static prefix representing the centralized factory batch execution engine.
* **`YearShort` & `JulianDayOfYear`**: Processing start date.

*Example*: **`CHAMINDA-ALE26002`** (Tracks raw inventory supplied by Chaminda processed on the 2nd day of year 2026).

---

## 6. Concurrency, Security & Operational Safeguards

The ERP implements robust security and data integrity safeguards:

### A. Race-Condition Protection
To prevent sequence code overlap when multiple operators create products or log shipments simultaneously:
* The system avoids separate "read-then-write" database operations.
* Instead, it performs atomic updates using MongoDB's `findOneAndUpdate` command with the `$inc` operator. This modifies sequence counters directly inside database memory, ensuring each transaction gets a unique serial number.

### B. Login Security & Locking
* **Brute-Force Guard**: A limit of **5 failed login attempts** is enforced.
* **Account Lockout**: After 5 failed attempts, the account is locked for **15 minutes** by setting a `lockedUntil` timestamp in the database.
* **Active/Inactive Status**: Inactive accounts are blocked from accessing the system.
* **Session Validation**: Uses JWT tokens with an expiration limit. Expired tokens redirect users to the login screen.

### C. Database Performance Controls
* The sequence counters use a rolling **30-day Time-To-Live (TTL)** index. Inactive counters are automatically cleared after 30 days of inactivity, keeping database indices lightweight while preserving historical records.

---

## 7. Data Seeding & Deployment Procedures

The codebase is equipped with automated scripts to populate the database during initial setup:

### Seeding Workflow
1. ** seedDefaults.js**: Creates default Units of Measure (UOM), Categories, Customer Groups, the primary main warehouse, Sri Lankan national holidays for 2026, and the default Administrator account:
   * **Username**: `admin@example.com`
   * **Password**: `Admin123!`
2. **seedPermissions.js**: Populates the permissions collections and sets the access matrix for all roles (Admin, Warehouse Manager, Accountant, HR Manager, etc.).
3. **seedManufacturing.js**: Populates default process templates and yield conversion rules.
4. **seed_exports.js**: Imports mock products, suppliers, customers, and opening stock levels to prepare the system for immediate testing.
