import { Link } from 'react-router-dom'

export default function Landing() {
    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%)' }}>
            {/* Hero Section */}
            <section style={{
                maxWidth: '100%',
                width: '100%',
                margin: '0 auto',
                padding: '80px 48px',
                textAlign: 'center'
            }}>
                <h1 style={{
                    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                    fontWeight: 700,
                    marginBottom: 24,
                    background: 'linear-gradient(to right, #2563eb, #7c3aed)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                }}>
                    Investo
                </h1>
                <p style={{
                    fontSize: '1.5rem',
                    color: '#64748b',
                    maxWidth: 800,
                    margin: '0 auto 40px',
                    lineHeight: 1.6
                }}>
                    Smart, transparent money pools with friends and community.
                    Create rotating savings groups with automated auctions.
                </p>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 }}>
                    <Link
                        to="/signup"
                        style={{
                            padding: '14px 28px',
                            background: '#2563eb',
                            color: '#fff',
                            borderRadius: 12,
                            border: 'none',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            boxShadow: '0 4px 6px rgba(37, 99, 235, 0.3)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#1e40af';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 12px rgba(37, 99, 235, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#2563eb';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(37, 99, 235, 0.3)';
                        }}
                    >
                        Get Started Free
                    </Link>
                    <Link
                        to="/login"
                        style={{
                            padding: '14px 28px',
                            background: '#fff',
                            color: '#2563eb',
                            borderRadius: 12,
                            border: '2px solid #2563eb',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            textDecoration: 'none'
                        }}
                    >
                        Sign In
                    </Link>
                </div>

                {/* Features Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 24,
                    marginTop: 80,
                    maxWidth: '1400px',
                    margin: '80px auto 0',
                    width: '100%'
                }}>
                    <FeatureCard
                        icon="🔒"
                        title="Secure & Trusted"
                        description="PIN-based authentication with OTP verification. Your financial data is protected with industry-standard security."
                    />
                    <FeatureCard
                        icon="📊"
                        title="Transparent Auctions"
                        description="Live auction updates, real-time bidding, and complete transaction history. No hidden fees, full transparency."
                    />
                    <FeatureCard
                        icon="⚡"
                        title="Automated Management"
                        description="Automated dues collection, reminders via SMS/WhatsApp, and instant settlements to winners."
                    />
                    <FeatureCard
                        icon="👥"
                        title="Flexible Groups"
                        description="Create custom pools with your preferred amount, schedule, and member settings. Perfect for friends and communities."
                    />
                </div>
            </section>

            {/* How It Works */}
            <section style={{
                background: '#f8fafc',
                padding: '80px 48px',
                borderTop: '1px solid #e2e8f0'
            }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                    <h2 style={{
                        textAlign: 'center',
                        fontSize: '2.5rem',
                        marginBottom: 60,
                        color: '#1e293b'
                    }}>
                        How It Works
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: 32
                    }}>
                        <StepCard
                            number={1}
                            title="Create a Group"
                            description="Set up your money pool with name, amount, members, and schedule preferences."
                        />
                        <StepCard
                            number={2}
                            title="Invite Members"
                            description="Add trusted members by phone number and set their permissions and access levels."
                        />
                        <StepCard
                            number={3}
                            title="Run Auctions"
                            description="Automated auctions run on schedule. Members bid, highest bidder wins the pot."
                        />
                        <StepCard
                            number={4}
                            title="Get Paid"
                            description="Winners receive instant settlements. Track all transactions and profits in real-time."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section style={{
                padding: '80px 48px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                color: '#fff'
            }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: 24 }}>
                        Ready to Start Your First Pool?
                    </h2>
                    <p style={{ fontSize: '1.2rem', marginBottom: 32, opacity: 0.95 }}>
                        Join thousands of users managing their rotating savings groups with Investo.
                    </p>
                    <Link
                        to="/signup"
                        style={{
                            padding: '16px 32px',
                            background: '#fff',
                            color: '#2563eb',
                            borderRadius: 12,
                            border: 'none',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'inline-block'
                        }}
                    >
                        Create Free Account
                    </Link>
                </div>
            </section>
        </div>
    )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <div style={{
            background: '#fff',
            padding: 32,
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
        >
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>{icon}</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: 12, color: '#1e293b' }}>{title}</h3>
            <p style={{ color: '#64748b', lineHeight: 1.6 }}>{description}</p>
        </div>
    )
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#2563eb',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 700,
                margin: '0 auto 24px'
            }}>
                {number}
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: 12, color: '#1e293b' }}>{title}</h3>
            <p style={{ color: '#64748b', lineHeight: 1.6 }}>{description}</p>
        </div>
    )
}

