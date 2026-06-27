const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  TableOfContents, PageBreak, Header, Footer, TabStopPosition, TabStopType,
  ImageRun, convertInchesToTwip, LevelFormat, NumberFormat,
  TableLayoutType, VerticalAlign, PageNumber, NumberOfPages
} = require("docx");
const fs = require("fs");

// ═══════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════

const COLORS = {
  PRIMARY: "1E293B",
  ACCENT: "3B82F6",
  SUCCESS: "059669",
  DANGER: "DC2626",
  WARNING: "D97706",
  MUTED: "64748B",
  LIGHT_BG: "F1F5F9",
  WHITE: "FFFFFF",
  BLACK: "111827",
  BORDER: "CBD5E1",
  HEADER_BG: "1E293B",
  ROW_ALT: "F8FAFC",
};

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 28, color: COLORS.PRIMARY, font: "Segoe UI" })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: 24, color: COLORS.ACCENT, font: "Segoe UI" })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 250, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, color: COLORS.PRIMARY, font: "Segoe UI" })],
  });
}

function body(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 21, color: COLORS.BLACK, font: "Segoe UI" })],
  });
}

function bodyBold(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 21, bold: true, color: COLORS.BLACK, font: "Segoe UI" })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 21, color: COLORS.BLACK, font: "Segoe UI" })],
  });
}

function bulletMixed(parts, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 60 },
    children: parts.map(p => new TextRun({ text: p.text, bold: p.bold || false, size: 21, color: p.color || COLORS.BLACK, font: "Segoe UI" })),
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 80 }, children: [] });
}

function codeBlock(lines) {
  return lines.map(line =>
    new Paragraph({
      spacing: { after: 0 },
      shading: { type: ShadingType.SOLID, color: "1E1E2E" },
      indent: { left: 200 },
      children: [new TextRun({ text: line, size: 18, font: "Consolas", color: "A6E3A1" })],
    })
  );
}

function noteBox(text, type = "NOTE") {
  const colors = {
    NOTE: { bg: "DBEAFE", border: "3B82F6", icon: "ℹ️" },
    WARNING: { bg: "FEF3C7", border: "D97706", icon: "⚠️" },
    IMPORTANT: { bg: "DCFCE7", border: "059669", icon: "✅" },
    DANGER: { bg: "FEE2E2", border: "DC2626", icon: "🛑" },
  };
  const c = colors[type] || colors.NOTE;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: c.bg },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: c.border },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: c.border },
              left: { style: BorderStyle.SINGLE, size: 6, color: c.border },
              right: { style: BorderStyle.SINGLE, size: 1, color: c.border },
            },
            children: [new Paragraph({ children: [new TextRun({ text: `${c.icon}  ${type}: ${text}`, size: 20, font: "Segoe UI", bold: true })] })],
          }),
        ],
      }),
    ],
  });
}

function styledTable(headers, rows, colWidths) {
  const headerCells = headers.map((h, i) =>
    new TableCell({
      width: colWidths ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
      shading: { type: ShadingType.SOLID, color: COLORS.HEADER_BG },
      verticalAlign: VerticalAlign.CENTER,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
        left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
        right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
      },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 20, color: COLORS.WHITE, font: "Segoe UI" })] })],
    })
  );

  const dataRows = rows.map((row, rowIdx) =>
    new TableRow({
      children: row.map((cell, i) =>
        new TableCell({
          width: colWidths ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
          shading: { type: ShadingType.SOLID, color: rowIdx % 2 === 0 ? COLORS.WHITE : COLORS.ROW_ALT },
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
            left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
            right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.BORDER },
          },
          children: [new Paragraph({
            spacing: { before: 40, after: 40 },
            children: [new TextRun({ text: String(cell), size: 20, font: "Segoe UI", color: COLORS.BLACK })]
          })],
        })
      ),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: headerCells }), ...dataRows],
  });
}

function flowDiagram(steps) {
  // Mapping of accent colors to their light background equivalents
  const lightBg = {
    "3B82F6": "DBEAFE", // blue
    "D97706": "FEF3C7", // amber
    "059669": "DCFCE7", // green
    "7C3AED": "EDE9FE", // purple
    "DC2626": "FEE2E2", // red
  };
  const rows = [];
  steps.forEach((step, idx) => {
    const accent = step.color || COLORS.ACCENT;
    const bgColor = lightBg[accent] || "EFF6FF";
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: accent },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), bold: true, size: 22, color: COLORS.WHITE, font: "Segoe UI" })] })],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: bgColor },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ children: [new TextRun({ text: step.actor, bold: true, size: 20, font: "Segoe UI" })] })],
          }),
          new TableCell({
            width: { size: 7, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "→", size: 28, bold: true, color: COLORS.ACCENT })] })],
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ spacing: { before: 40, after: 40 }, children: [new TextRun({ text: step.action, size: 20, font: "Segoe UI" })] })],
          }),
        ],
      })
    );
  });
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}


