'use client';

import { useState } from 'react';
import Reveal from './Reveal';

export default function EnquiryForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    firmName: '',
    reason: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.reason.trim()) newErrors.reason = 'Reason for enquiry is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit enquiry');
      }

      setStatus('success');
      setFormData({ name: '', email: '', phone: '', firmName: '', reason: '' });
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  const resetForm = () => {
    setStatus('idle');
    setErrors({});
    setErrorMessage('');
  };

  if (status === 'success') {
    return (
      <Reveal className="text-center py-12">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-2xl font-display font-bold mb-2" style={{ color: 'var(--text)' }}>
          Enquiry sent!
        </h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Thanks for reaching out. We’ll get back to you within 24 hours.
        </p>
        <button
          onClick={resetForm}
          className="mt-6 text-sm font-semibold px-6 py-2.5 rounded-full transition glass-card hover:opacity-80"
          style={{ color: 'var(--accent)' }}
        >
          Send another enquiry
        </button>
      </Reveal>
    );
  }

  return (
    <Reveal>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <span
            className="text-xs font-semibold uppercase tracking-widest font-technical"
            style={{ color: 'var(--accent-2)' }}
          >
            Enquiry
          </span>
          <h2 className="text-3xl md:text-4xl font-display font-bold mt-2" style={{ color: 'var(--text)' }}>
            Let’s discuss your project
          </h2>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Fill in the details and we’ll get back to you promptly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {status === 'error' && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-transparent border outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] text-sm"
              style={{
                borderColor: errors.name ? '#ef4444' : 'var(--border)',
                color: 'var(--text)',
              }}
              placeholder="e.g. Jane Doe"
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-transparent border outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] text-sm"
              style={{
                borderColor: errors.email ? '#ef4444' : 'var(--border)',
                color: 'var(--text)',
              }}
              placeholder="jane@example.com"
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Contact Number <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-transparent border outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] text-sm"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="firmName" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Firm / Company Name <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <input
              id="firmName"
              name="firmName"
              type="text"
              value={formData.firmName}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-transparent border outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] text-sm"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
              placeholder="e.g. ABC Designs"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reason" className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Reason for enquiry <span className="text-red-400">*</span>
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={4}
              value={formData.reason}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-transparent border outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] text-sm resize-y"
              style={{
                borderColor: errors.reason ? '#ef4444' : 'var(--border)',
                color: 'var(--text)',
              }}
              placeholder="I'd like to discuss a new project, get a quote, or ask about your services..."
            />
            {errors.reason && <p className="text-xs text-red-400 mt-1">{errors.reason}</p>}
          </div>

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="w-full text-white font-bold text-sm px-9 py-4 rounded-full shadow-2xl transition-all glow-button disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background:
                'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--accent-2)))',
            }}
          >
            {status === 'submitting' ? (
              <>
                <svg
                  className="animate-spin w-4 h-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Sending…
              </>
            ) : (
              'Send Enquiry ↗'
            )}
          </button>
        </form>
      </div>
    </Reveal>
  );
}