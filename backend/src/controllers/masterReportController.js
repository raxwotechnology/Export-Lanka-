import asyncHandler from 'express-async-handler';
import ExcelJS from 'exceljs';
import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Customer from '../models/Customer.js';
import StockItem from '../models/StockItem.js';
import ProductionBatch from '../models/ProductionBatch.js';
import DailyPnL from '../models/DailyPnL.js';
import PettyCash from '../models/PettyCash.js';
import DamageRecord from '../models/DamageRecord.js';
import CustomerReturn from '../models/CustomerReturn.js';
import FarmHarvest from '../models/FarmHarvest.js';
import Bill from '../models/Bill.js';

// Baseline monthly budgets based on Master DHY & Farm operations
const DHY_BASELINE_BUDGET = {
    rawMaterial: 934413.55,
    labourSalary: 394878.42,
    supervisorQC: 0,
    firewood: 21854.84,
    electricityCeb: 135000.00,
    electricityGen: 0,
    water: 20000.00,
    chemicalNitrogen: 0,
    foodWelfare: 34838.71,
    packingMaterial: 113401.61,
    machineMaintenance: 59964.52,
    transport: 85006.45,
    wifiComm: 15000.00,
    pettyCashWages: 61764.52,
    fixedOverhead: 755645.16,
    miscellaneous: 64000.00,
    primarySalesRevenue: 2229741.94,
    finishedSalesRevenue: 0,
    loanRecovery: 0
};

const FARM_BASELINE_BUDGET = {
    salaryFarm: 95000.00,
    salaryAdminFarm: 75000.00,
    maintenanceFarm: 10000.00,
    transportFarm: 15000.00,
    fertilizer: 25000.00,
    pettyCashFarm: 100000.00,
    moringaLeaves: 30000.00,
    bananaSales: 7500.00,
    otherFarmItems: 40000.00
};

// ── Corporate Colors & Number Formats matching Original Template ─────────────
const COLORS = {
    forestGreen: 'FF047857',   // BE Header
    darkEmerald: 'FF065F46',   // Main Titles
    navySlate:   'FF1E293B',   // Executive Overview Header
    royalBlue:   'FF2563EB',   // Sales Invoices Header
    vibrantGreen:'FF059669',   // Inventory Header
    purpleViolet:'FF7C3AED',   // Production Header
    deepTeal:    'FF0F766E',   // Daily P&L Header

    // Section Banners
    softGreenBg: 'FFD1FAE5',   // DHY Expenses section
    softBlueBg:  'FFDBEAFE',   // Revenue section
    softAmberBg: 'FFFEF3C7',   // Farm Expenses section
    softPurpleBg:'FFF5F3FF',   // Production total
    lightGrayBg: 'FFF3F4F6',   // Total rows
    zebraLight:  'FFF8FAFC',   // Alternating rows
    borderGray:  'FFE2E8F0',   // Cell border
};

const LKR_NUM_FMT = '"Rs. "#,##0.00;("Rs. "#,##0.00);"-"';
const QTY_NUM_FMT = '#,##0.00';
const PCT_NUM_FMT = '0.0%';

const applyBorders = (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
            top: { style: 'thin', color: { argb: COLORS.borderGray } },
            left: { style: 'thin', color: { argb: COLORS.borderGray } },
            bottom: { style: 'thin', color: { argb: COLORS.borderGray } },
            right: { style: 'thin', color: { argb: COLORS.borderGray } }
        };
    });
};

const styleHeaderRow = (row, bgArgb, height = 26) => {
    row.height = height;
    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
            right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
        };
    });
};