// ═══════════════════════════════════════════════════════
// DOCUMENT CONTENT
// ═══════════════════════════════════════════════════════

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Segoe UI", size: 21, color: COLORS.BLACK },
      },
    },
  },
  sections: [
    // ══════════════════════════════════════════════════
    // COVER PAGE
    // ══════════════════════════════════════════════════
    {
      properties: {},
      children: [
        spacer(), spacer(), spacer(), spacer(), spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "📊", size: 72 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "BALDIA MART", bold: true, size: 52, color: COLORS.PRIMARY, font: "Segoe UI" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: "SOFTWARE REQUIREMENT SPECIFICATION", bold: true, size: 32, color: COLORS.ACCENT, font: "Segoe UI" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "Enterprise Financial Management System v3.0", italic: true, size: 24, color: COLORS.MUTED, font: "Segoe UI" })],
        }),
        spacer(),
        new Table({
          width: { size: 60, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Document Classification", bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "CONFIDENTIAL — Engineering Use Only", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Version", bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "3.0", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "June 26, 2026", size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Author", bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Architecture Division, Baldia Mart", size: 20 })] })] }),
            ]}),
          ],
        }),
        spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Single Source of Truth for Engineering", bold: true, size: 20, color: COLORS.MUTED })],
        }),
      ],
    },

    // ══════════════════════════════════════════════════
    // TABLE OF CONTENTS
    // ══════════════════════════════════════════════════
    {
      properties: {},
      children: [
        heading1("Table of Contents"),
        spacer(),
        body("1. Architectural Summary & Core Database Schema"),
        body("   1.1 Banking-Grade Accounting Principles"),
        body("   1.2 Production SQL Schema Blueprint"),
        spacer(),
        body("2. Dynamic Cash-Flow Routing & Split Engine"),
        body("   2.1 Mode 1: CASH_ON_PICK (Low Rider Risk)"),
        body("   2.2 Mode 2: MERCHANT_CREDIT (Trusted Vendor)"),
        body("   2.3 Commission Resolver Logic"),
        body("   2.4 Platform Service Fee"),
        body("   2.5 Automated Refund Engine (Contra-Accounting)"),
        spacer(),
        body("3. Cross-Platform System Integration Matrix"),
        body("   3.A User Application (Customer Interface)"),
        body("   3.B Rider Mobile Application (Logistics Interface)"),
        body("   3.C Administrative Control Panel (Owner Dashboard)"),
        spacer(),
        body("4. End-to-End Code Repository Blueprint"),
        body("   4.1 Master FinanceService — Complete Implementation"),
      ],
    },

    // ══════════════════════════════════════════════════
    // SECTION 1: ARCHITECTURAL SUMMARY
    // ══════════════════════════════════════════════════
    {
      properties: {},
      children: [
        heading1("1. Architectural Summary & Core Database Schema"),
        spacer(),
        heading2("1.1 Banking-Grade Accounting Principles"),
        body("The Baldia Mart Financial Engine adheres to three non-negotiable enterprise accounting principles:"),
        spacer(),

        styledTable(
          ["Principle", "Implementation", "Risk Mitigated"],
          [
            ["Immutability (Zero-Deletion)", "No financial row is ever deleted or modified after commit. Corrections are appended as new contra-entries under ORDER_REFUND.", "Audit fraud, phantom deletions, compliance violations"],
            ["Pessimistic Row Locking", "Every wallet balance update acquires a pessimistic_write lock via TypeORM before reading or modifying balance or cash_in_hand.", "Race conditions during concurrent COD deliveries"],
            ["Strict ACID Compliance", "All settlement operations are wrapped in a single EntityManager.transaction() block. Any failure rolls back the entire operation.", "Partial settlements, orphaned ledger lines, balance corruption"],
          ],
          [30, 40, 30]
        ),

        spacer(), spacer(),
        heading2("1.2 Production SQL Schema Blueprint"),

        // WALLETS
        heading3("1.2.1  wallets — Virtual Capital Accounts"),
        body("Each entity (Rider, Vendor, User) gets exactly one wallet per user_type. The wallet tracks two independent financial dimensions:"),
        spacer(),
        styledTable(
          ["Column", "Type", "Default", "Description"],
          [
            ["id", "UUID (PK)", "auto-generated", "Primary key"],
            ["user_type", "ENUM", "—", "Rider | Vendor | User | System"],
            ["user_id", "UUID", "—", "Foreign key to the entity's profile table"],
            ["balance", "DECIMAL(12,2)", "0", "Withdraw-able earnings (money platform OWES entity)"],
            ["cash_in_hand", "DECIMAL(12,2)", "0", "Physical cash held by rider (money entity OWES platform)"],
            ["is_suspended", "BOOLEAN", "false", "Auto-toggled by checkRiderThreshold()"],
            ["created_at", "TIMESTAMPTZ", "NOW()", "Record creation timestamp"],
            ["updated_at", "TIMESTAMPTZ", "NOW()", "Last modification timestamp"],
          ],
          [20, 18, 15, 47]
        ),
        spacer(),
        noteBox("UNIQUE constraint on (user_id, user_type) prevents duplicate wallets.", "IMPORTANT"),

        spacer(), spacer(),
        // FINANCIAL TRANSACTIONS
        heading3("1.2.2  financial_transactions — Transaction Anchor"),
        body("Acts as a parent container for a group of balanced ledger lines. Each settlement, refund, or reconciliation creates exactly one financial_transaction with one or more child entries."),
        spacer(),
        styledTable(
          ["Column", "Type", "Description"],
          [
            ["id", "UUID (PK)", "Primary key"],
            ["reference_type", "VARCHAR", "ORDER_SETTLEMENT | CASH_RECONCILIATION | ORDER_REFUND | MANUAL_ADJUSTMENT | WITHDRAWAL"],
            ["reference_id", "VARCHAR", "e.g., orderId, settlement reference"],
            ["description", "TEXT", "Human-readable description of the transaction"],
            ["created_at", "TIMESTAMPTZ", "Immutable creation timestamp"],
          ],
          [20, 20, 60]
        ),

        spacer(), spacer(),
        // LEDGER ENTRIES
        heading3("1.2.3  financial_ledger_entries — Immutable Accounting Lines"),
        body("The core of our double-entry system. Every financial event is recorded as one or more immutable lines with a direction (CREDIT/DEBIT) and an account tag."),
        spacer(),
        styledTable(
          ["Column", "Type", "Description"],
          [
            ["id", "UUID (PK)", "Primary key"],
            ["transaction_id", "UUID (FK)", "References parent financial_transactions"],
            ["wallet_id", "UUID (FK) NULL", "References the target wallet (NULL for platform-only entries)"],
            ["account_tag", "ENUM", "EARNINGS | CASH_IN_HAND | PLATFORM_REV | TAX_PAYABLE | VOUCHER_EXP"],
            ["direction", "ENUM", "CREDIT | DEBIT"],
            ["amount", "DECIMAL(12,2)", "Absolute monetary value of the entry"],
            ["description", "TEXT", "Human-readable line description"],
            ["module_type", "VARCHAR", "food | mart | rashan | pharma"],
            ["created_at", "TIMESTAMPTZ", "Immutable creation timestamp"],
          ],
          [20, 20, 60]
        ),

        spacer(),
        heading3("Account Tag Semantics Reference"),
        styledTable(
          ["Account Tag", "Direction", "Wallet Effect", "Meaning"],
          [
            ["EARNINGS", "CREDIT", "+balance", "Vendor/Rider earnings added"],
            ["EARNINGS", "DEBIT", "−balance", "Claw-back during refund"],
            ["CASH_IN_HAND", "DEBIT", "+cashInHand", "Cash collected by rider (rider owes platform)"],
            ["CASH_IN_HAND", "CREDIT", "−cashInHand", "Cash remitted by rider (debt reduced)"],
            ["PLATFORM_REV", "CREDIT", "—", "Platform commission + service fees earned"],
            ["PLATFORM_REV", "DEBIT", "—", "Revenue reversal during refund"],
            ["VOUCHER_EXP", "DEBIT", "—", "Platform-funded coupon/discount cost"],
            ["TAX_PAYABLE", "DEBIT", "—", "Government tax obligation (reserved)"],
          ],
          [22, 15, 18, 45]
        ),

        spacer(), spacer(),
        // COMMISSION CONFIG
        heading3("1.2.4  commission_configs — Dynamic Commission Engine"),
        styledTable(
          ["Column", "Type", "Default", "Description"],
          [
            ["id", "UUID (PK)", "auto", "Primary key"],
            ["entity_type", "ENUM", "—", "vendor | restaurant | pharmacy | platform_default"],
            ["module_type", "ENUM", "all", "food | mart | rashan | pharma | all"],
            ["entity_id", "UUID NULL", "—", "NULL = applies globally to all entities of type"],
            ["commission_percent", "DECIMAL(5,2)", "10.00", "Percentage of subtotal taken as commission"],
            ["min_commission", "DECIMAL(10,2)", "0", "Floor value for commission"],
            ["max_commission", "DECIMAL(10,2)", "0", "Ceiling value for commission (0 = no cap)"],
            ["effective_from", "DATE", "—", "Start date of this rate"],
            ["effective_to", "DATE NULL", "—", "End date (NULL = indefinite)"],
            ["is_active", "BOOLEAN", "true", "Soft-delete / deactivation flag"],
          ],
          [22, 18, 12, 48]
        ),

        spacer(), spacer(),
        // DAILY SNAPSHOTS
        heading3("1.2.5  daily_financial_snapshots — Audit Trail"),
        body("Pre-computed daily aggregates for dashboards. Generated by a nightly cron job to avoid expensive real-time queries. When wallet_id is NULL, it represents platform-wide totals."),
        spacer(),
        styledTable(
          ["Column Group", "Columns", "Purpose"],
          [
            ["Identity", "id, snapshot_date, wallet_id, user_type, entity_name", "Uniquely identifies each daily record"],
            ["Order Metrics", "total_orders, completed_orders, cancelled_orders", "Daily order volume tracking"],
            ["Revenue", "gross_revenue, total_commissions, total_payouts, total_delivery_fees, total_discounts, net_revenue", "Full P&L breakdown"],
            ["Cash Flow", "cod_collected, cod_remitted, online_payments, total_payouts", "Cash pipeline audit"],
            ["Vertical Breakdown", "mart_revenue, food_revenue, pharma_revenue, rashan_revenue", "Silo-isolated vertical performance"],
          ],
          [20, 40, 40]
        ),

        spacer(), spacer(),
        // ORDERS UPDATE
        heading3("1.2.6  orders — Cash-Flow Mode Extension"),
        body("A new column has been added to the existing orders table to support the Dynamic Cash-Flow Routing Engine:"),
        spacer(),
        styledTable(
          ["Column", "Type", "Default", "Allowed Values"],
          [
            ["cash_flow_mode", "VARCHAR", "MERCHANT_CREDIT", "MERCHANT_CREDIT | CASH_ON_PICK"],
          ],
          [25, 20, 25, 30]
        ),

        spacer(), spacer(),
        // SETTINGS
        heading3("1.2.7  settings — Dynamic Operational Parameters"),
        styledTable(
          ["Key", "Default Value", "Purpose"],
          [
            ["rider_cod_threshold", "5000", "Maximum cash (₨) a rider can hold before auto-suspension"],
            ["platform_service_fee", "15", "Fixed per-order fee (₨) added to platform revenue"],
            ["cod_limit_mart", "5000", "Max COD order value allowed for Mart orders"],
            ["cod_limit_food", "2000", "Max COD order value allowed for Food orders"],
            ["cod_limit_pharma", "2000", "Max COD order value allowed for Pharma orders"],
          ],
          [30, 20, 50]
        ),
      ],
    },

    // ══════════════════════════════════════════════════
    // SECTION 2: DYNAMIC CASH-FLOW ROUTING
    // ══════════════════════════════════════════════════
    {
      properties: {},
      children: [
        heading1("2. Dynamic Cash-Flow Routing & Split Engine"),
        spacer(),
        body("Baldia Mart operates a proprietary \"Dynamic Cash-Flow Routing Engine\" that allows the platform to toggle between two distinct financial settlement strategies per order. This is the core competitive weapon against monopolistic platforms."),

        spacer(),
        heading2("2.1  Mode 1: CASH_ON_PICK — Low Rider Risk (Option 2)"),
        spacer(),

        noteBox("In this mode, the rider pays the vendor out-of-pocket at the shop. The rider's debt to the platform accumulates VERY slowly, preventing unfair automated suspensions.", "IMPORTANT"),
        spacer(),

        // FLOW DIAGRAM
        bodyBold("📊  Transaction Flow Diagram: CASH_ON_PICK"),
        spacer(),
        flowDiagram([
          { actor: "Customer", action: "Places order (COD) → System assigns cash_flow_mode = CASH_ON_PICK", color: "3B82F6" },
          { actor: "Rider", action: "Arrives at shop → Pays vendor ₨[Subtotal] from own pocket", color: "D97706" },
          { actor: "Vendor", action: "Receives physical cash → Hands over items to rider", color: "059669" },
          { actor: "Rider", action: "Delivers to customer → Collects ₨[Total] (Subtotal + Delivery + Fee)", color: "D97706" },
          { actor: "Ledger Engine", action: "Vendor wallet impact: ₨0 (already paid physically)", color: "7C3AED" },
          { actor: "Ledger Engine", action: "Platform Revenue: CREDIT ₨(Commission + Service Fee)", color: "7C3AED" },
          { actor: "Ledger Engine", action: "Rider Earnings: CREDIT ₨(Delivery Fee)", color: "7C3AED" },
          { actor: "Ledger Engine", action: "Rider Debt: DEBIT ₨(Commission + Fee ONLY) → slow accumulation", color: "DC2626" },
        ]),
        spacer(),

        bodyBold("💰  Numerical Example: Order Subtotal ₨1,000 | Delivery ₨80 | Fee ₨15 | Commission 10%"),
        spacer(),
        styledTable(
          ["Ledger Line", "Account Tag", "Direction", "Amount (₨)", "Target"],
          [
            ["Vendor Payout", "—", "—", "₨0", "No wallet entry created"],
            ["Platform Revenue", "PLATFORM_REV", "CREDIT", "₨115", "Commission ₨100 + Fee ₨15"],
            ["Rider Delivery Fee", "EARNINGS", "CREDIT", "₨80", "Rider wallet balance"],
            ["Rider COD Debt", "CASH_IN_HAND", "DEBIT", "₨115", "Rider owes only platform cut"],
          ],
          [22, 18, 12, 15, 33]
        ),
        spacer(),
        noteBox("Strategic Advantage: Rider's cash_in_hand accumulates at only ~10-15% of order value. They can complete 50+ orders before hitting the ₨5,000 suspension threshold.", "NOTE"),

        spacer(), spacer(),
        heading2("2.2  Mode 2: MERCHANT_CREDIT — Trusted Vendor Cycle (Option 3)"),
        spacer(),
        noteBox("In this mode, the vendor provides items on credit. The rider collects the FULL order total from the customer. Use with established, trusted vendors only.", "WARNING"),
        spacer(),

        bodyBold("📊  Transaction Flow Diagram: MERCHANT_CREDIT"),
        spacer(),
        flowDiagram([
          { actor: "Customer", action: "Places order (COD) → System assigns cash_flow_mode = MERCHANT_CREDIT", color: "3B82F6" },
          { actor: "Vendor", action: "Provides items on CREDIT to rider (no upfront payment)", color: "059669" },
          { actor: "Rider", action: "Delivers to customer → Collects ₨[Total] cash from customer", color: "D97706" },
          { actor: "Ledger Engine", action: "Vendor Wallet: CREDIT ₨(Subtotal - Commission)", color: "7C3AED" },
          { actor: "Ledger Engine", action: "Platform Revenue: CREDIT ₨(Commission + Service Fee)", color: "7C3AED" },
          { actor: "Ledger Engine", action: "Rider Earnings: CREDIT ₨(Delivery Fee)", color: "7C3AED" },
          { actor: "Ledger Engine", action: "Rider Debt: DEBIT ₨[FULL ORDER TOTAL] → fast accumulation!", color: "DC2626" },
        ]),
        spacer(),

        bodyBold("💰  Numerical Example: Same Order (Subtotal ₨1,000 | Delivery ₨80 | Fee ₨15 | Commission 10%)"),
        spacer(),
        styledTable(
          ["Ledger Line", "Account Tag", "Direction", "Amount (₨)", "Target"],
          [
            ["Vendor Payout", "EARNINGS", "CREDIT", "₨900", "Vendor wallet (₨1000 − ₨100)"],
            ["Platform Revenue", "PLATFORM_REV", "CREDIT", "₨115", "Commission ₨100 + Fee ₨15"],
            ["Rider Delivery Fee", "EARNINGS", "CREDIT", "₨80", "Rider wallet balance"],
            ["Rider COD Debt", "CASH_IN_HAND", "DEBIT", "₨1,095", "Rider owes FULL order total"],
          ],
          [22, 18, 12, 15, 33]
        ),
        spacer(),
        noteBox("Risk Alert: The rider hits the ₨5,000 threshold after only ~5 orders. This mode is reserved for trusted, established vendors.", "DANGER"),

        spacer(), spacer(),
        // SIDE-BY-SIDE COMPARISON
        heading2("2.3  Side-by-Side Mode Comparison"),
        spacer(),
        styledTable(
          ["Feature", "CASH_ON_PICK", "MERCHANT_CREDIT"],
          [
            ["Physical Cash Flow", "Rider pays vendor at shop", "Vendor gives items on credit"],
            ["Vendor Wallet Impact", "₨0 (Zero — paid physically)", "CREDIT (Subtotal − Commission)"],
            ["Rider Debt per Order", "Commission + Service Fee ONLY", "FULL Order Total"],
            ["Orders Before Suspension", "~50 orders (slow accumulation)", "~5 orders (fast accumulation)"],
            ["Best For", "New vendors, rider retention", "Trusted established vendors"],
            ["Platform Risk", "LOW — rider holds minimal cash", "HIGH — rider holds all customer cash"],
          ],
          [25, 37, 38]
        ),

        spacer(), spacer(),
        heading2("2.4  Commission Resolver — Cascade Priority"),
        spacer(),
        bodyBold("Resolution Order (Highest Priority → Lowest):"),
        spacer(),
        flowDiagram([
          { actor: "Priority 1", action: "Entity-Specific: CommissionConfig WHERE entity_id = vendorId AND module_type = 'mart' AND is_active = true", color: "059669" },
          { actor: "Priority 2", action: "Module Default: CommissionConfig WHERE entity_type = 'vendor' AND module_type = 'mart' AND is_active = true", color: "D97706" },
          { actor: "Priority 3", action: "Hard-Coded Defaults: food: 15% | mart: 10% | pharma: 5% | rashan: 7.5% | other: 10%", color: "DC2626" },
        ]),
        spacer(),
        bodyBold("Commission Calculation Formula:"),
        ...codeBlock([
          "commission = subtotal × (commissionPercent / 100)",
          "IF minCommission > 0: commission = MAX(commission, minCommission)",
          "IF maxCommission > 0: commission = MIN(commission, maxCommission)",
          "RESULT = ROUND(commission, 2)",
        ]),

        spacer(), spacer(),
        heading2("2.5  Platform Service Fee"),
        body("A fixed per-order fee of ₨15 (default) is levied on every transaction. This fee is:"),
        bullet("Stored in settings table under key platform_service_fee"),
        bullet("Fetched dynamically at settlement time via settingsService.getNumber()"),
        bullet("Added to the PLATFORM_REV credit alongside the commission"),
        bullet("Adjustable in real-time through the Admin Panel without code deployment"),

        spacer(), spacer(),
        heading2("2.6  Automated Refund Engine — Contra-Accounting"),
        body("When an order is cancelled after settlement, the system generates a mathematical inversion of every original ledger line:"),
        spacer(),

        styledTable(
          ["Original Entry", "Direction", "Contra-Entry", "Direction"],
          [
            ["EARNINGS CREDIT ₨900 (Vendor)", "CREDIT", "EARNINGS DEBIT ₨900 (Claw-back)", "DEBIT"],
            ["PLATFORM_REV CREDIT ₨115", "CREDIT", "PLATFORM_REV DEBIT ₨115", "DEBIT"],
            ["EARNINGS CREDIT ₨80 (Rider)", "CREDIT", "EARNINGS DEBIT ₨80", "DEBIT"],
            ["CASH_IN_HAND DEBIT ₨1,095", "DEBIT", "CASH_IN_HAND CREDIT ₨1,095 (Debt cleared)", "CREDIT"],
          ],
          [30, 12, 38, 12]
        ),
        spacer(),
        noteBox("Zero-Deletion Guarantee: The original settlement rows remain permanently. The refund creates new rows that mathematically neutralize the original values. An auditor sees both the settlement AND its reversal.", "IMPORTANT"),
      ],
    },

    // ══════════════════════════════════════════════════
    // SECTION 3: CROSS-PLATFORM INTEGRATION
    // ══════════════════════════════════════════════════
    {
      properties: {},
      children: [
        heading1("3. Cross-Platform System Integration Matrix"),

        spacer(),
        heading2("3.A  User Application — Customer Interface"),
        spacer(),
        heading3("3.A.1  Cart Price Calculation Formula"),
        spacer(),
        ...codeBlock([
          "Final Amount = Subtotal",
          "             + Delivery Fee (distance-based from settings)",
          "             + Platform Service Fee (₨15 from settings)",
          "             − Coupon Discount (if valid)",
          "             − Wallet Credit (if applied)",
        ]),
        spacer(),
        styledTable(
          ["Component", "Source", "Dynamic?"],
          [
            ["Subtotal", "Sum of item.price × item.quantity", "Per-cart"],
            ["Delivery Fee", "settings.delivery_base_fee + per-km charges", "Per-order (distance)"],
            ["Platform Service Fee", "settings.platform_service_fee", "Admin-configurable"],
            ["Coupon Discount", "coupons table validation", "Per-code"],
            ["Wallet Credit", "User's wallets.balance", "Real-time"],
          ],
          [25, 45, 30]
        ),

        spacer(), spacer(),
        heading3("3.A.2  Coupon Validation Engine — 6-Step Chain"),
        spacer(),
        flowDiagram([
          { actor: "Step 1", action: "EXISTENCE CHECK → Query coupon by code → Fail: 'Invalid coupon code'", color: "3B82F6" },
          { actor: "Step 2", action: "EXPIRY CHECK → IF expiresAt < NOW() → Fail: 'This coupon has expired'", color: "3B82F6" },
          { actor: "Step 3", action: "MIN ORDER CHECK → IF subtotal < minOrderValue → Fail: 'Minimum order of ₨X required'", color: "D97706" },
          { actor: "Step 4", action: "USER LIMIT CHECK → COUNT user's previous uses → Fail: 'Already used this coupon'", color: "D97706" },
          { actor: "Step 5", action: "GLOBAL USAGE CHECK → COUNT total uses → Fail: 'Coupon has reached usage limit'", color: "DC2626" },
          { actor: "Step 6", action: "APPLY DISCOUNT → Calculate value, apply percentage/flat, enforce maxDiscountAmount cap", color: "059669" },
        ]),

        spacer(), spacer(),
        heading3("3.A.3  User Financial APIs"),
        styledTable(
          ["Endpoint", "Method", "Response"],
          [
            ["GET /finance/user/summary", "Authenticated", "{ balance: 150.00, updatedAt: '...' }"],
            ["GET /finance/user/statement", "Authenticated", "Array of chronological ledger entries (refunds, credits, promos)"],
          ],
          [35, 15, 50]
        ),

        spacer(), spacer(), spacer(),
        heading2("3.B  Rider Mobile Application — Logistics Interface"),
        spacer(),
        heading3("3.B.1  Order Acceptance Screen — Dynamic UI Indicators"),
        spacer(),
        styledTable(
          ["Cash Flow Mode", "UI Indicator", "Rider Action Required"],
          [
            ["CASH_ON_PICK", "🟢 'Cash on Pick: Pay ₨[subtotal] to Vendor'", "Rider must have personal cash to pay the shop. After customer pays, rider retains cash minus platform fee."],
            ["MERCHANT_CREDIT", "🔵 'Credit Order: Collect ₨[total] from Customer'", "Rider collects full amount from customer. Entire amount is added to rider's cash_in_hand debt."],
          ],
          [20, 35, 45]
        ),

        spacer(), spacer(),
        heading3("3.B.2  Cash-In-Hand & Wallet Tab"),
        bodyBold("API Endpoint: GET /finance/rider/summary"),
        spacer(),
        styledTable(
          ["Response Field", "Type", "Description"],
          [
            ["netBalance", "Number", "Accumulated delivery fee earnings (withdrawable)"],
            ["codOutstanding", "Number", "Total cash owed to platform (rider's debt)"],
            ["isSuspended", "Boolean", "Current suspension status"],
            ["limit", "Number", "Dynamic threshold from settings (default ₨5,000)"],
            ["totalEarnings", "Number", "netBalance + codOutstanding"],
          ],
          [25, 15, 60]
        ),
        spacer(),
        bodyBold("Mobile App Wallet UI Widgets:"),
        spacer(),
        styledTable(
          ["Widget", "Data Source", "Visual"],
          [
            ["Earnings Balance", "netBalance", "Green indicator — 'Your withdrawable earnings'"],
            ["Cash Debt", "codOutstanding", "Red/Amber indicator — 'Cash you owe to Baldia Mart'"],
            ["Debt Progress Bar", "codOutstanding / limit", "Visual 0-100% bar. Turns RED above 80%."],
            ["Suspension Banner", "isSuspended", "Full-screen overlay: 'Account suspended. Please remit ₨X.'"],
          ],
          [22, 20, 58]
        ),

        spacer(), spacer(),
        heading3("3.B.3  Automated Suspension Lifecycle"),
        spacer(),
        bodyBold("📊  Suspension State Machine Diagram"),
        spacer(),
        flowDiagram([
          { actor: "ACTIVE", action: "Rider completes delivery → cash_in_hand is updated atomically inside ACID transaction", color: "059669" },
          { actor: "CHECK", action: "checkRiderThreshold() → Fetches rider_cod_threshold from Settings (default: ₨5,000)", color: "3B82F6" },
          { actor: "CONDITION", action: "IF cash_in_hand > threshold → Set is_suspended = TRUE → Block new order acceptance", color: "DC2626" },
          { actor: "NOTIFY", action: "emitRiderSuspensionNotification() → Push/SMS alert: 'Account suspended. Please remit.'", color: "D97706" },
          { actor: "REMIT", action: "Rider pays via JazzCash / EasyPaisa / Office cash deposit", color: "3B82F6" },
          { actor: "RECONCILE", action: "POST /finance/admin/reconcile-cash → Creates CASH_IN_HAND CREDIT entry → reduces debt", color: "7C3AED" },
          { actor: "RE-CHECK", action: "IF cash_in_hand ≤ threshold → Set is_suspended = FALSE → AUTO-REACTIVATION (no admin needed)", color: "059669" },
        ]),
        spacer(),
        noteBox("All suspension logic runs INSIDE the same ACID transaction as the settlement. The rider's status is never out of sync with their ledger balance.", "IMPORTANT"),

        spacer(), spacer(), spacer(),
        heading2("3.C  Administrative Control Panel — Owner Dashboard"),
        spacer(),
        heading3("3.C.1  Live Financial KPIs — Real-Time SQL Aggregations"),
        body("The Admin Dashboard hero metrics are powered by four real-time database queries (zero dummy data):"),
        spacer(),

        bodyBold("Query 1: Capital Pool Metrics"),
        ...codeBlock([
          "SELECT",
          "  SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END) AS platform_liability,",
          "  SUM(cash_in_hand) AS cod_risk,",
          "  COUNT(id) AS total_nodes",
          "FROM wallets;",
        ]),
        spacer(),
        bodyBold("Query 2: Platform Revenue (Net of Refunds)"),
        ...codeBlock([
          "SELECT SUM(",
          "  CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END",
          ") AS net_rev",
          "FROM financial_ledger_entries",
          "WHERE account_tag = 'PLATFORM_REV';",
        ]),
        spacer(),
        bodyBold("Query 3: Vertical Revenue Breakdown (Silo Isolation)"),
        ...codeBlock([
          "SELECT module_type AS module,",
          "  SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE -amount END) AS total",
          "FROM financial_ledger_entries",
          "WHERE account_tag = 'PLATFORM_REV'",
          "GROUP BY module_type;",
        ]),
        spacer(),
        bodyBold("Query 4: Cash Pipeline Audit"),
        ...codeBlock([
          "SELECT",
          "  SUM(CASE WHEN direction = 'DEBIT' THEN amount ELSE 0 END) AS collected,",
          "  SUM(CASE WHEN direction = 'CREDIT' THEN amount ELSE 0 END) AS remitted",
          "FROM financial_ledger_entries",
          "WHERE account_tag = 'CASH_IN_HAND';",
        ]),

        spacer(), spacer(),
        heading3("3.C.2  Dashboard KPI Card Mapping"),
        styledTable(
          ["Admin Dashboard Card", "API Field", "SQL Source"],
          [
            ["Consolidated Net Profit", "totalCommissions", "Net PLATFORM_REV (credits − debits)"],
            ["Resto/Mart GMV", "martEarnings + foodEarnings", "Module-filtered commission revenue"],
            ["Bulk Rashan Hub", "rashanEarnings", "Explicitly isolated from Mart"],
            ["Rider COD Risk", "codOutstanding", "Sum of all rider cash_in_hand"],
            ["Platform Liability", "netBalance", "Total positive wallet balances"],
            ["Cash Pipeline Gap", "cashPipeline.gap", "collected − remitted (unreconciled)"],
          ],
          [30, 30, 40]
        ),

        spacer(), spacer(),
        heading3("3.C.3  Global Financial Controls"),
        styledTable(
          ["Setting Key", "Admin UI Control", "Default", "Effect"],
          [
            ["platform_service_fee", "Number input (₨)", "15", "Fixed fee added to every order's platform revenue"],
            ["rider_cod_threshold", "Number input (₨)", "5000", "Max cash held by rider before auto-suspension"],
            ["cod_limit_mart", "Number input (₨)", "5000", "Max COD order value for Mart"],
            ["cod_limit_food", "Number input (₨)", "2000", "Max COD order value for Food"],
            ["cod_limit_pharma", "Number input (₨)", "2000", "Max COD order value for Pharma"],
          ],
          [25, 20, 12, 43]
        ),

        spacer(), spacer(),
        heading3("3.C.4  Manual Reconciliation"),
        bodyBold("Endpoint: POST /finance/admin/reconcile-cash"),
        body("Auth: Admin Role Guard"),
        spacer(),
        styledTable(
          ["Request Body Field", "Type", "Example"],
          [
            ["riderId", "UUID", "uuid-of-rider"],
            ["amount", "Number", "3000"],
            ["referenceId", "String", "JAZZCASH-TXN-12345"],
          ],
          [30, 20, 50]
        ),
        spacer(),
        body("Effect: Creates a CASH_IN_HAND CREDIT entry that reduces the rider's debt. If the new cashInHand drops below rider_cod_threshold, the rider is automatically reactivated."),

        spacer(), spacer(),
        heading3("3.C.5  Audit Log: Daily Snapshots API"),
        bodyBold("Endpoint: GET /finance/admin/daily-snapshots?from=2026-06-01&to=2026-06-26"),
        spacer(),
        body("Returns pre-computed daily aggregates including total orders, completed/cancelled counts, gross revenue, commissions, payouts, COD flows, and per-vertical revenue breakdown."),
      ],
    },

    // ══════════════════════════════════════════════════
    // SECTION 4: CODE BLUEPRINT
    // ══════════════════════════════════════════════════
    {
      properties: {},
      children: [
        heading1("4. End-to-End Code Repository Blueprint"),
        spacer(),
        heading2("4.1  Master FinanceService — Section Index"),
        spacer(),
        styledTable(
          ["Section #", "Method / Function", "Purpose"],
          [
            ["1", "onModuleInit() / healOrphanedSettlements()", "Startup auto-healing: Re-settles any delivered orders missing from the ledger"],
            ["2", "executeLedgerTransaction()", "Core double-entry engine with pessimistic locking and auto-suspension triggers"],
            ["3", "checkRiderThreshold()", "Dynamic threshold lookup and automated suspension/reactivation"],
            ["4", "ensureWallet()", "Auto-provisioning of wallet records for new entities"],
            ["5", "processOrderSettlement()", "The Dynamic Cash-Flow Routing Engine (CASH_ON_PICK vs MERCHANT_CREDIT)"],
            ["6", "reconcileRiderCash()", "Manual cash reconciliation via external payment channels"],
            ["7", "getCommissionRate() / calculateCommission()", "Cascade commission resolver with vertical-specific defaults"],
            ["8", "processOrderRefund()", "Contra-accounting reversal engine (zero-deletion)"],
            ["9", "getPortfolioSummary()", "Real-time admin dashboard aggregations (4 optimized SQL queries)"],
            ["10", "generateDailySnapshot()", "Nightly cron job for immutable audit trail snapshots"],
            ["11", "getWalletStatement() / getFinancialLeaderboard()", "Utility methods for statements and rankings"],
          ],
          [10, 40, 50]
        ),

        spacer(), spacer(),
        bodyBold("📁  File Location: backend-api/src/finance/finance.service.ts"),
        spacer(),
        body("The complete, production-ready TypeScript implementation is maintained in the codebase at the path above. It contains all 11 sections listed in this index, with full architectural comments, ACID compliance, pessimistic locking, and typed interfaces."),
        spacer(),
        body("Key dependencies injected via NestJS DI:"),
        bullet("FinancialTransactionRepository — Parent transaction anchors"),
        bullet("FinancialLedgerEntryRepository — Immutable ledger lines"),
        bullet("CommissionConfigRepository — Dynamic commission rates"),
        bullet("WalletRepository — Virtual capital accounts"),
        bullet("DailyFinancialSnapshotRepository — Audit trail snapshots"),
        bullet("SettingsService — Dynamic operational parameters"),
        bullet("WalletsService (forwardRef) — Cross-module settlement bridge"),

        spacer(), spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [new TextRun({ text: "═══════════════════════════════════════════════════", size: 20, color: COLORS.BORDER })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "END OF SRS DOCUMENT v3.0", bold: true, size: 22, color: COLORS.MUTED })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "This document is the absolute single source of truth for the Baldia Mart Financial Management System.", italic: true, size: 18, color: COLORS.MUTED })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "All future engineering work must reference this specification before making modifications.", italic: true, size: 18, color: COLORS.MUTED })],
        }),
      ],
    },
  ],
});

// ═══════════════════════════════════════════════════════
// GENERATE THE FILE
// ═══════════════════════════════════════════════════════

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Baldia_Mart_Financial_SRS_v3.docx", buffer);
  console.log("✅ Document generated: Baldia_Mart_Financial_SRS_v3.docx");
  console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);
});
