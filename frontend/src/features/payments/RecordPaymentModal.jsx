import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Receipt, CheckCircle, CreditCard } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { useCreatePayment } from './usePayments';
import api from '../../api/axios';

const fmt = (n) =>
    new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2,
    }).format(n || 0);

export default function RecordPaymentModal({ isOpen, onClose, invoice }) {
    const [paymentType, setPaymentType] = useState('partial'); // 'full' or 'partial'
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [bankAccountId, setBankAccountId] = useState('');
    const [chequeNumber, setChequeNumber] = useState('');
    const [chequeDate, setChequeDate] = useState('');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');

    const createMutation = useCreatePayment();

    const balanceDue = Number(invoice?.balanceDue || 0);
    const totalAmount = Number(invoice?.grandTotal || 0);
    const amountPaid = Number(invoice?.amountPaid || 0);

    const { data: bankAccountsData } = useQuery({
        queryKey: ['bankAccounts'],
        queryFn: async () => {
            const { data } = await api.get('/finance/bank-accounts');
            return data.data || [];
        },
        enabled: isOpen && (method === 'bank_transfer' || method === 'cheque'),
    });

    const bankAccountOptions = [
        { value: '', label: 'Select bank account...' },
        ...(bankAccountsData || []).map((b) => ({
            value: b._id,
            label: `${b.bankName} - ${b.accountNumber} (${b.accountName})`,
        })),
    ];

    useEffect(() => {
        if (isOpen && invoice) {
            setPaymentDate(new Date().toISOString().split('T')[0]);
            setMethod('cash');
            setBankAccountId('');
            setChequeNumber('');
            setChequeDate('');
            setReference('');
            setNotes('');
            // Default to full balance due or partial
            setPaymentType('partial');
            setAmount(balanceDue.toString());
        }
    }, [isOpen, invoice, balanceDue]);

    const handleTypeChange = (type) => {
        setPaymentType(type);
        if (type === 'full') {
            setAmount(balanceDue.toString());
        }
    };

    const numAmount = parseFloat(amount) || 0;
    const remainingBalance = Math.max(0, balanceDue - numAmount);
    const isOverpaying = numAmount > balanceDue;
    const isZeroOrNegative = numAmount <= 0;
    const isFullPayment = numAmount >= balanceDue;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isZeroOrNegative || isOverpaying || !invoice) return;

        const customerId = invoice.customerId?._id || invoice.customerId;

        const payload = {
            direction: 'received',
            customerId,
            amount: numAmount,
            paymentDate,
            method,
            bankAccountId: (method === 'bank_transfer' || method === 'cheque') ? (bankAccountId || undefined) : undefined,
            chequeNumber: method === 'cheque' ? (chequeNumber || undefined) : undefined,
            chequeDate: method === 'cheque' ? (chequeDate || undefined) : undefined,
            transactionReference: reference || undefined,
            notes: notes || undefined,
            allocations: [
                {
                    documentType: 'invoice',
                    documentId: invoice._id,
                    documentNumber: invoice.invoiceNumber,
                    amount: numAmount,
                },
            ],
        };

        try {
            await createMutation.mutateAsync(payload);
            onClose();
        } catch { }
    };

    if (!invoice) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Record Payment — ${invoice.invoiceNumber}`}
            size="md"
        >
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    
                    {/* Invoice Info Summary Banner */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Customer</span>
                            <span className="font-semibold text-gray-900">
                                {invoice.customerSnapshot?.name || 'Customer'}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-gray-200">
                            <div>
                                <p className="text-[11px] text-gray-500">Total Invoice</p>
                                <p className="text-xs font-bold text-gray-800">{fmt(totalAmount)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-500">Paid So Far</p>
                                <p className="text-xs font-bold text-emerald-600">{fmt(amountPaid)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-gray-500">Balance Due</p>
                                <p className="text-xs font-bold text-red-600">{fmt(balanceDue)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Mode Selection (Partial vs Full) */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 uppercase mb-1.5">
                            Payment Option
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('partial')}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                    paymentType === 'partial'
                                        ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                    <Receipt size={14} className="text-primary-600" />
                                    Partial Payment
                                </p>
                                <p className="text-[11px] text-gray-500 mt-0.5">Pay a portion of the balance</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleTypeChange('full')}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                    paymentType === 'full'
                                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                    <CheckCircle size={14} className="text-emerald-600" />
                                    Full Settle
                                </p>
                                <p className="text-[11px] text-emerald-700 font-medium mt-0.5">{fmt(balanceDue)}</p>
                            </button>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <Input
                            label="Payment Amount to Apply (LKR)"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={balanceDue}
                            required
                            value={amount}
                            onChange={(e) => {
                                setAmount(e.target.value);
                                if (parseFloat(e.target.value) === balanceDue) {
                                    setPaymentType('full');
                                } else {
                                    setPaymentType('partial');
                                }
                            }}
                            placeholder="Enter amount..."
                        />
                        {isOverpaying && (
                            <p className="text-xs text-red-600 mt-1">
                                Amount cannot exceed outstanding balance of {fmt(balanceDue)}.
                            </p>
                        )}
                        
                        {/* Live Remaining Balance Calculation */}
                        {!isOverpaying && numAmount > 0 && (
                            <div className="mt-2 p-2.5 rounded-lg bg-gray-50 border flex items-center justify-between text-xs">
                                <span className="text-gray-600">Remaining Balance after this:</span>
                                <span className={`font-bold font-mono ${remainingBalance === 0 ? 'text-emerald-600' : 'text-amber-700'}`}>
                                    {remainingBalance === 0 ? 'LKR 0.00 (Fully Settled)' : fmt(remainingBalance)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Payment Method & Date */}
                    <div className="grid grid-cols-2 gap-3">
                        <Select
                            label="Payment Method"
                            required
                            options={[
                                { value: 'cash', label: 'Cash' },
                                { value: 'bank_transfer', label: 'Bank Transfer' },
                                { value: 'cheque', label: 'Cheque' },
                                { value: 'card', label: 'Card' },
                                { value: 'mobile_wallet', label: 'Mobile Wallet' },
                            ]}
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                        />

                        <Input
                            label="Payment Date"
                            type="date"
                            required
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                        />
                    </div>

                    {/* Bank Account Selection for Bank Transfer / Cheque */}
                    {(method === 'bank_transfer' || method === 'cheque') && (
                        <Select
                            label="Company Bank Account"
                            options={bankAccountOptions}
                            value={bankAccountId}
                            onChange={(e) => setBankAccountId(e.target.value)}
                        />
                    )}

                    {/* Cheque Info */}
                    {method === 'cheque' && (
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Cheque Number"
                                required
                                value={chequeNumber}
                                onChange={(e) => setChequeNumber(e.target.value)}
                                placeholder="e.g. CHQ-48201"
                            />
                            <Input
                                label="Cheque Date"
                                type="date"
                                required
                                value={chequeDate}
                                onChange={(e) => setChequeDate(e.target.value)}
                            />
                        </div>
                    )}

                    <Input
                        label="Transaction Reference / Note (Optional)"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="e.g. Ref # / Slip # / Note"
                    />
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
                    <Button variant="outline" type="button" onClick={onClose} disabled={createMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        loading={createMutation.isPending}
                        disabled={isZeroOrNegative || isOverpaying}
                    >
                        <CreditCard size={15} className="mr-1.5" />
                        Confirm {isFullPayment ? 'Full' : 'Partial'} Payment ({fmt(numAmount)})
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
