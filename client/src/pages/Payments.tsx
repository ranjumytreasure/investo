import PaymentMethods from '../components/PaymentMethods';

export default function Payments() {
    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-semibold text-slate-900">Payment Methods</h1>
                <p className="mt-2 text-sm text-slate-500 max-w-2xl">
                    Manage payout destinations used for automatic disbursements. Add UPI IDs, bank transfer details, or cards, choose which are active, and keep them up to date for seamless payments.
                </p>
            </div>

            <PaymentMethods />
        </div>
    );
}

