import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Verify() {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState<string>('')
    const navigate = useNavigate()

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const selected = event.target.files && event.target.files[0]
        if (!selected) {
            setFile(null)
            setPreview(null)
            return
        }

        if (!selected.type.startsWith('image/')) {
            setStatus('error')
            setMessage('Please upload an image file of your Aadhaar card.')
            return
        }

        setFile(selected)
        const reader = new FileReader()
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setPreview(reader.result)
            }
        }
        reader.readAsDataURL(selected)
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        if (!file || !preview) {
            setStatus('error')
            setMessage('Please select an Aadhaar card image to upload.')
            return
        }

        try {
            setStatus('uploading')
            setMessage('Uploading Aadhaar and verifying...')

            const response = await fetch('/verify/kyc', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify({
                    fileName: file.name,
                    fileBase64: preview
                })
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText || 'Verification failed')
            }

            setStatus('success')
            setMessage('Verification completed successfully. You can now start or join groups.')

            setTimeout(() => {
                navigate('/home')
            }, 1500)
        } catch (error: any) {
            console.error('Verification error', error)
            setStatus('error')
            setMessage(error?.message || 'Failed to verify. Please try again.')
        }
    }

    return (
        <div style={{ maxWidth: 720, margin: '24px auto', padding: '24px 48px' }}>
            <Link
                to="/home"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 16,
                    padding: '8px 12px',
                    background: '#f1f5f9',
                    color: '#1e293b',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '0.875rem'
                }}
            >
                ← Back to Home
            </Link>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, background: '#fff' }}>
                <h2 style={{ marginTop: 0 }}>Verify your identity</h2>
                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    Upload a clear photo of your Aadhaar card. We’ll auto-approve during beta and mark your account as verified.
                    Later, we’ll layer in biometric and OCR checks—no extra action required on your end.
                </p>

                <form onSubmit={handleSubmit} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Aadhaar card image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{
                                display: 'block',
                                width: '100%'
                            }}
                        />
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 6 }}>
                            Accepted formats: JPG, PNG (max ~5 MB). Ensure the card details are legible.
                        </p>
                    </div>

                    {preview && (
                        <div style={{ marginTop: 12 }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Preview</p>
                            <img
                                src={preview}
                                alt="Aadhaar preview"
                                style={{
                                    width: '100%',
                                    maxHeight: 260,
                                    objectFit: 'contain',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: 12,
                                    boxShadow: '0 10px 24px rgba(15,23,42,0.08)'
                                }}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'uploading'}
                        style={{
                            padding: '12px 18px',
                            background: 'linear-gradient(90deg, #2563eb 0%, #6366f1 100%)',
                            color: '#fff',
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: 12,
                            cursor: status === 'uploading' ? 'not-allowed' : 'pointer',
                            boxShadow: '0 12px 30px rgba(59,130,246,0.35)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (status !== 'uploading') {
                                e.currentTarget.style.transform = 'translateY(-2px)'
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none'
                        }}
                    >
                        {status === 'uploading' ? 'Verifying...' : 'Upload & Verify'}
                    </button>
                </form>

                {status !== 'idle' && (
                    <div
                        style={{
                            marginTop: 20,
                            padding: '12px 16px',
                            borderRadius: 12,
                            background:
                                status === 'success'
                                    ? 'rgba(22, 163, 74, 0.12)'
                                    : status === 'error'
                                        ? 'rgba(239, 68, 68, 0.12)'
                                        : 'rgba(37, 99, 235, 0.12)',
                            color:
                                status === 'success'
                                    ? '#166534'
                                    : status === 'error'
                                        ? '#b91c1c'
                                        : '#1d4ed8',
                            fontWeight: 500
                        }}
                    >
                        {message}
                    </div>
                )}
            </div>
        </div>
    )
}



