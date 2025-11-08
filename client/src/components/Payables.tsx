import { useState, useEffect } from 'react';
import { useAuth } from '../state/AuthContext';

interface Payable {
    id: string;
    group_id: string;
    user_id: string;
    amount: number;
    paidAmount: number;
    remainingAmount: number;
    payments: Payment[];
    group?: {
        id: string;
        name: string;
        amount: number;
    };
}

interface Payment {
    id: string;
    payable_id: string;
    amount: number;
    status: string;
    transaction_id: string | null;
    processed_at: string | null;
}

export default function Payables() {
    const { state } = useAuth();
    const [payables, setPayables] = useState<Payable[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalAmount, setTotalAmount] = useState(0);
    const [totalRemaining, setTotalRemaining] = useState(0);
    const [processingPayableId, setProcessingPayableId] = useState<string | null>(null);

    const token = state.token || localStorage.getItem('token');

    useEffect(() => {
        fetchPayables();
        // Poll for updates every 5 seconds to check payment status
        const interval = setInterval(fetchPayables, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchPayables = async () => {
        try {
            const response = await fetch('/payables', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch payables');
            }

            const data = await response.json();
            setPayables(data.payables || []);
            setTotalAmount(data.totalAmount || 0);
            setTotalRemaining(data.totalRemaining || 0);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const processPayment = async (payableId: string) => {
        try {
            setProcessingPayableId(payableId);
            setError(null);

            // First, get user's payment methods to select one
            const methodsResponse = await fetch('/payment-methods', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!methodsResponse.ok) {
                throw new Error('Failed to fetch payment methods');
            }

            const methodsData = await methodsResponse.json();
            const activeMethods = methodsData.paymentMethods?.filter((m: any) => m.active) || [];

            if (activeMethods.length === 0) {
                setError('No active payment methods found. Please add a payment method first.');
                setProcessingPayableId(null);
                return;
            }

            // Use the first active payment method
            const paymentMethodId = activeMethods[0].id;

            const response = await fetch('/payments/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    payable_id: payableId,
                    payment_method_id: paymentMethodId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to process payment');
            }

            await fetchPayables();
            alert('Payment processing initiated. Status will update shortly.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProcessingPayableId(null);
        }
    };

    const processAllPayments = async () => {
        if (!confirm('Process all pending payments?')) {
            return;
        }

        try {
            setProcessingPayableId('all');
            setError(null);

            const response = await fetch('/payments/process-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to process payments');
            }

            const data = await response.json();
            await fetchPayables();
            alert(`Processing ${data.processed} payment(s). Status will update shortly.`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProcessingPayableId(null);
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

    if (loading) {
        return <div className="p-4">Loading payables...</div>;
    }

    const pendingPayables = payables.filter(p => p.remainingAmount > 0);

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Payables</h2>
                {pendingPayables.length > 0 && (
                    <button
                        onClick={processAllPayments}
                        disabled={processingPayableId === 'all'}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                    >
                        {processingPayableId === 'all' ? 'Processing...' : 'Process All Payments'}
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Total Amount</div>
                    <div className="text-2xl font-bold text-blue-600">
                        ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Pending</div>
                    <div className="text-2xl font-bold text-yellow-600">
                        ₹{totalRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Paid</div>
                    <div className="text-2xl font-bold text-green-600">
                        ₹{(totalAmount - totalRemaining).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {payables.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No payables found. You will see payables here when you win an auction.
                </div>
            ) : (
                <div className="space-y-4">
                    {payables.map((payable) => (
                        <div key={payable.id} className="border rounded-lg p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-semibold text-lg">
                                        {payable.group?.name || 'Unknown Group'}
                                    </h3>
                                    <div className="text-sm text-gray-600">
                                        Group Amount: ₹{payable.group?.amount?.toLocaleString('en-IN') || '0'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-green-600">
                                        ₹{Number(payable.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    {payable.remainingAmount > 0 && (
                                        <div className="text-sm text-yellow-600">
                                            Pending: ₹{payable.remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                    )}
                                    {payable.paidAmount > 0 && (
                                        <div className="text-sm text-gray-600">
                                            Paid: ₹{payable.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {payable.remainingAmount > 0 && (
                                <button
                                    onClick={() => processPayment(payable.id)}
                                    disabled={processingPayableId === payable.id}
                                    className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                                >
                                    {processingPayableId === payable.id ? 'Processing...' : 'Process Payment'}
                                </button>
                            )}

                            {payable.payments.length > 0 && (
                                <div className="mt-4 border-t pt-4">
                                    <h4 className="font-medium mb-2">Payment History</h4>
                                    <div className="space-y-2">
                                        {payable.payments.map((payment) => (
                                            <div
                                                key={payment.id}
                                                className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded"
                                            >
                                                <div>
                                                    <div className="font-medium">
                                                        ₹{Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </div>
                                                    {payment.transaction_id && (
                                                        <div className="text-xs text-gray-500">
                                                            TXN: {payment.transaction_id}
                                                        </div>
                                                    )}
                                                    {payment.processed_at && (
                                                        <div className="text-xs text-gray-500">
                                                            {new Date(payment.processed_at).toLocaleString()}
                                                        </div>
                                                    )}
                                                </div>
                                                {getStatusBadge(payment.status)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

