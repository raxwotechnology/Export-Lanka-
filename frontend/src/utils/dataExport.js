import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Format primitive value for export
 */
const formatCellValue = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') return val;
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    if (typeof val === 'object') {
        if (val.displayName) return val.displayName;
        if (val.name) return val.name;
        if (val.code || val.productCode || val.customerCode) return val.code || val.productCode || val.customerCode;
        return JSON.stringify(val);
    }
    return String(val);
};

/**
 * Export data to CSV
 * @param {Array} data - Array of objects
 * @param {string} fileName - File name with extension
 */
export const exportToCSV = (data, fileName = 'export.csv') => {
    if (!data || !data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));
    
    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const raw = formatCellValue(row[header]);
            const escaped = ('' + raw).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

/**
 * Export data to Excel (.xlsx) with column width auto-calculation and formatting
 * @param {Array} data - Array of objects or records
 * @param {string} fileName - Target file name without extension
 * @param {string} sheetName - Excel sheet tab name
 * @param {Array} columns - Optional array of column definitions: [{ header/label, dataKey/key, format }]
 */
export const exportToExcel = (data, fileName = 'report_export', sheetName = 'Report Data', columns = null) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('exportToExcel: No data to export');
        return;
    }

    let rowsToExport;

    if (columns && Array.isArray(columns) && columns.length > 0) {
        // Map data using specified columns
        rowsToExport = data.map((item, idx) => {
            const rowObj = {};
            columns.forEach(col => {
                const headerTitle = col.header || col.label || col.key || col.dataKey || 'Field';
                let val;

                if (typeof col.dataKey === 'function') {
                    val = col.dataKey(item, idx);
                } else if (typeof col.renderValue === 'function') {
                    val = col.renderValue(item, idx);
                } else if (col.dataKey && item[col.dataKey] !== undefined) {
                    val = item[col.dataKey];
                } else if (col.key && item[col.key] !== undefined) {
                    val = item[col.key];
                } else {
                    val = '';
                }

                if (typeof col.format === 'function') {
                    val = col.format(val, item, idx);
                }

                rowObj[headerTitle] = formatCellValue(val);
            });
            return rowObj;
        });
    } else {
        // Fallback: direct object mapping with safe primitives
        rowsToExport = data.map(item => {
            const rowObj = {};
            Object.keys(item).forEach(key => {
                if (key === '__v' || key === 'deletedAt') return;
                rowObj[key] = formatCellValue(item[key]);
            });
            return rowObj;
        });
    }

    const worksheet = XLSX.utils.json_to_sheet(rowsToExport);

    // Auto-compute column widths
    const colWidths = [];
    if (rowsToExport.length > 0) {
        const headers = Object.keys(rowsToExport[0]);
        headers.forEach((hdr, colIndex) => {
            let maxLen = String(hdr).length;
            for (let r = 0; r < Math.min(rowsToExport.length, 100); r++) {
                const cellVal = String(rowsToExport[r][hdr] ?? '');
                if (cellVal.length > maxLen) {
                    maxLen = cellVal.length;
                }
            }
            colWidths[colIndex] = { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
        });
        worksheet['!cols'] = colWidths;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31)); // Excel limits sheet title to 31 chars

    const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, '_');
    XLSX.writeFile(workbook, safeFileName.endsWith('.xlsx') ? safeFileName : `${safeFileName}.xlsx`);
};

/**
 * Export data to PDF with professional corporate layout
 * @param {string} title - Report title
 * @param {Array} columns - Column definitions: [{ header/label, dataKey/key, halign, format }]
 * @param {Array} data - Data rows
 * @param {string} fileName - Target file name
 * @param {Object} metadata - Optional company & report metadata
 */
