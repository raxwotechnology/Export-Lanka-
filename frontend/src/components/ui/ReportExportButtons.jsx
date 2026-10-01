import { FileSpreadsheet, FileText, ArrowLeft, RefreshCw } from 'lucide-react';
import Button from './Button';
import { useNavigate } from 'react-router-dom';

export default function ReportExportButtons({
    onExportExcel,
    onExportPDF,
    onRefresh,
    onBack,
    disabled = false,
    loading = false,
    showBack = true,
    excelLabel = 'Excel (.xlsx)',
    pdfLabel = 'PDF Document',
    className = ''
}) {
    const navigate = useNavigate();

    const handleBack = onBack || (() => navigate('/reports'));

    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            {onRefresh && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={loading}
                    title="Refresh report data"
                    className="border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                    <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            )}

            {onExportExcel && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onExportExcel}
                    disabled={disabled || loading}
                    title="Download Microsoft Excel spreadsheet (.xlsx)"
                    className="border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/70 hover:text-emerald-800 font-medium shadow-sm transition-all"
                >
                    <FileSpreadsheet size={15} className="mr-1.5 text-emerald-600" />
                    {excelLabel}
                </Button>
            )}

            {onExportPDF && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onExportPDF}
                    disabled={disabled || loading}
                    title="Download styled PDF report"
                    className="border-rose-300 text-rose-700 bg-rose-50/50 hover:bg-rose-100/70 hover:text-rose-800 font-medium shadow-sm transition-all"
                >
                    <FileText size={15} className="mr-1.5 text-rose-600" />
                    {pdfLabel}
                </Button>
            )}

            {showBack && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    title="Back to Reports Hub"
                    className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                    <ArrowLeft size={14} className="mr-1.5" />
                    Back
                </Button>
            )}
        </div>
    );
}
