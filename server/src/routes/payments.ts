import { Express } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { PaymentMethod } from '../models/PaymentMethod';
import { Payable, Payment, Receivable, Receipt } from '../models/Finance';
import { Group } from '../models/Group';
import { Op } from 'sequelize';
import { sequelize } from '../lib/sequelize';

export function registerPaymentRoutes(app: Express) {
    // ===== PAYMENT METHODS ROUTES =====
    
    // Get all payment methods for current user
    app.get('/payment-methods', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const paymentMethods = await PaymentMethod.findAll({
                where: { user_id: req.user.id },
                order: [['created_at', 'DESC']]
            });

            return res.json({
                paymentMethods: paymentMethods.map(pm => ({
                    ...pm.toJSON(),
                    details: pm.details_json ? JSON.parse(pm.details_json) : null
                }))
            });
        } catch (error: any) {
            console.error('Error fetching payment methods:', error);
            return res.status(500).json({ message: error.message || 'Failed to fetch payment methods' });
        }
    });

    // Create a new payment method
    app.post('/payment-methods', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const { name, details } = req.body as { 
                name: string; 
                details: Record<string, any> 
            };

            if (!name || !['UPI', 'BankTransfer', 'Card', 'Cash'].includes(name)) {
                return res.status(400).json({ 
                    message: 'Invalid payment method name. Must be one of: UPI, BankTransfer, Card, Cash' 
                });
            }

            // Validate details based on payment method type
            if (name === 'UPI' && !details?.upi_id) {
                return res.status(400).json({ message: 'UPI ID is required for UPI payment method' });
            }
            if (name === 'BankTransfer' && !details?.account_number && !details?.ifsc_code) {
                return res.status(400).json({ message: 'Account number and IFSC code are required for Bank Transfer' });
            }
            if (name === 'Card' && !details?.card_number) {
                return res.status(400).json({ message: 'Card number is required for Card payment method' });
            }

            const paymentMethod = await PaymentMethod.create({
                user_id: req.user.id,
                name: name,
                details_json: JSON.stringify(details || {}),
                active: true
            });

            return res.status(201).json({
                message: 'Payment method created successfully',
                paymentMethod: {
                    ...paymentMethod.toJSON(),
                    details: paymentMethod.details_json ? JSON.parse(paymentMethod.details_json) : null
                }
            });
        } catch (error: any) {
            console.error('Error creating payment method:', error);
            return res.status(500).json({ message: error.message || 'Failed to create payment method' });
        }
    });

    // Update a payment method
    app.put('/payment-methods/:id', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const { id } = req.params;
            const paymentMethod = await PaymentMethod.findOne({
                where: { id, user_id: req.user.id }
            });

            if (!paymentMethod) {
                return res.status(404).json({ message: 'Payment method not found' });
            }

            const { name, details, active } = req.body as { 
                name?: string; 
                details?: Record<string, any>;
                active?: boolean;
            };

            if (name && !['UPI', 'BankTransfer', 'Card', 'Cash'].includes(name)) {
                return res.status(400).json({ 
                    message: 'Invalid payment method name. Must be one of: UPI, BankTransfer, Card, Cash' 
                });
            }

            if (name !== undefined) paymentMethod.name = name;
            if (details !== undefined) paymentMethod.details_json = JSON.stringify(details);
            if (active !== undefined) paymentMethod.active = active;
            paymentMethod.updated_at = new Date();

            await paymentMethod.save();

            return res.json({
                message: 'Payment method updated successfully',
                paymentMethod: {
                    ...paymentMethod.toJSON(),
                    details: paymentMethod.details_json ? JSON.parse(paymentMethod.details_json) : null
                }
            });
        } catch (error: any) {
            console.error('Error updating payment method:', error);
            return res.status(500).json({ message: error.message || 'Failed to update payment method' });
        }
    });

    // Delete a payment method
    app.delete('/payment-methods/:id', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const { id } = req.params;
            const paymentMethod = await PaymentMethod.findOne({
                where: { id, user_id: req.user.id }
            });

            if (!paymentMethod) {
                return res.status(404).json({ message: 'Payment method not found' });
            }

            // Check if payment method is used in any pending payments
            const pendingPayments = await Payment.count({
                where: {
                    payment_method_id: id,
                    status: { [Op.in]: ['pending', 'processing'] }
                }
            });

            if (pendingPayments > 0) {
                return res.status(400).json({ 
                    message: 'Cannot delete payment method with pending payments. Please deactivate it instead.' 
                });
            }

            await paymentMethod.destroy();

            return res.json({ message: 'Payment method deleted successfully' });
        } catch (error: any) {
            console.error('Error deleting payment method:', error);
            return res.status(500).json({ message: error.message || 'Failed to delete payment method' });
        }
    });

    // ===== PAYABLES ROUTES =====

    // Get all payables (amounts owed to user)
    app.get('/payables', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const payables = await Payable.findAll({
                where: { user_id: req.user.id },
                include: [
                    {
                        model: Group,
                        attributes: ['id', 'name', 'amount']
                    }
                ],
                order: [['id', 'DESC']]
            });

            // Calculate total amount
            const totalAmount = payables.reduce((sum, p) => sum + Number(p.amount), 0);

            // Get payments made against these payables
            const payableIds = payables.map(p => p.id);
            const payments = await Payment.findAll({
                where: {
                    payable_id: { [Op.in]: payableIds }
                }
            });

            // Map payments to payables
            const payablesWithPayments = payables.map(payable => {
                const relatedPayments = payments.filter(p => p.payable_id === payable.id);
                const paidAmount = relatedPayments
                    .filter(p => p.status === 'completed')
                    .reduce((sum, p) => sum + Number(p.amount), 0);
                const remainingAmount = Number(payable.amount) - paidAmount;

                return {
                    ...payable.toJSON(),
                    paidAmount,
                    remainingAmount,
                    payments: relatedPayments.map(p => p.toJSON())
                };
            });

            return res.json({
                payables: payablesWithPayments,
                totalAmount,
                totalRemaining: payablesWithPayments.reduce((sum, p) => sum + p.remainingAmount, 0)
            });
        } catch (error: any) {
            console.error('Error fetching payables:', error);
            return res.status(500).json({ message: error.message || 'Failed to fetch payables' });
        }
    });

    // ===== PAYMENTS ROUTES =====

    app.post('/receivables/:id/pay', authenticateToken, async (req: AuthRequest, res) => {
        const transaction = await sequelize.transaction();
        try {
            if (!req.user) {
                await transaction.rollback();
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const { id } = req.params;
            const { amount, payment_method, reference } = req.body as {
                amount?: number | string;
                payment_method?: string;
                reference?: string;
            };

            if (!amount || !payment_method) {
                await transaction.rollback();
                return res.status(400).json({ message: 'amount and payment_method are required' });
            }

            const amountNumber = Number(amount);
            if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
                await transaction.rollback();
                return res.status(400).json({ message: 'amount must be a positive number' });
            }

            const receivable = await Receivable.findByPk(id, { transaction });

            if (!receivable) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Receivable not found' });
            }

            const isAdmin = req.user.role === 'admin' || req.user.role === 'productowner';
            if (!isAdmin && receivable.user_id !== req.user.id) {
                await transaction.rollback();
                return res.status(403).json({ message: 'You are not allowed to pay this receivable' });
            }

            const successfulReceipts = await Receipt.findAll({
                where: {
                    receivable_id: receivable.id,
                    status: 'success'
                },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            const paidAmount = successfulReceipts.reduce((sum, r) => sum + Number(r.amount), 0);
            const dueAmount = Number(receivable.due_amount);
            const remainingAmount = Math.max(0, dueAmount - paidAmount);

            if (remainingAmount <= 0) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Receivable is already fully paid' });
            }

            if (amountNumber > remainingAmount + 0.001) {
                await transaction.rollback();
                return res.status(400).json({
                    message: `Payment exceeds remaining amount of ₹${remainingAmount.toFixed(2)}`
                });
            }

            const receipt = await Receipt.create({
                receivable_id: receivable.id,
                user_id: receivable.user_id,
                amount: amountNumber,
                payment_method: payment_method,
                trx_number: reference || null,
                status: 'success'
            }, { transaction });

            const newPaidAmount = paidAmount + amountNumber;
            const newRemaining = Math.max(0, dueAmount - newPaidAmount);

            await receivable.update({
                status: newRemaining <= 0 ? 'paid' : 'pending'
            }, { transaction });

            await transaction.commit();

            return res.json({
                receipt: receipt.toJSON(),
                receivable: {
                    id: receivable.id,
                    due_amount: dueAmount,
                    paid_amount: Number(newPaidAmount.toFixed(2)),
                    remaining_amount: Number(newRemaining.toFixed(2)),
                    status: newRemaining <= 0 ? 'paid' : 'pending'
                }
            });
        } catch (error: any) {
            await transaction.rollback();
            console.error('Error recording receivable payment:', error);
            return res.status(500).json({ message: error?.message || 'Failed to record payment' });
        }
    });

    // Get payment history
    app.get('/receivables/summary', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const receivables = await Receivable.findAll({
                where: {
                    user_id: req.user.id
                }
            });

            if (receivables.length === 0) {
                return res.json({
                    total_due: 0,
                    total_paid: 0,
                    total_pending: 0
                });
            }

            const totalDue = receivables.reduce((sum, r) => sum + Number(r.due_amount), 0);
            const receivableIds = receivables.map(r => r.id);

            const receipts = await Receipt.findAll({
                where: {
                    receivable_id: { [Op.in]: receivableIds },
                    status: 'success'
                }
            });

            const totalPaid = receipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0);
            const totalPending = Math.max(0, totalDue - totalPaid);

            return res.json({
                total_due: Number(totalDue.toFixed(2)),
                total_paid: Number(totalPaid.toFixed(2)),
                total_pending: Number(totalPending.toFixed(2))
            });
        } catch (error: any) {
            console.error('Error fetching receivable summary:', error);
            return res.status(500).json({ message: error?.message || 'Failed to fetch receivable summary' });
        }
    });

    app.get('/payments', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const payments = await Payment.findAll({
                where: { user_id: req.user.id },
                include: [
                    {
                        model: Payable,
                        as: 'payable',
                        include: [
                            {
                                model: Group,
                                attributes: ['id', 'name']
                            }
                        ]
                    },
                    {
                        model: PaymentMethod,
                        as: 'paymentMethod',
                        attributes: ['id', 'name', 'details_json'],
                        required: false
                    }
                ],
                order: [['id', 'DESC']],
                limit: 100
            });

            const formattedPayments = payments.map(payment => {
                const associatedPaymentMethod = payment.get('paymentMethod') as PaymentMethod | null;

                return {
                    ...payment.toJSON(),
                    paymentMethod: associatedPaymentMethod
                        ? {
                            ...associatedPaymentMethod.toJSON(),
                            details: associatedPaymentMethod.details_json
                                ? JSON.parse(associatedPaymentMethod.details_json)
                                : null
                        }
                        : null
                };
            });

            return res.json({
                payments: formattedPayments
            });
        } catch (error: any) {
            console.error('Error fetching payments:', error);
            return res.status(500).json({ message: error.message || 'Failed to fetch payments' });
        }
    });

    // Process automatic payment for a payable
    app.post('/payments/process', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const { payable_id, payment_method_id } = req.body as {
                payable_id: string;
                payment_method_id: string;
            };

            if (!payable_id || !payment_method_id) {
                return res.status(400).json({ 
                    message: 'payable_id and payment_method_id are required' 
                });
            }

            // Verify payable belongs to user
            const payable = await Payable.findOne({
                where: { 
                    id: payable_id, 
                    user_id: req.user.id 
                },
                include: [
                    {
                        model: Group,
                        attributes: ['id', 'name']
                    }
                ]
            });

            if (!payable) {
                return res.status(404).json({ message: 'Payable not found' });
            }

            // Verify payment method belongs to user and is active
            const paymentMethod = await PaymentMethod.findOne({
                where: { 
                    id: payment_method_id, 
                    user_id: req.user.id,
                    active: true
                }
            });

            if (!paymentMethod) {
                return res.status(404).json({ message: 'Payment method not found or inactive' });
            }

            // Check if payable is already fully paid
            const existingPayments = await Payment.findAll({
                where: { payable_id: payable.id }
            });

            const paidAmount = existingPayments
                .filter(p => p.status === 'completed')
                .reduce((sum, p) => sum + Number(p.amount), 0);

            const remainingAmount = Number(payable.amount) - paidAmount;

            if (remainingAmount <= 0) {
                return res.status(400).json({ message: 'Payable is already fully paid' });
            }

            // Create payment record
            const payment = await Payment.create({
                payable_id: payable.id,
                group_id: payable.group_id,
                user_id: req.user.id,
                amount: remainingAmount,
                payment_method_id: payment_method_id,
                status: 'processing',
                transaction_id: null,
                failure_reason: null,
                processed_at: null
            });

            // Simulate payment processing (in real implementation, integrate with payment gateway)
            // For now, we'll auto-complete it after a short delay
            setTimeout(async () => {
                try {
                    // Generate a transaction ID
                    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                    
                    // Simulate successful payment (99% success rate for demo)
                    const success = Math.random() > 0.01;

                    await payment.update({
                        status: success ? 'completed' : 'failed',
                        transaction_id: transactionId,
                        failure_reason: success ? null : 'Payment gateway error',
                        processed_at: new Date()
                    });

                    console.log(`💳 Payment ${success ? 'completed' : 'failed'} for payable ${payable_id}: ${transactionId}`);
                } catch (error) {
                    console.error('Error updating payment status:', error);
                    await payment.update({
                        status: 'failed',
                        failure_reason: 'Processing error',
                        processed_at: new Date()
                    });
                }
            }, 2000); // 2 second delay to simulate processing

            return res.status(202).json({
                message: 'Payment processing initiated',
                payment: {
                    ...payment.toJSON(),
                    paymentMethod: {
                        ...paymentMethod.toJSON(),
                        details: paymentMethod.details_json ? JSON.parse(paymentMethod.details_json) : null
                    }
                }
            });
        } catch (error: any) {
            console.error('Error processing payment:', error);
            return res.status(500).json({ message: error.message || 'Failed to process payment' });
        }
    });

    // Process all pending payables automatically
    app.post('/payments/process-all', authenticateToken, async (req: AuthRequest, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const { payment_method_id } = req.body as {
                payment_method_id?: string;
            };

            // Get user's default active payment method
            let paymentMethod;
            if (payment_method_id) {
                paymentMethod = await PaymentMethod.findOne({
                    where: { 
                        id: payment_method_id, 
                        user_id: req.user.id,
                        active: true
                    }
                });
            } else {
                // Get first active payment method
                paymentMethod = await PaymentMethod.findOne({
                    where: { 
                        user_id: req.user.id,
                        active: true
                    },
                    order: [['created_at', 'ASC']]
                });
            }

            if (!paymentMethod) {
                return res.status(404).json({ 
                    message: 'No active payment method found. Please add a payment method first.' 
                });
            }

            // Get all payables for user
            const payables = await Payable.findAll({
                where: { user_id: req.user.id }
            });

            if (payables.length === 0) {
                return res.json({ 
                    message: 'No payables found',
                    processed: 0
                });
            }

            // Process each payable
            const processedPayments = [];
            for (const payable of payables) {
                // Check if payable is already fully paid
                const existingPayments = await Payment.findAll({
                    where: { payable_id: payable.id }
                });

                const paidAmount = existingPayments
                    .filter(p => p.status === 'completed')
                    .reduce((sum, p) => sum + Number(p.amount), 0);

                const remainingAmount = Number(payable.amount) - paidAmount;

                if (remainingAmount > 0) {
                    const payment = await Payment.create({
                        payable_id: payable.id,
                        group_id: payable.group_id,
                        user_id: req.user.id,
                        amount: remainingAmount,
                        payment_method_id: paymentMethod.id,
                        status: 'processing',
                        transaction_id: null,
                        failure_reason: null,
                        processed_at: null
                    });

                    processedPayments.push(payment);

                    // Simulate payment processing
                    setTimeout(async () => {
                        try {
                            const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                            const success = Math.random() > 0.01;

                            await payment.update({
                                status: success ? 'completed' : 'failed',
                                transaction_id: transactionId,
                                failure_reason: success ? null : 'Payment gateway error',
                                processed_at: new Date()
                            });
                        } catch (error) {
                            console.error('Error updating payment status:', error);
                            await payment.update({
                                status: 'failed',
                                failure_reason: 'Processing error',
                                processed_at: new Date()
                            });
                        }
                    }, 2000);
                }
            }

            return res.status(202).json({
                message: `Processing ${processedPayments.length} payment(s)`,
                processed: processedPayments.length,
                payments: processedPayments.map(p => p.toJSON())
            });
        } catch (error: any) {
            console.error('Error processing all payments:', error);
            return res.status(500).json({ message: error.message || 'Failed to process payments' });
        }
    });
}

