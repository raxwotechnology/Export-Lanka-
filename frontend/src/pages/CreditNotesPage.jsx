import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, FileText } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { useCreditNotes } from '../features/returns/useReturns';

export default function CreditNotesPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({ status: '', page: 1, limit: 15 });
    const { data, isLoading } = useCreditNotes(filters);
    const notes = data?.data || [];
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    const columns = [
        { key: 'creditNoteNumber', label: 'CN #', render: (r) => <span className="font-mono text-xs">{r.creditNoteNumber}</span> },
        { key: 'issueDate', label: 'Date', render: (r) => fmtDate(r.issueDate) },
        { key: 'customer', label: 'Customer', render: (r) => r.customerSnapshot?.name },
        { key: 'reason', label: 'Reason', render: (r) => r.reason.replace(/_/g, ' ') },
        { key: 'amount', label: 'Amount', render: (r) => fmt(r.amount) },
        { key: 'remainingAmount', label: 'Remaining', render: (r) => fmt(r.remainingAmount) },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'fully_applied' ? 'success' : 'info'}>{r.status.replace(/_/g, ' ')}</Badge> },
        {
            key: 'actions', label: '', width: '50px', render: (r) => (
                <button onClick={() => navigate(`/credit-notes/${r._id}`)} className="p-1.5 hover:bg-gray-100 rounded"><Eye size={16} /></button>
            )
        },
    ];

    return (
        <div>
            <PageHeader title="Credit Notes" description="Credit issued to customers, typically from returns" />
            <Card>
                {isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div>
                    : notes.length === 0 ? <EmptyState icon={FileText} title="No credit notes" description="Credit notes are issued from processed returns" />
                        : <>
                            <Table columns={columns} data={notes} onRowClick={(r) => navigate(`/credit-notes/${r._id}`)} />
                            <Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0}
                                onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                        </>}
            </Card>
        </div>
    );
}