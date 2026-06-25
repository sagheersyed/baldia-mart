
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } = require("docx");
const fs = require("fs");

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            // Title
            new Paragraph({
                alignment: AlignmentType.CENTER,
                heading: HeadingLevel.TITLE,
                children: [
                    new TextRun({
                        text: "BALDIA MART — ENTERPRISE FINANCIAL MANAGEMENT",
                        bold: true,
                        size: 32,
                        color: "1A1A1A",
                    }),
                ],
            }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({
                        text: "Complete System Documentation & Operational Guide",
                        italic: true,
                        size: 24,
                        color: "666666",
                    }),
                ],
            }),
            new Paragraph({ text: "" }), // Spacer

            // EXECUTIVE SUMMARY
            new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun({ text: "1. Executive Summary", bold: true, color: "1E293B" })],
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "The Baldia Mart Financial Management System is an elite-grade, double-entry ledger architecture designed to manage multi-vertical liquidity (Food, Mart, Pharma, and Rashan). The system ensures 100% auditability by separating platform revenue, vendor payouts, and rider liabilities into distinct virtual accounts within a consolidated capital pool.",
                    }),
                ],
            }),

            // SECTION: DASHBOARD KPI BREAKDOWN
            new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun({ text: "2. Dashboard Analytics & Hero Metrics", bold: true, color: "1E293B" })],
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "The Finance Dashboard provides a high-velocity overview of platform health through four primary strategic indicators:", bold: true }),
                ],
            }),

            // Table for Hero Metrics
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Definition & Role", bold: true })] })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Example Logic", bold: true })] })] }),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("Consolidated Net Profit")] }),
                            new TableCell({ children: [new Paragraph("The total 'take-home' realized by the platform after all vendor payouts and rider fees.")] }),
                            new TableCell({ children: [new Paragraph("Total Commission - Operational Discounts")] }),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("Resto/Mart GMV")] }),
                            new TableCell({ children: [new Paragraph("Gross Merchandise Volume for standard retail. Excludes bulk charity/rashan sectors for clean reporting.")] }),
                            new TableCell({ children: [new Paragraph("Order Subtotal (Food/Mart)")] }),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("Bulk Rashan Hub")] }),
                            new TableCell({ children: [new Paragraph("Isolated financial silo for the Rashan vertical, allowing for specific tax and bulk accounting.")] }),
                            new TableCell({ children: [new Paragraph("Sum of all Rashan-tagged ledgers")] }),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("Rider COD Risk")] }),
                            new TableCell({ children: [new Paragraph("Total platform cash currently sitting in the pockets of on-field riders.")] }),
                            new TableCell({ children: [new Paragraph("Sum of all Rider 'Cash-in-Hand' balances")] }),
                        ],
                    }),
                ],
            }),

            new Paragraph({ text: "" }),

            // SECTION: CAPITAL HQ
            new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun({ text: "3. Capital HQ: Wallet & Ledger Control", bold: true, color: "1E293B" })],
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "This section manages the live liquidity of every entity. It uses a three-pillar debt/liability model:",
                    }),
                ],
            }),

            new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Platform Liability: The sum of all earnings owed to vendors and riders. This is the platform's debt to its partners.", bold: true })] }),
            new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Outstanding Credit (Risk): The cash held by riders from COD deliveries. This is the amount entities owe to the platform.", bold: true })] }),
            new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Pending Payouts: Liquidity currently 'locked' in the withdrawal queue awaiting admin release.", bold: true })] }),

            new Paragraph({ text: "" }),
            new Paragraph({ children: [new TextRun({ text: "Capital Accounts Table Interface:", italic: true })] }),
            new Paragraph({ bullet: { level: 1 }, children: [new TextRun({ text: "ENTITY PROFILE: Displays the verified name and Unique UID of the account holder." })] }),
            new Paragraph({ bullet: { level: 1 }, children: [new TextRun({ text: "ACCOUNT TYPE: Categorizes the ledger into Rider (delivery asset) or Vendor (merchant inventory)." })] }),
            new Paragraph({ bullet: { level: 1 }, children: [new TextRun({ text: "NET BALANCE: The mathematical difference between Earnings (+) and Cash Liability (-)." })] }),
            new Paragraph({ bullet: { level: 1 }, children: [new TextRun({ text: "SYNC DATE: The last time the double-entry protocol verified this account's integrity." })] }),
            new Paragraph({ bullet: { level: 1 }, children: [new TextRun({ text: "ACTION (Manual Sync): A critical button to record physical cash handovers from riders to the office." })] }),

            new Paragraph({ text: "" }),

            // SECTION: PAYOUT QUEUE
            new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun({ text: "4. Payout Queue & Disbursement Protocols", bold: true, color: "1E293B" })],
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "The Payout Queue handles the outflow of capital. Every disbursement follows a strictly logged protocol:",
                    }),
                ],
            }),

            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("ID / Quantum")] }),
                            new TableCell({ children: [new Paragraph("Recipient Channel")] }),
                            new TableCell({ children: [new Paragraph("Protocol Status")] }),
                        ],
                    }),
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph("#PAY-XXXXX") ] }),
                            new TableCell({ children: [new Paragraph("Bank Transfer / EasyPaisa / JazzCash")] }),
                            new TableCell({ children: [new Paragraph("Approve (Release Liquidity) or Deny (Block Fund)")] }),
                        ],
                    }),
                ],
            }),

            new Paragraph({ text: "" }),

            // SECTION: GROWTH VELOCITY
            new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun({ text: "5. Growth Velocity & Strategic Tiers", bold: true, color: "1E293B" })],
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "This card shows the 30-day performance split across verticals:",
                    }),
                ],
            }),
            new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Mart Revenue: Standard inventory sales velocity." })] }),
            new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Food Revenue: Multi-restaurant restaurant sector performance." })] }),
            new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Pharma Revenue: Cold-chain and medical asset revenue." })] }),

            new Paragraph({ text: "" }),

            // SECTION: TOP SELLERS
            new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun({ text: "6. Top Sellers & Strategic Rank", bold: true, color: "1E293B" })],
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "The Top Sellers widget identifies high-performance merchants. Rankings are updated dynamically every 24 hours based on:",
                    }),
                ],
            }),
            new Paragraph({ bullet: { level: 1 }, children: [new TextRun({ text: "Volume (Global Orders): Total quantity of deliveries processed." })] }),
            new Paragraph({ bullet: { level: 1 }, children: [new TextRun({ text: "Quantum Value (Revenue): Total rupee value of sales through their shop." })] }),
            new Paragraph({ bullet: { level: 1 }, children: [new TextRun({ text: "Audit Export: Admins can export a Strategic Audit report for these performers." })] }),

            new Paragraph({ text: "" }),

            // SECTION: AUDIT LOG
            new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun({ text: "7. Audit Log: Daily Snapshots", bold: true, color: "1E293B" })],
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: "An immutable record of platform state saved daily at GMT 00:01. It contains:",
                    }),
                ],
            }),
            new Paragraph({ bullet: { level: 1 }, children: [new TextRun({ text: "Velocity: Count of total transmissions (successful transactions)." })] }),
            new Paragraph({ bullet: { level: 1 }, children: [new TextRun({ text: "System GMV: Total sales value passing through the platform." })] }),
            new Paragraph({ bullet: { level: 1 }, children: [new TextRun({ text: "Delivery Assets: The total delivery fees generated to cover logistics." })] }),
            new Paragraph({ bullet: { level: 1 }, children: [new TextRun({ text: "Reconciliation: Audit Verification badge indicating no discrepancies in the ledger." })] }),

            new Paragraph({ text: "" }),
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({
                        text: "End of Documentation — Confidential for Financial Audit Purposes",
                        bold: true,
                        size: 16,
                        color: "999999",
                    }),
                ],
            }),
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("Baldia_Mart_Financial_Documentation.docx", buffer);
    console.log("Document generated successfully: Baldia_Mart_Financial_Documentation.docx");
});
