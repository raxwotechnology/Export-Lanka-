import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { useAttendance, useBulkMarkAttendance, useEmployees, useDepartments } from '../features/hr/useHr';

const statusVariant = {
    present: 'success', absent: 'danger', half_day: 'warning',
    leave: 'info', holiday: 'default', weekend: 'default', late: 'warning',
};

export default function AttendancePage() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [departmentId, setDepartmentId] = useState('');
    const [isBulkOpen, setIsBulkOpen] = useState(false);

    const { data: attData } = useAttendance({ date: selectedDate, departmentId: departmentId || undefined, limit: 200 });
    const { data: empData } = useEmployees({ departmentId: departmentId || undefined, status: 'active', limit: 500 });
    const { data: deptsData } = useDepartments();
    const bulkMark = useBulkMarkAttendance();

    const attendance = attData?.data || [];
    const employees = empData?.data || [];
    const depts = deptsData?.data || [];
    const deptOptions = depts.map((d) => ({ value: d._id, label: d.name }));

    const [bulkRecords, setBulkRecords] = useState([]);

    const openBulk = () => {
        // Seed with all employees, default present
        const attMap = new Map(attendance.map((a) => [a.employeeId._id || a.employeeId, a]));
        const records = employees.map((e) => {
            const existing = attMap.get(e._id);
            return {
                employeeId: e._id,
                employeeName: `${e.firstName} ${e.lastName}`,
                status: existing?.status || 'present',
                checkInTime: existing?.checkInTime || `${selectedDate}T08:00`,
                checkOutTime: existing?.checkOutTime || `${selectedDate}T17:00`,
            };
        });
        setBulkRecords(records);
        setIsBulkOpen(true);
    };

    const submitBulk = async () => {
        try {
            await bulkMark.mutateAsync({
                date: selectedDate,
                records: bulkRecords.map((r) => ({
                    employeeId: r.employeeId,
                    status: r.status,
                    checkInTime: r.status === 'present' || r.status === 'late' ? r.checkInTime : undefined,
                    checkOutTime: r.status === 'present' || r.status === 'late' ? r.checkOutTime : undefined,
                })),
            });
            setIsBulkOpen(false);
        } catch { }
    };

    const columns = [
        {
            key: 'employee', label: 'Employee', render: (r) => (
                <div>
                    <p className="font-medium text-sm">{r.employeeName}</p>
                    <p className="text-xs font-mono text-gray-500">{r.employeeCode}</p>
                </div>
            )
        },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status?.replace(/_/g, ' ')}</Badge> },
        { key: 'checkIn', label: 'Check In', render: (r) => r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '—' },
        { key: 'checkOut', label: 'Check Out', render: (r) => r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit' }) : '—' },
        { key: 'worked', label: 'Worked', render: (r) => r.totalWorkedMinutes ? `${(r.totalWorkedMinutes / 60).toFixed(1)} hrs` : '—' },
        { key: 'late', label: 'Late', render: (r) => r.lateMinutes > 0 ? `${r.lateMinutes} min` : '—' },
        { key: 'ot', label: 'OT', render: (r) => r.overtimeMinutes > 0 ? `${(r.overtimeMinutes / 60).toFixed(1)} hrs` : '—' },
    ];

    return (
        <div>
            <PageHeader title="Attendance" description="Daily staff attendance records"
                actions={<Button variant="primary" onClick={openBulk}>
                    <Plus size={16} className="mr-1.5" /> Bulk Mark Attendance
                </Button>} />

            <Card>
                <div className="p-4 border-b flex gap-3">
                    <div className="w-48">
                        <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                    </div>
                    <div className="w-56">
                        <Select placeholder="All Departments" options={deptOptions}
                            value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} />
                    </div>
                </div>
                {attendance.length === 0
                    ? <EmptyState icon={CalendarIcon} title="No attendance recorded" description="Click 'Bulk Mark Attendance' to record for today"
                        action={<Button variant="primary" onClick={openBulk}>Mark Attendance</Button>} />
                    : <Table columns={columns} data={attendance} />}
            </Card>

            <Modal isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} title={`Mark Attendance — ${selectedDate}`} size="lg">
                <div className="p-6 max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b">
                            <tr>
                                <th className="text-left py-2">Employee</th>
                                <th className="text-left py-2">Status</th>
                                <th className="text-left py-2">In</th>
                                <th className="text-left py-2">Out</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {bulkRecords.map((r, idx) => (
                                <tr key={r.employeeId}>
                                    <td className="py-2">{r.employeeName}</td>
                                    <td className="py-2">
                                        <select value={r.status}
                                            onChange={(e) => {
                                                const newR = [...bulkRecords]; newR[idx].status = e.target.value; setBulkRecords(newR);
                                            }}
                                            className="px-2 py-1 border rounded text-xs">
                                            <option value="present">Present</option>
                                            <option value="absent">Absent</option>
                                            <option value="half_day">Half Day</option>
                                            <option value="late">Late</option>
                                            <option value="leave">Leave</option>
                                        </select>
                                    </td>
                                    <td className="py-2">
                                        <input type="datetime-local" value={r.checkInTime}
                                            onChange={(e) => {
                                                const newR = [...bulkRecords]; newR[idx].checkInTime = e.target.value; setBulkRecords(newR);
                                            }}
                                            disabled={!['present', 'late', 'half_day'].includes(r.status)}
                                            className="px-2 py-1 border rounded text-xs disabled:bg-gray-100" />
                                    </td>
                                    <td className="py-2">
                                        <input type="datetime-local" value={r.checkOutTime}
                                            onChange={(e) => {
                                                const newR = [...bulkRecords]; newR[idx].checkOutTime = e.target.value; setBulkRecords(newR);
                                            }}
                                            disabled={!['present', 'late', 'half_day'].includes(r.status)}
                                            className="px-2 py-1 border rounded text-xs disabled:bg-gray-100" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsBulkOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={submitBulk} loading={bulkMark.isPending}>
                        Save All ({bulkRecords.length} records)
                    </Button>
                </div>
            </Modal>
        </div>
    );
}