export const exportToPDF = (title, columns, data, fileName = 'report', metadata = {}) => {
    if (!columns || !columns.length) {
        console.warn('exportToPDF: No columns specified');
        return;
    }

    const isLandscape = metadata.orientation === 'landscape' || (columns.length > 6 && metadata.orientation !== 'portrait');

    const doc = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // 1. Header Banner (Deep Emerald Corporate ERP Theme)
    doc.setFillColor(6, 78, 59); // Emerald 800
    doc.rect(0, 0, pageWidth, 36, 'F');

    // Accent line below header
    doc.setFillColor(16, 185, 129); // Emerald 500
    doc.rect(0, 36, pageWidth, 2, 'F');

    // Company Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const compName = (metadata.companyName || 'EXPORT LANKA (PVT) LTD').toUpperCase();
    doc.text(compName, 14, 15);

    // Company Tagline
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(209, 250, 229); // Emerald 100
    const tagline = metadata.companyTagline || 'Enterprise Resource Planning & Production Operations System';
    doc.text(tagline, 14, 22);

    // Contact info
    const contactParts = [
        metadata.companyAddress,
        metadata.companyPhone ? `Tel: ${metadata.companyPhone}` : '',
        metadata.companyEmail ? `Email: ${metadata.companyEmail}` : ''
    ].filter(Boolean);
    if (contactParts.length > 0) {
        doc.setFontSize(7.5);
        doc.setTextColor(167, 243, 208); // Emerald 200
        doc.text(contactParts.join('  |  '), 14, 28);
    }

    // Right-aligned report header details
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), pageWidth - 14, 15, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(209, 250, 229);
    const dateRangeStr = metadata.period || metadata.dateRange ? `Period: ${metadata.period || metadata.dateRange}` : null;
    let rightY = 22;
    if (dateRangeStr) {
        doc.text(dateRangeStr, pageWidth - 14, rightY, { align: 'right' });
        rightY += 5;
    }
    const genDateStr = `Generated: ${new Date().toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    doc.text(genDateStr, pageWidth - 14, rightY, { align: 'right' });

    if (metadata.userName) {
        rightY += 5;
        doc.text(`By: ${metadata.userName}${metadata.userRole ? ` (${metadata.userRole})` : ''}`, pageWidth - 14, rightY, { align: 'right' });
    }

    let startTableY = 44;

    // 2. Summary KPI Metric Cards (if provided)
    if (metadata.summaryCards && Array.isArray(metadata.summaryCards) && metadata.summaryCards.length > 0) {
        const cards = metadata.summaryCards.slice(0, 5); // at most 5
        const availableW = pageWidth - 28;
        const cardW = (availableW - (cards.length - 1) * 4) / cards.length;
        const cardH = 14;

        cards.forEach((card, idx) => {
            const cardX = 14 + idx * (cardW + 4);
            // Draw box
            doc.setFillColor(241, 245, 249); // slate-100
            doc.setDrawColor(203, 213, 225); // slate-300
            doc.roundedRect(cardX, startTableY, cardW, cardH, 1.5, 1.5, 'FD');

            // Label
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text(String(card.label || '').toUpperCase(), cardX + 3, startTableY + 4.5);

            // Value
            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text(String(card.value || '—'), cardX + 3, startTableY + 10.5);
        });

        startTableY += cardH + 6;
    }

    // 3. Table Headers and Body
    const headers = columns.map(c => c.header || c.label || c.key || '');
    const bodyRows = (data || []).map((item, idx) => {
        return columns.map(col => {
            let val;
            if (typeof col.dataKey === 'function') {
                val = col.dataKey(item, idx);
            } else if (typeof col.renderValue === 'function') {
                val = col.renderValue(item, idx);
            } else if (col.dataKey && item[col.dataKey] !== undefined) {
                val = item[col.dataKey];
            } else if (col.key && item[col.key] !== undefined) {
                val = item[col.key];
            } else {
                val = '';
            }

            if (typeof col.format === 'function') {
                val = col.format(val, item, idx);
            }

            if (val === null || val === undefined) return '—';
            if (typeof val === 'number') {
                return val.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            }
            if (typeof val === 'object') {
                if (val.displayName) return val.displayName;
                if (val.name) return val.name;
                if (val.code) return val.code;
                return JSON.stringify(val);
            }
            return String(val);
        });
    });

    // Column styles for alignment
    const colStyles = {};
    columns.forEach((col, idx) => {
        if (col.halign) {
            colStyles[idx] = { halign: col.halign };
        } else if (col.align === 'right' || col.isNumeric) {
            colStyles[idx] = { halign: 'right' };
        }
    });

    autoTable(doc, {
        startY: startTableY,
        head: [headers],
        body: bodyRows.length > 0 ? bodyRows : [columns.map(() => 'No records found')],
        theme: 'striped',
        headStyles: {
            fillColor: [15, 23, 42], // slate-900
            textColor: [255, 255, 255],
            fontSize: 8.5,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 2.5
        },
        styles: {
            fontSize: 8,
            cellPadding: 2.5,
            valign: 'middle',
            textColor: [30, 41, 59], // slate-800
            lineColor: [226, 232, 240], // slate-200
            lineWidth: 0.1
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // slate-50
        },
        columnStyles: colStyles,
        margin: { left: 14, right: 14, bottom: 15 },
        didDrawPage: (pageData) => {
            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            const currentPage = pageData.pageNumber;
            const str = `Page ${currentPage} of ${pageCount}`;

            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184); // slate-400

            doc.text(
                'Confidential • System Generated Report • Export Lanka (Pvt) Ltd ERP',
                14,
                pageHeight - 8
            );
            doc.text(str, pageWidth - 14, pageHeight - 8, { align: 'right' });
        }
    });

    const safeFileName = fileName.replace(/[/\\?%*:|"<>]/g, '_');
    doc.save(safeFileName.endsWith('.pdf') ? safeFileName : `${safeFileName}.pdf`);
};
