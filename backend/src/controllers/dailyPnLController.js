import DailyPnL from '../models/DailyPnL.js';
import excelService from '../services/excelService.js';

export const getPnLRecords = async (req, res) => {
    try {
        const records = await DailyPnL.find().sort({ date: -1 });
        res.json({ success: true, data: records });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPnLRecord = async (req, res) => {
    try {
        const { date, ...expenses } = req.body;
        
        // Calculate totals
        const totalExpenses = Object.values(expenses).reduce((acc, v) => acc + (Number(v) || 0), 0) - (Number(expenses.totalRevenue) || 0);
        // Wait, totalExpenses should only include expense fields. 
        // Let's be more explicit.
        const expenseFields = ['rawMaterial', 'labourSalary', 'supervisorQC', 'electricity', 'firewood', 'packing', 'transport', 'communication', 'other'];
        const totalExp = expenseFields.reduce((acc, field) => acc + (Number(req.body[field]) || 0), 0);
        const revenue = Number(req.body.totalRevenue) || 0;
        const netProfit = revenue - totalExp;

        const record = await DailyPnL.create({
            ...req.body,
            totalExpenses: totalExp,
            netProfit: netProfit,
            createdBy: req.user._id
        });

        // Sync to Excel
        await excelService.updateExcelRow('pnl', record);

        res.status(201).json({ success: true, data: record });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePnLRecord = async (req, res) => {
    try {
        const expenseFields = ['rawMaterial', 'labourSalary', 'supervisorQC', 'electricity', 'firewood', 'packing', 'transport', 'communication', 'other'];
        const totalExp = expenseFields.reduce((acc, field) => acc + (Number(req.body[field]) || 0), 0);
        const revenue = Number(req.body.totalRevenue) || 0;
        const netProfit = revenue - totalExp;

        const record = await DailyPnL.findByIdAndUpdate(
            req.params.id,
            { ...req.body, totalExpenses: totalExp, netProfit: netProfit },
            { new: true }
        );

        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

        // Sync to Excel
        await excelService.updateExcelRow('pnl', record);

        res.json({ success: true, data: record });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deletePnLRecord = async (req, res) => {
    try {
        const record = await DailyPnL.findByIdAndDelete(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

        // Sync to Excel (Delete row)
        await excelService.deleteExcelRow('pnl', record);

        res.json({ success: true, message: 'Record deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
