import { useState, useEffect } from 'react';
import { useAuth } from '../state/AuthContext';

interface Payment {
    id: string;
    payable_id: string;
    group_id: string;
    user_id: string;
    amount: number;
    payment_method_id: string | null;
    status: string;
    transaction_id: string | null;
    failure_reason: string | null;
    processed_at: string | null;
    payable?: {
        id: string;
        group_id: string;
        group?: {
            id: string;
            name: string;
        };
    };
    paymentMethod?: {
        id: string;
        name: string;
        details: Record<string, any>;
    } | null;
}

export default function PaymentHistory() {
    const { state } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const token = state.token || localStorage.getItem('token');

    useEffect(() => {
        fetchPayments();
        // Poll for updates every 5 seconds
        const interval = setInterval(fetchPayments, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchPayments = async () => {
        try {
            const response = await fetch('/payments', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payments');
            }

            const data = await response.json();
            setPayments(data.payments || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { bg: string; text: string; label: string }> = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
            processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
            completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
            failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' }
        };

        const style = statusMap[status] || statusMap.pending;
        return (
            <span className={`px-2 py-1 rounded text-sm ${style.bg} ${style.text}`}>
                {style.label}
            </span>
        );
    };

    const maskSensitiveData = (value: string, type: 'upi' | 'account' | 'card' = 'account') => {
        if (!value) return '';
        if (type === 'upi') return value;
        if (type === 'card') {
            const last4 = value.slice(-4);
            return `**** **** **** ${last4}`;
        }
        const last4 = value.slice(-4);
        return `****${last4}`;
    };

    if (loading) {
        return <div className="p-4">Loading payment history...</div>;
    }

    const completedPayments = payments.filter(p => p.status === 'completed');
    const totalAmount = completedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Payment History</h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-600">Total Received</div>
                <div className="text-2xl font-bold text-blue-600">
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                    {completedPayments.length} completed payment(s)
                </div>
            </div>

            {payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No payment history found.
                </div>
            ) : (
                <div className="space-y-4">
                    {payments.map((payment) => (
                        <div key={payment.id} className="border rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold text-lg">
                                        {payment.payable?.group?.name || 'Unknown Group'}
                                    </h3>
                                    <div className="text-sm text-gray-600">
                                        {payment.processed_at
                                            ? new Date(payment.processed_at).toLocaleString()
                                            : 'Not processed yet'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-green-600">
                                        ₹{Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    {getStatusBadge(payment.status)}
                                </div>
                            </div>

                            {payment.transaction_id && (
                                <div className="mt-2 text-sm text-gray-600">
                                    Transaction ID: <span className="font-mono">{payment.transaction_id}</span>
                                </div>
                            )}

                            {payment.paymentMethod && (
                                <div className="mt-2 text-sm text-gray-600">
                                    Payment Method: <span className="capitalize">{payment.paymentMethod.name}</span>
                                    {payment.paymentMethod.name === 'UPI' && payment.paymentMethod.details?.upi_id && (
                                        <span className="ml-2">({payment.paymentMethod.details.upi_id})</span>
                                    )}
                                    {payment.paymentMethod.name === 'BankTransfer' && payment.paymentMethod.details?.account_number && (
                                        <span className="ml-2">
                                            ({maskSensitiveData(payment.paymentMethod.details.account_number)})
                                        </span>
                                    )}
                                    {payment.paymentMethod.name === 'Card' && payment.paymentMethod.details?.card_number && (
                                        <span className="ml-2">
                                            ({maskSensitiveData(payment.paymentMethod.details.card_number, 'card')})
                                        </span>
                                    )}
                                </div>
                            )}

                            {payment.failure_reason && (
                                <div className="mt-2 text-sm text-red-600">
                                    Failure Reason: {payment.failure_reason}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

