import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm action',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false,
}) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="p-6">
                <div className="flex gap-4">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'
                        }`}>
                        <AlertTriangle size={20} className={variant === 'danger' ? 'text-red-600' : 'text-amber-600'} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-700">{message}</p>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        {cancelText}
                    </Button>
                    <Button variant={variant} onClick={onConfirm} loading={loading}>
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}