/**
 * Controller to generate Enterprise Master Report (6 Sheets)
 * GET /api/export/master-report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const exportMasterReport = asyncHandler(async (req, res) => {
    let { startDate, endDate } = req.query;

    const now = new Date();
    let start, end;

    if (startDate && endDate) {
        start = new Date(`${startDate}T00:00:00.000Z`);
        end = new Date(`${endDate}T23:59:59.999Z`);
    } else {
        start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
        end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
        startDate = start.toISOString().slice(0, 10);
        endDate = end.toISOString().slice(0, 10);
    }

    const diffTime = Math.abs(end - start);
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const periodScale = diffDays / 30;

    // Parallel Database Queries
    const [
        invoices,
        allProducts,
        stockItems,
        batches,
        dailyPnls,
        pettyCashRecords,
        damages,
        returns,
        farmHarvests,
        bills
    ] = await Promise.all([
        Invoice.find({
            invoiceDate: { $gte: start, $lte: end },
            deletedAt: null
        }).populate('customerId').sort({ invoiceDate: 1 }),

        Product.find({ deletedAt: null }).populate('categoryId').sort({ name: 1 }),
        StockItem.find(),
        ProductionBatch.find({
            date: { $gte: start, $lte: end },
            deletedAt: null
        }).sort({ date: 1 }),

        DailyPnL.find({
            date: { $gte: start, $lte: end },
            deletedAt: null
        }).sort({ date: 1 }),

        PettyCash.find({
            date: { $gte: start, $lte: end },
            status: { $ne: 'rejected' },
            deletedAt: null
        }),

        DamageRecord.find({
            createdAt: { $gte: start, $lte: end },
            deletedAt: null
        }),

        CustomerReturn.find({
            returnDate: { $gte: start, $lte: end },
            deletedAt: null
        }),

        FarmHarvest.find({
            harvestDate: { $gte: start, $lte: end },
            deletedAt: null
        }),

        Bill.find({
            billDate: { $gte: start, $lte: end },
            deletedAt: null
        })
    ]);

    // Compute stock map: productId -> total onHand quantity
    const stockMap = new Map();
    stockItems.forEach(item => {
        const pId = item.productId?.toString();
        if (pId) {
            const current = stockMap.get(pId) || 0;
            stockMap.set(pId, current + (item.quantities?.onHand || 0));
        }
    });

    // ── Metric Aggregations ──
    const totalInvoicedValue = invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
    const paidSalesRevenue = invoices
        .filter(inv => inv.paymentStatus === 'paid')
        .reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
    const invoiceCount = invoices.length;

    let totalInventoryValuation = 0;
    const inventoryValuationRows = allProducts.map(p => {
        const qty = stockMap.get(p._id.toString()) || p.onHand || 0;
        const unitPrice = p.basePrice || p.costPrice || 0;
        const lineValuation = qty * unitPrice;
        totalInventoryValuation += lineValuation;

        let reorderStatus = 'Healthy';
        if (qty <= 0) {
            reorderStatus = 'Out of Stock';
        } else if (p.reorderPoint && qty <= p.reorderPoint) {
            reorderStatus = 'Low Stock';
        }

        return {
            name: p.name || 'Unnamed Product',
            sku: p.sku || p.productCode || '—',
            category: p.categoryId?.name || p.productType || 'General',
            unitPrice: unitPrice,
            currentStock: qty,
            valuation: lineValuation,
            reorderStatus: reorderStatus
        };
    });

    const totalRawMaterialIngested = batches.reduce((sum, b) => sum + (Number(b.inputWeight_total) || 0), 0);
    const totalFinishedDryOutput = batches.reduce((sum, b) => sum + (Number(b.outputWeight_total) || 0), 0);
    const totalLostValue = damages.reduce((sum, d) => sum + (Number(d.totalValue) || 0), 0) +
                           returns.reduce((sum, r) => sum + (Number(r.totalRefundAmount) || 0), 0);

    const sumPnlRevenue = dailyPnls.reduce((sum, p) => sum + (Number(p.totalRevenue) || 0), 0);
    const sumPnlExpenses = dailyPnls.reduce((sum, p) => sum + (Number(p.totalExpenses) || 0), 0);
    const realizedSales = totalInvoicedValue > 0 ? totalInvoicedValue : sumPnlRevenue;
    const netOperatingProfit = realizedSales - sumPnlExpenses;

    const pettyCashCategoryMap = {};
    pettyCashRecords.forEach(pc => {
        const cat = (pc.category || 'other').toLowerCase();
        pettyCashCategoryMap[cat] = (pettyCashCategoryMap[cat] || 0) + (Number(pc.amount) || 0);
    });

    // ── Build Master Workbook ──
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Authentic Lanka Exports ERP';
    workbook.created = new Date();

    // =========================================================================
    // SHEET 1: BE Expense Analysis (Forest Green Theme)
    // =========================================================================
    const beSheet = workbook.addWorksheet('BE Expense Analysis', {
        properties: { tabColor: { argb: COLORS.forestGreen } },
        views: [{ showGridLines: true }]
    });

    // Row 1: Title
    const r1 = beSheet.getRow(1);
    r1.height = 24;
    beSheet.mergeCells('A1:G1');
    const beTitle = beSheet.getCell('A1');
    beTitle.value = `Export Lanka - BE Expense Analysis & Daily P&L (${startDate} to ${endDate})`;
    beTitle.font = { name: 'Calibri', size: 15, bold: true, color: { argb: COLORS.darkEmerald } };
    beTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 2: Subtitle
    const r2 = beSheet.getRow(2);
    r2.height = 18;
    beSheet.mergeCells('A2:G2');
    const beSub = beSheet.getCell('A2');
    beSub.value = `Reporting Duration: ${diffDays} Day(s) | Dehydration Facility & Farm Operations Operational Audit`;
    beSub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF6B7280' } };
    beSub.alignment = { horizontal: 'center', vertical: 'middle' };

    beSheet.addRow([]); // Blank row 3

    // Row 4: Header
    const beHeaderRow = beSheet.addRow([
        'Account / Cost Item',
        'Baseline Month Budget',
        'Period Best Estimate',
        'Planned Target',
        'Actual Realized',
        'Variance Difference',
        'Variance %'
    ]);
    styleHeaderRow(beHeaderRow, COLORS.forestGreen);

    const styleBeDataRow = (row, isLkr = true) => {
        row.height = 20;
        applyBorders(row);
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        for (let c = 2; c <= 6; c++) {
            row.getCell(c).alignment = { vertical: 'middle', horizontal: 'right' };
            if (isLkr) row.getCell(c).numFmt = LKR_NUM_FMT;
        }
        row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    };

    const addBeCostLine = (name, baseMonthly, actualRealized = 0) => {
        const periodBE = +(baseMonthly * periodScale).toFixed(2);
        const plannedTarget = +(periodBE * 0.4).toFixed(2);
        const varianceDiff = +(periodBE - actualRealized).toFixed(2);
        const variancePct = periodBE > 0 ? `${((varianceDiff / periodBE) * 100).toFixed(0)}%` : '0%';

        const row = beSheet.addRow([
            name,
            baseMonthly,
            periodBE,
            plannedTarget,
            actualRealized,
            varianceDiff,
            variancePct
        ]);
        styleBeDataRow(row);
        return { baseMonthly, periodBE, plannedTarget, actualRealized, varianceDiff };
    };

    const addSectionBanner = (text, bgArgb, textArgb = COLORS.navySlate) => {
        beSheet.addRow([]);
        const row = beSheet.addRow([text, '', '', '', '', '', '']);
        row.height = 22;
        beSheet.mergeCells(`A${row.number}:G${row.number}`);
        row.getCell(1).font = { name: 'Calibri', bold: true, color: { argb: textArgb }, size: 11 };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        applyBorders(row);
        return row;
    };

    const addSummaryTotalRow = (label, base, be, plan, act, diff, pct = '0%') => {
        const row = beSheet.addRow([label, base, be, plan, act, diff, pct]);
        row.height = 22;
        row.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: COLORS.navySlate } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightGrayBg } };
        });
        styleBeDataRow(row);
        row.getCell(1).border = {
            top: { style: 'thin', color: { argb: 'FF94A3B8' } },
            bottom: { style: 'double', color: { argb: 'FF94A3B8' } },
            left: { style: 'thin', color: { argb: COLORS.borderGray } },
            right: { style: 'thin', color: { argb: COLORS.borderGray } }
        };
        for (let c = 2; c <= 7; c++) {
            row.getCell(c).border = {
                top: { style: 'thin', color: { argb: 'FF94A3B8' } },
                bottom: { style: 'double', color: { argb: 'FF94A3B8' } },
                left: { style: 'thin', color: { argb: COLORS.borderGray } },
                right: { style: 'thin', color: { argb: COLORS.borderGray } }
            };
        }
        return row;
    };

    // ── Helper functions for granular transaction breakdown ──
    const getPettyCashSum = (predicate) => {
        return pettyCashRecords
            .filter(pc => pc.transactionType === 'expense' || !pc.transactionType)
            .reduce((sum, pc) => {
                const text = `${pc.item || ''} ${pc.category || ''} ${pc.supplier || ''}`.toLowerCase();
                return predicate(text, pc) ? sum + (Number(pc.amount) || 0) : sum;
            }, 0);
    };

    const getBillSum = (predicate) => {
        return bills.reduce((sum, b) => {
            const text = `${b.supplierSnapshot?.name || ''} ${b.notes || ''}`.toLowerCase();
            return predicate(text, b) ? sum + (Number(b.grandTotal || b.subtotal || b.totalAmount) || 0) : sum;
        }, 0);
    };

    // 1. DHY Expenses Actuals
    const dhyRawMaterialActual = dailyPnls.reduce((s, p) => s + (Number(p.rawMaterial) || 0), 0) +
        pettyCashRecords.reduce((s, pc) => s + (Number(pc.rawMaterial_cost) || 0), 0) +
        getBillSum(t => t.includes('raw material') || t.includes('produce') || t.includes('fresh leaf'));

    const dhyLabourActual = dailyPnls.reduce((s, p) => s + (Number(p.labourSalary) || 0), 0) +
        getPettyCashSum(t => (t.includes('labour') || t.includes('salary') || t.includes('fireman') || t.includes('wages')) && !t.includes('farm'));

    const dhySupervisorActual = dailyPnls.reduce((s, p) => s + (Number(p.supervisorQC) || 0), 0) +
        getPettyCashSum(t => t.includes('supervisor') || t.includes('qc') || t.includes('quality'));

    const dhyFirewoodActual = dailyPnls.reduce((s, p) => s + (Number(p.firewood) || 0), 0) +
        pettyCashRecords.reduce((s, pc) => s + (Number(pc.wood) || 0), 0) +
        getPettyCashSum(t => t.includes('wood') || t.includes('firewood'));

    const dhyElectricityCebActual = dailyPnls.reduce((s, p) => s + (Number(p.electricity) || 0), 0) +
        getPettyCashSum(t => (t.includes('ceb') || t.includes('electricity') || t.includes('power')) && !t.includes('gen')) +
        getBillSum(t => t.includes('ceb') || t.includes('electricity'));

    const dhyElectricityGenActual = pettyCashRecords.reduce((s, pc) => s + (Number(pc.fuel) || 0), 0) +
        getPettyCashSum(t => t.includes('generator') || t.includes('diesel') || t.includes('fuel'));

    const dhyWaterActual = getPettyCashSum(t => t.includes('water') || t.includes('nwsdb')) +
        getBillSum(t => t.includes('water') || t.includes('nwsdb'));

    const dhyChemicalNitrogenActual = pettyCashRecords.reduce((s, pc) => s + (Number(pc.chemicals) || 0), 0) +
        getPettyCashSum(t => t.includes('chemical') || t.includes('nitrogen'));

    const dhyFoodWelfareActual = pettyCashRecords.reduce((s, pc) => s + (Number(pc.welfare) || 0), 0) +
        getPettyCashSum(t => t.includes('welfare') || t.includes('food') || t.includes('tea') || t.includes('lunch') || t.includes('meal'));

    const dhyPackingMaterialActual = dailyPnls.reduce((s, p) => s + (Number(p.packing) || 0), 0) +
        pettyCashRecords.reduce((s, pc) => s + (Number(pc.packingMaterials) || 0), 0) +
        getPettyCashSum(t => t.includes('packing') || t.includes('pouch') || t.includes('carton') || t.includes('box')) +
        getBillSum(t => t.includes('packing'));

    const dhyMachineMaintenanceActual = pettyCashRecords.reduce((s, pc) => s + (Number(pc.maintenance) || 0), 0) +
        getPettyCashSum(t => (t.includes('maintenance') || t.includes('repair') || t.includes('machine') || t.includes('spare') || t.includes('dryer')) && !t.includes('farm')) +
        getBillSum(t => (t.includes('repair') || t.includes('maintenance')) && !t.includes('farm'));

    const dhyTransportActual = dailyPnls.reduce((s, p) => s + (Number(p.transport) || 0), 0) +
        pettyCashRecords.reduce((s, pc) => s + (Number(pc.transport) || 0), 0) +
        getPettyCashSum(t => (t.includes('transport') || t.includes('lorry') || t.includes('freight') || t.includes('delivery')) && !t.includes('farm')) +
        getBillSum(t => t.includes('transport') && !t.includes('farm'));

    const dhyWifiCommActual = dailyPnls.reduce((s, p) => s + (Number(p.communication) || 0), 0) +
        getPettyCashSum(t => t.includes('wifi') || t.includes('internet') || t.includes('dialog') || t.includes('slt') || t.includes('mobitel') || t.includes('communication') || t.includes('phone')) +
        getBillSum(t => t.includes('dialog') || t.includes('slt') || t.includes('telecom'));

    const dhyPettyCashWagesActual = pettyCashRecords.reduce((s, pc) => s + (Number(pc.miscWages) || 0), 0) +
        getPettyCashSum(t => t.includes('petty wage') || t.includes('daily wage'));

    const dhyFixedOverheadActual = getPettyCashSum(t => t.includes('rent') || t.includes('overhead') || t.includes('lease') || t.includes('insurance')) +
        getBillSum(t => t.includes('rent') || t.includes('lease') || t.includes('insurance'));

    const dhyMiscellaneousActual = dailyPnls.reduce((s, p) => s + (Number(p.other) || 0), 0) +
        pettyCashRecords.reduce((s, pc) => s + (Number(pc.stationary) || 0), 0) +
        getPettyCashSum(t => t.includes('misc') || t.includes('stationary') || t.includes('cleaning') || t.includes('general') || t.includes('hardware'));

    // 1. DHY Expenses
    addSectionBanner('1. DEHYDRATION FACILITY (DHY) EXPENSES', COLORS.softGreenBg);
    let totalDhyBase = 0, totalDhyBE = 0, totalDhyPlan = 0, totalDhyActual = 0;

    const dhyItems = [
        ['Raw Material', DHY_BASELINE_BUDGET.rawMaterial, dhyRawMaterialActual],
        ['Labour Salary + Fireman', DHY_BASELINE_BUDGET.labourSalary, dhyLabourActual],
        ['Supervisor and QC', DHY_BASELINE_BUDGET.supervisorQC, dhySupervisorActual],
        ['Firewood', DHY_BASELINE_BUDGET.firewood, dhyFirewoodActual],
        ['Electricity (CEB)', DHY_BASELINE_BUDGET.electricityCeb, dhyElectricityCebActual],
        ['Electricity (Generator)', DHY_BASELINE_BUDGET.electricityGen, dhyElectricityGenActual],
        ['Water', DHY_BASELINE_BUDGET.water, dhyWaterActual],
        ['Chemical & Nitrogen', DHY_BASELINE_BUDGET.chemicalNitrogen, dhyChemicalNitrogenActual],
        ['Food and Welfare', DHY_BASELINE_BUDGET.foodWelfare, dhyFoodWelfareActual],
        ['Packing Material', DHY_BASELINE_BUDGET.packingMaterial, dhyPackingMaterialActual],
        ['Machine Maintenance', DHY_BASELINE_BUDGET.machineMaintenance, dhyMachineMaintenanceActual],
        ['Transport', DHY_BASELINE_BUDGET.transport, dhyTransportActual],
        ['Wifi / Communication', DHY_BASELINE_BUDGET.wifiComm, dhyWifiCommActual],
        ['Petty Cash / Wages', DHY_BASELINE_BUDGET.pettyCashWages, dhyPettyCashWagesActual],
        ['Fixed Overhead Cost', DHY_BASELINE_BUDGET.fixedOverhead, dhyFixedOverheadActual],
        ['Miscellaneous Operations', DHY_BASELINE_BUDGET.miscellaneous, dhyMiscellaneousActual]
    ];

    dhyItems.forEach(([name, base, act]) => {
        const res = addBeCostLine(name, base, act);
        totalDhyBase += res.baseMonthly;
        totalDhyBE += res.periodBE;
        totalDhyPlan += res.plannedTarget;
        totalDhyActual += res.actualRealized;
    });

    const dhyVarPct = totalDhyBE > 0 ? `${(((totalDhyBE - totalDhyActual) / totalDhyBE) * 100).toFixed(0)}%` : '0%';
    addSummaryTotalRow('TOTAL DHY EXPENSES', totalDhyBase, totalDhyBE, totalDhyPlan, totalDhyActual, +(totalDhyBE - totalDhyActual).toFixed(2), dhyVarPct);

    // 2. DHY Revenue
    addSectionBanner('2. DEHYDRATION FACILITY REVENUE', COLORS.softBlueBg);
    const revRes = addBeCostLine('Primary / Raw Material Sales', DHY_BASELINE_BUDGET.primarySalesRevenue, realizedSales);
    addBeCostLine('Finished Product Sales', DHY_BASELINE_BUDGET.finishedSalesRevenue, 0);
    addBeCostLine('Loan Recovery', DHY_BASELINE_BUDGET.loanRecovery, 0);

    const dhyRevVarPct = revRes.periodBE > 0 ? `${(((revRes.periodBE - realizedSales) / revRes.periodBE) * 100).toFixed(0)}%` : '0%';
    addSummaryTotalRow('TOTAL DHY REVENUE', DHY_BASELINE_BUDGET.primarySalesRevenue, revRes.periodBE, revRes.plannedTarget, realizedSales, +(revRes.periodBE - realizedSales).toFixed(2), dhyRevVarPct);

    const dhyNetProfit = realizedSales - totalDhyActual;
    const dhyNetBE = +(revRes.periodBE - totalDhyBE).toFixed(2);
    const dhyNetDiff = +(dhyNetBE - dhyNetProfit).toFixed(2);
    const dhyNetPct = dhyNetBE !== 0 ? `${((dhyNetDiff / Math.abs(dhyNetBE)) * 100).toFixed(0)}%` : '0%';

    const dhyNetProfitRow = beSheet.addRow([
        'DHY Net Profit / (Loss)',
        0,
        dhyNetBE,
        +(revRes.plannedTarget - totalDhyPlan).toFixed(2),
        +dhyNetProfit.toFixed(2),
        dhyNetDiff,
        dhyNetPct
    ]);
    styleBeDataRow(dhyNetProfitRow);
    dhyNetProfitRow.height = 22;
    dhyNetProfitRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: dhyNetProfit >= 0 ? COLORS.forestGreen : 'FFDC2626' } };
    });

    // 3. Farm Expenses
    addSectionBanner('3. FARM OPERATIONS EXPENSES', COLORS.softAmberBg);
    let totalFarmBase = 0, totalFarmBE = 0, totalFarmPlan = 0, totalFarmActual = 0;

    const farmSalaryActual = getPettyCashSum(t => t.includes('farm') && (t.includes('salary') || t.includes('labour') || t.includes('wage')));
    const farmSalaryAdminActual = getPettyCashSum(t => t.includes('farm') && t.includes('admin'));
    const farmMaintenanceActual = getPettyCashSum(t => t.includes('farm') && (t.includes('maintenance') || t.includes('repair') || t.includes('fence') || t.includes('irrigation')));
    const farmTransportActual = getPettyCashSum(t => t.includes('farm') && (t.includes('transport') || t.includes('tractor') || t.includes('lorry')));
    const farmFertilizerActual = getPettyCashSum(t => t.includes('fertilizer') || t.includes('compost') || t.includes('manure') || t.includes('soil') || t.includes('seeds') || t.includes('plant'));
    const farmPettyCashActual = getPettyCashSum((t, pc) => pc.poolId === 'FARM' || (t.includes('farm') && !t.includes('salary') && !t.includes('admin') && !t.includes('maintenance') && !t.includes('transport') && !t.includes('fertilizer')));

    const farmItems = [
        ['Salary Farm', FARM_BASELINE_BUDGET.salaryFarm, farmSalaryActual],
        ['Salary Admin Farm', FARM_BASELINE_BUDGET.salaryAdminFarm, farmSalaryAdminActual],
        ['Maintenance Farm', FARM_BASELINE_BUDGET.maintenanceFarm, farmMaintenanceActual],
        ['Transport Farm', FARM_BASELINE_BUDGET.transportFarm, farmTransportActual],
        ['Fertilizer', FARM_BASELINE_BUDGET.fertilizer, farmFertilizerActual],
        ['PettyCash Farm', FARM_BASELINE_BUDGET.pettyCashFarm, farmPettyCashActual]
    ];

    farmItems.forEach(([name, base, act]) => {
        const res = addBeCostLine(name, base, act);
        totalFarmBase += res.baseMonthly;
        totalFarmBE += res.periodBE;
        totalFarmPlan += res.plannedTarget;
        totalFarmActual += res.actualRealized;
    });
    const farmExpVarPct = totalFarmBE > 0 ? `${(((totalFarmBE - totalFarmActual) / totalFarmBE) * 100).toFixed(0)}%` : '0%';
    addSummaryTotalRow('TOTAL FARM EXPENSES', totalFarmBase, totalFarmBE, totalFarmPlan, totalFarmActual, +(totalFarmBE - totalFarmActual).toFixed(2), farmExpVarPct);

    // 4. Farm Produce Revenue
    addSectionBanner('4. FARM PRODUCE REVENUE', COLORS.softBlueBg);
    let totalFarmRevBase = 0, totalFarmRevBE = 0, totalFarmRevPlan = 0, totalFarmRevActual = 0;

    let moringaHarvestActual = 0;
    let bananaHarvestActual = 0;
    let otherFarmHarvestActual = 0;

    farmHarvests.forEach(h => {
        (h.items || []).forEach(it => {
            const pName = (it.productName || it.productCode || '').toLowerCase();
            const lineVal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
            if (pName.includes('moringa')) {
                moringaHarvestActual += lineVal;
            } else if (pName.includes('banana')) {
                bananaHarvestActual += lineVal;
            } else {
                otherFarmHarvestActual += lineVal;
            }
        });
    });

    invoices.forEach(inv => {
        (inv.items || []).forEach(it => {
            const pName = (it.name || it.productName || '').toLowerCase();
            const lineVal = Number(it.lineTotal || it.total) || 0;
            if (pName.includes('moringa') && !pName.includes('powder')) {
                moringaHarvestActual += lineVal;
            } else if (pName.includes('banana')) {
                bananaHarvestActual += lineVal;
            }
        });
    });

    const farmRevItems = [
        ['Moringa Leaves', FARM_BASELINE_BUDGET.moringaLeaves, moringaHarvestActual],
        ['Banana Sales', FARM_BASELINE_BUDGET.bananaSales, bananaHarvestActual],
        ['Other Farm Items', FARM_BASELINE_BUDGET.otherFarmItems, otherFarmHarvestActual]
    ];

    farmRevItems.forEach(([name, base, act]) => {
        const res = addBeCostLine(name, base, act);
        totalFarmRevBase += res.baseMonthly;
        totalFarmRevBE += res.periodBE;
        totalFarmRevPlan += res.plannedTarget;
        totalFarmRevActual += res.actualRealized;
    });

    const farmRevVarPct = totalFarmRevBE > 0 ? `${(((totalFarmRevBE - totalFarmRevActual) / totalFarmRevBE) * 100).toFixed(0)}%` : '0%';
    addSummaryTotalRow('TOTAL FARM REVENUE', totalFarmRevBase, totalFarmRevBE, totalFarmRevPlan, totalFarmRevActual, +(totalFarmRevBE - totalFarmRevActual).toFixed(2), farmRevVarPct);

    const farmNetProfit = +(totalFarmRevActual - totalFarmActual).toFixed(2);
    const farmNetBE = +(totalFarmRevBE - totalFarmBE).toFixed(2);
    const farmNetDiff = +(farmNetBE - farmNetProfit).toFixed(2);
    const farmNetPct = farmNetBE !== 0 ? `${((farmNetDiff / Math.abs(farmNetBE)) * 100).toFixed(0)}%` : '0%';

    const farmNetRow = beSheet.addRow([
        'Farm Net Profit / (Loss)',
        0,
        farmNetBE,
        +(totalFarmRevPlan - totalFarmPlan).toFixed(2),
        farmNetProfit,
        farmNetDiff,
        farmNetPct
    ]);
    styleBeDataRow(farmNetRow);
    farmNetRow.height = 22;
    farmNetRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: farmNetProfit >= 0 ? COLORS.forestGreen : 'FF64748B' } };
    });

    // 5. Consolidated Summary (DHY + Farm)
    addSectionBanner('5. CONSOLIDATED SUMMARY (DHY + FARM)', COLORS.darkEmerald, 'FFFFFFFF');
    const totalCombinedCosts = +(totalDhyActual + totalFarmActual).toFixed(2);
    const totalCombinedCostsBE = +(totalDhyBE + totalFarmBE).toFixed(2);
    const totalCombinedRevenue = +(realizedSales + totalFarmRevActual).toFixed(2);
    const totalCombinedRevenueBE = +(revRes.periodBE + totalFarmRevBE).toFixed(2);
    const consolidatedNetProfit = +(totalCombinedRevenue - totalCombinedCosts).toFixed(2);
    const consolidatedNetMargin = totalCombinedRevenue > 0 ? `${((consolidatedNetProfit / totalCombinedRevenue) * 100).toFixed(1)}%` : '0%';

    const c1 = beSheet.addRow(['Total Combined Costs', '', totalCombinedCostsBE, '', totalCombinedCosts, +(totalCombinedCostsBE - totalCombinedCosts).toFixed(2)]);
    styleBeDataRow(c1);
    const c2 = beSheet.addRow(['Total Combined Revenue', '', totalCombinedRevenueBE, '', totalCombinedRevenue, +(totalCombinedRevenueBE - totalCombinedRevenue).toFixed(2)]);
    styleBeDataRow(c2);
    const c3 = beSheet.addRow(['Consolidated Net Operating Profit / (Loss)', '', +(totalCombinedRevenueBE - totalCombinedCostsBE).toFixed(2), '', consolidatedNetProfit, +(totalCombinedCostsBE - totalCombinedCosts).toFixed(2)]);
    styleBeDataRow(c3);
    c3.font = { name: 'Calibri', bold: true, size: 11 };
    c3.getCell(5).font = { name: 'Calibri', bold: true, size: 12, color: { argb: consolidatedNetProfit >= 0 ? COLORS.forestGreen : 'FFDC2626' } };

    const c4 = beSheet.addRow(['Net Operating Margin %', '', '', '', consolidatedNetMargin]);
    styleBeDataRow(c4, false);
    c4.font = { name: 'Calibri', bold: true, size: 11, color: { argb: COLORS.darkEmerald } };
    c4.getCell(5).font = { name: 'Calibri', bold: true, size: 12, color: { argb: COLORS.darkEmerald } };

    beSheet.columns = [
        { width: 35 },
        { width: 22 },
        { width: 22 },
        { width: 20 },
        { width: 20 },
        { width: 20 },
        { width: 15 }
    ];

    // =========================================================================
    // SHEET 2: Executive Overview (Navy / Slate Theme)
    // =========================================================================
    const execSheet = workbook.addWorksheet('Executive Overview', {
        properties: { tabColor: { argb: COLORS.navySlate } },
        views: [{ showGridLines: true }]
    });

    const er1 = execSheet.getRow(1);
    er1.height = 24;
    execSheet.mergeCells('A1:E1');
    const execTitle = execSheet.getCell('A1');
    execTitle.value = `Export Lanka (Pvt) Ltd - Enterprise Master Report (${startDate} to ${endDate})`;
    execTitle.font = { name: 'Calibri', size: 15, bold: true, color: { argb: COLORS.darkEmerald } };
    execTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    execSheet.addRow([]); // Blank row 2

    const execHeaderRow = execSheet.addRow([
        'Department / Module',
        'Performance Metric',
        'Realized Value',
        'Unit',
        'Status / Audit Notes'
    ]);
    styleHeaderRow(execHeaderRow, COLORS.navySlate);

    const execMetrics = [
        ['Commercial Sales', 'Total Invoiced Value', totalInvoicedValue, 'LKR', 'Gross commercial invoices'],
        ['Commercial Sales', 'Collected Revenue (Paid)', paidSalesRevenue, 'LKR', 'Realized bank inflows'],
        ['Commercial Sales', 'Total Invoice Count', invoiceCount, 'Invoices', 'Transaction volume'],
        ['Inventory & Stock', 'Total Inventory Valuation', totalInventoryValuation, 'LKR', 'Current warehouse valuation'],
        ['Inventory & Stock', 'Total Active Products', allProducts.length, 'SKUs', 'Catalog active count'],
        ['Manufacturing & Plant', 'Total Raw Material Ingested', totalRawMaterialIngested, 'kg', 'Fresh produce processed'],
        ['Manufacturing & Plant', 'Total Finished Dry Output', totalFinishedDryOutput, 'kg', 'Export grade product yield'],
        ['Manufacturing & Plant', 'Batches Processed Count', batches.length, 'Batches', 'Completed production orders'],
        ['Returns & Damages', 'Total Damaged / Returned Value', totalLostValue, 'LKR', 'Damages & customer returns'],
        ['Finance & Costing', 'Operating Cost (Daily P&L)', sumPnlExpenses, 'LKR', 'Operating production expenses'],
        ['Finance & Costing', 'Net Operating Profit Margin', netOperatingProfit, 'LKR', 'Operating surplus/(deficit)']
    ];

    execMetrics.forEach(metric => {
        const row = execSheet.addRow(metric);
        row.height = 22;
        applyBorders(row);
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };

        if (metric[3] === 'LKR') {
            row.getCell(3).numFmt = LKR_NUM_FMT;
            row.getCell(3).font = { name: 'Calibri', bold: true, color: { argb: COLORS.darkEmerald } };
        } else if (typeof metric[2] === 'number') {
            row.getCell(3).numFmt = QTY_NUM_FMT;
        }
    });

    execSheet.columns = [
        { width: 25 },
        { width: 35 },
        { width: 22 },
        { width: 15 },
        { width: 35 }
    ];

    // =========================================================================
    // SHEET 3: Sales Invoices (Royal Blue Theme)
    // =========================================================================
    const salesSheet = workbook.addWorksheet('Sales Invoices', {
        properties: { tabColor: { argb: COLORS.royalBlue } },
        views: [{ showGridLines: true }]
    });

    const salesHeader = salesSheet.addRow(['Date', 'Invoice No', 'Customer', 'Payment Status', 'Grand Total']);
    styleHeaderRow(salesHeader, COLORS.royalBlue);

    if (invoices.length === 0) {
        const emptyRow = salesSheet.addRow(['No invoices found for selected period', '—', '—', '—', 0]);
        emptyRow.height = 20;
        applyBorders(emptyRow);
        emptyRow.getCell(5).numFmt = LKR_NUM_FMT;
    } else {
        invoices.forEach((inv, idx) => {
            const customerName = inv.customerId?.displayName || inv.customerId?.name || inv.customerName || 'Customer';
            const invDate = inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().slice(0, 10) : '—';
            const row = salesSheet.addRow([
                invDate,
                inv.invoiceNumber || 'INV-0',
                customerName,
                inv.paymentStatus || 'pending',
                Number(inv.grandTotal) || 0
            ]);
            row.height = 20;
            applyBorders(row);
            if (idx % 2 === 1) {
                row.eachCell({ includeEmpty: true }, (c) => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraLight } });
            }
            row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
            row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
            row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
            row.getCell(5).numFmt = LKR_NUM_FMT;
        });
    }

    salesSheet.columns = [
        { width: 15 },
        { width: 18 },
        { width: 28 },
        { width: 16 },
        { width: 20 }
    ];

    // =========================================================================
    // SHEET 4: Inventory Valuation (Vibrant Emerald Theme)
    // =========================================================================
    const invSheet = workbook.addWorksheet('Inventory Valuation', {
        properties: { tabColor: { argb: COLORS.vibrantGreen } },
        views: [{ showGridLines: true }]
    });

    const invHeader = invSheet.addRow([
        'Product Name',
        'SKU Code',
        'Category',
        'Unit Price',
        'Current Stock',
        'Valuation (LKR)',
        'Reorder Status'
    ]);
    styleHeaderRow(invHeader, COLORS.vibrantGreen);

    inventoryValuationRows.forEach((item, idx) => {
        const row = invSheet.addRow([
            item.name,
            item.sku,
            item.category,
            item.unitPrice,
            item.currentStock,
            item.valuation,
            item.reorderStatus
        ]);
        row.height = 20;
        applyBorders(row);
        if (idx % 2 === 1) {
            row.eachCell({ includeEmpty: true }, (c) => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraLight } });
        }
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
        row.getCell(4).numFmt = LKR_NUM_FMT;
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
        row.getCell(5).numFmt = QTY_NUM_FMT;
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
        row.getCell(6).numFmt = LKR_NUM_FMT;
        row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

        if (item.reorderStatus === 'Out of Stock') {
            row.getCell(7).font = { name: 'Calibri', color: { argb: 'FFDC2626' }, bold: true };
        } else if (item.reorderStatus === 'Low Stock') {
            row.getCell(7).font = { name: 'Calibri', color: { argb: 'FFD97706' }, bold: true };
        } else {
            row.getCell(7).font = { name: 'Calibri', color: { argb: 'FF16A34A' } };
        }
    });

    invSheet.columns = [
        { width: 30 },
        { width: 18 },
        { width: 22 },
        { width: 16 },
        { width: 16 },
        { width: 20 },
        { width: 16 }
    ];

    // =========================================================================
    // SHEET 5: Production & Yield (Purple / Violet Theme)
    // =========================================================================
    const prodSheet = workbook.addWorksheet('Production & Yield', {
        properties: { tabColor: { argb: COLORS.purpleViolet } },
        views: [{ showGridLines: true }]
    });

    const prodHeader = prodSheet.addRow([
        'Date',
        'Batch No',
        'Product',
        'Input Weight (kg)',
        'Output Weight (kg)',
        'Wastage (kg)',
        'Efficiency %'
    ]);
    styleHeaderRow(prodHeader, COLORS.purpleViolet);

    if (batches.length === 0) {
        const emptyRow = prodSheet.addRow(['No production batches recorded in this period', '—', '—', 0, 0, 0, 0]);
        emptyRow.height = 20;
        applyBorders(emptyRow);
    } else {
        let sumInput = 0, sumOutput = 0, sumWastage = 0;

        batches.forEach((b, idx) => {
            const bDate = b.date ? new Date(b.date).toISOString().slice(0, 10) : '—';
            const inKg = Number(b.inputWeight_total) || 0;
            const outKg = Number(b.outputWeight_total) || 0;
            const wasteKg = Math.max(0, inKg - outKg);
            const eff = inKg > 0 ? (outKg / inKg) : (b.efficiencyPercentage ? b.efficiencyPercentage / 100 : 0);

            sumInput += inKg;
            sumOutput += outKg;
            sumWastage += wasteKg;

            const row = prodSheet.addRow([
                bDate,
                b.batchNo || 'ALE-BATCH',
                b.product || 'Produce',
                inKg,
                outKg,
                wasteKg,
                eff
            ]);
            row.height = 20;
            applyBorders(row);
            if (idx % 2 === 1) {
                row.eachCell({ includeEmpty: true }, (c) => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraLight } });
            }
            row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
            row.getCell(3).alignment = { vertical: 'middle', horizontal: 'left' };
            row.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };
            row.getCell(4).numFmt = QTY_NUM_FMT;
            row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
            row.getCell(5).numFmt = QTY_NUM_FMT;
            row.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
            row.getCell(6).numFmt = QTY_NUM_FMT;
            row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell(7).numFmt = PCT_NUM_FMT;
        });

        // Summary row at bottom
        const totalEff = sumInput > 0 ? (sumOutput / sumInput) : 0;
        const totalRow = prodSheet.addRow([
            endDate,
            'Total',
            'Produce',
            sumInput,
            sumOutput,
            sumWastage,
            totalEff
        ]);
        totalRow.height = 24;
        totalRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF6D28D9' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.softPurpleBg } };
        });
        applyBorders(totalRow);
        totalRow.getCell(4).numFmt = QTY_NUM_FMT;
        totalRow.getCell(5).numFmt = QTY_NUM_FMT;
        totalRow.getCell(6).numFmt = QTY_NUM_FMT;
        totalRow.getCell(7).numFmt = PCT_NUM_FMT;
    }

    prodSheet.columns = [
        { width: 15 },
        { width: 20 },
        { width: 25 },
        { width: 18 },
        { width: 18 },
        { width: 16 },
        { width: 16 }
    ];

    // =========================================================================
    // SHEET 6: Daily P&L Ledger (Deep Teal Theme)
    // =========================================================================
    const pnlSheet = workbook.addWorksheet('Daily P&L Ledger', {
        properties: { tabColor: { argb: COLORS.deepTeal } },
        views: [{ showGridLines: true }]
    });

    const pnlHeader = pnlSheet.addRow([
        'Date',
        'Revenue',
        'Raw Material',
        'Labour',
        'Electricity',
        'Firewood',
        'Packing',
        'Transport',
        'Total Expenses',
        'Net Profit'
    ]);
    styleHeaderRow(pnlHeader, COLORS.deepTeal);

    if (dailyPnls.length === 0) {
        // Build dynamic daily aggregates from invoices and petty cash expenses
        const dailyAggMap = new Map();

        invoices.forEach(inv => {
            const dateStr = inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().slice(0, 10) : startDate;
            const cur = dailyAggMap.get(dateStr) || { revenue: 0, rawMaterial: 0, labour: 0, electricity: 0, firewood: 0, packing: 0, transport: 0, totalExpenses: 0 };
            cur.revenue += (Number(inv.grandTotal) || 0);
            dailyAggMap.set(dateStr, cur);
        });

        pettyCashRecords.forEach(pc => {
            if (pc.transactionType === 'expense' || !pc.transactionType) {
                const dateStr = pc.date ? new Date(pc.date).toISOString().slice(0, 10) : startDate;
                const cur = dailyAggMap.get(dateStr) || { revenue: 0, rawMaterial: 0, labour: 0, electricity: 0, firewood: 0, packing: 0, transport: 0, totalExpenses: 0 };
                const amt = Number(pc.amount) || 0;
                cur.rawMaterial += (Number(pc.rawMaterial_cost) || 0);
                cur.labour += (Number(pc.miscWages) || 0);
                cur.firewood += (Number(pc.wood) || 0);
                cur.packing += (Number(pc.packingMaterials) || 0);
                cur.transport += (Number(pc.transport) || 0);
                cur.totalExpenses += amt;
                dailyAggMap.set(dateStr, cur);
            }
        });

        const sortedDates = Array.from(dailyAggMap.keys()).sort();

        if (sortedDates.length === 0) {
            const emptyRow = pnlSheet.addRow([
                startDate,
                0, 0, 0, 0, 0, 0, 0, 0, 0
            ]);
            emptyRow.height = 20;
            applyBorders(emptyRow);
            for (let col = 2; col <= 10; col++) {
                emptyRow.getCell(col).numFmt = LKR_NUM_FMT;
                emptyRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'right' };
            }
        } else {
            sortedDates.forEach((dStr, idx) => {
                const agg = dailyAggMap.get(dStr);
                const netProf = agg.revenue - agg.totalExpenses;
                const row = pnlSheet.addRow([
                    dStr,
                    agg.revenue,
                    agg.rawMaterial,
                    agg.labour,
                    agg.electricity,
                    agg.firewood,
                    agg.packing,
                    agg.transport,
                    agg.totalExpenses,
                    netProf
                ]);
                row.height = 20;
                applyBorders(row);
                if (idx % 2 === 1) {
                    row.eachCell({ includeEmpty: true }, (c) => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraLight } });
                }
                row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
                for (let col = 2; col <= 10; col++) {
                    row.getCell(col).alignment = { vertical: 'middle', horizontal: 'right' };
                    row.getCell(col).numFmt = LKR_NUM_FMT;
                }
                row.getCell(10).font = { name: 'Calibri', bold: true, color: { argb: netProf >= 0 ? COLORS.deepTeal : 'FFDC2626' } };
            });
        }
    } else {
        dailyPnls.forEach((p, idx) => {
            const pDate = p.date ? new Date(p.date).toISOString().slice(0, 10) : '—';
            const row = pnlSheet.addRow([
                pDate,
                Number(p.totalRevenue) || 0,
                Number(p.rawMaterial) || 0,
                Number(p.labourSalary) || 0,
                Number(p.electricity) || 0,
                Number(p.firewood) || 0,
                Number(p.packing) || 0,
                Number(p.transport) || 0,
                Number(p.totalExpenses) || 0,
                Number(p.netProfit) || 0
            ]);
            row.height = 20;
            applyBorders(row);
            if (idx % 2 === 1) {
                row.eachCell({ includeEmpty: true }, (c) => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.zebraLight } });
            }
            row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
            for (let col = 2; col <= 10; col++) {
                row.getCell(col).alignment = { vertical: 'middle', horizontal: 'right' };
                row.getCell(col).numFmt = LKR_NUM_FMT;
            }
            row.getCell(10).font = { name: 'Calibri', bold: true, color: { argb: (Number(p.netProfit) || 0) >= 0 ? COLORS.deepTeal : 'FFDC2626' } };
        });
    }

    pnlSheet.columns = [
        { width: 14 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 20 },
        { width: 20 }
    ];

    // ── Send Response ──
    const filename = `Export-Lanka-Master-Report-${startDate}_to_${endDate}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    return res.send(buffer);
});
