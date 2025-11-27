'use client';

import Link from 'next/link';
import './subscription.css';
import { Download, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Invoice {
  id: string;
  invoice_number: string | null;
  amount_paid: number;
  currency: string;
  paid_at: string;
  invoice_pdf_url: string | null;
  hosted_invoice_url: string | null;
}

interface SubscriptionDetails {
  planName: string;
  planPrice: string | null;
  billingCycle: string | null;
  renewalDate: string | null;
  isSubscribed: boolean;
  subscriptionType: string | null;
  expiryDate: string | null;
  status: string | null;
}

interface PaymentMethod {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export default function SubscriptionPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    fetchInvoices();
    fetchSubscriptionDetails();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchSubscriptionDetails = async () => {
    try {
      setLoadingSubscription(true);
      const response = await fetch('/api/subscriptions/details');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription || null);
        setPaymentMethod(data.paymentMethod || null);
      }
    } catch (error) {
    } finally {
      setLoadingSubscription(false);
    }
  };

  const formatInvoiceName = (invoice: Invoice) => {
    if (invoice.invoice_number) {
      return `Invoice_${invoice.invoice_number}`;
    }
    const date = new Date(invoice.paid_at);
    const month = date.toLocaleString('default', { month: 'short' });
    const year = date.getFullYear();
    return `Invoice_${month}_${year}`;
  };

  const formatInvoiceDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    if (invoice.hosted_invoice_url) {
      window.open(invoice.hosted_invoice_url, '_blank');
    } else if (invoice.invoice_pdf_url) {
      window.open(invoice.invoice_pdf_url, '_blank');
    } else {
      // Fallback: try to get invoice from Stripe
      alert('Invoice download not available. Please contact support.');
    }
  };

  const getCardBrandLogo = (brand: string) => {
    const brandLower = brand.toLowerCase();
    if (brandLower === 'visa') {
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="32" rx="4" fill="#1A1F71" />
          <text x="24" y="20" fill="white" fontSize="14" fontWeight="600" textAnchor="middle" fontFamily="Arial, sans-serif">
            VISA
          </text>
        </svg>
      );
    } else if (brandLower === 'mastercard') {
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="32" rx="4" fill="#EB001B" />
          <circle cx="18" cy="16" r="8" fill="#F79E1B" />
          <circle cx="30" cy="16" r="8" fill="#FF5F00" />
        </svg>
      );
    } else if (brandLower === 'amex' || brandLower === 'american_express') {
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="32" rx="4" fill="#006FCF" />
          <text x="24" y="20" fill="white" fontSize="10" fontWeight="600" textAnchor="middle" fontFamily="Arial, sans-serif">
            AMEX
          </text>
        </svg>
      );
    } else {
      // Generic card
      return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="32" rx="4" fill="#1A1F71" />
          <text x="24" y="20" fill="white" fontSize="12" fontWeight="600" textAnchor="middle" fontFamily="Arial, sans-serif">
            {brand.toUpperCase()}
          </text>
        </svg>
      );
    }
  };

  return (
    <div className="subscription-page">
      <div className="subscription-container">
        {/* Back Link */}
        <Link href="/dashboard/projects/new" className="subscription-back-link">
          <ArrowLeft size={16} />
          Back
        </Link>

        {/* Header Section */}
        <div className="subscription-header">
          <h1 className="subscription-title">Manage Subscription</h1>
          <p className="subscription-subtitle">Manage your plan and payment</p>
        </div>

        {/* Current Plan Card */}
        <div className="subscription-card">
          <h2 className="subscription-card-title">Current Plan</h2>
          {loadingSubscription ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              Loading subscription details...
            </div>
          ) : subscription && subscription.isSubscribed ? (
            <div className="subscription-plan-content">
              <div className="subscription-plan-left">
                <div className="subscription-plan-badge">{subscription.planName.toUpperCase()}</div>
                <div className="subscription-plan-price">
                  {subscription.planPrice} {subscription.billingCycle}
                </div>
                {subscription.renewalDate && (
                  <p className="subscription-plan-renewal">
                    Your plan will renew on {subscription.renewalDate}.
                  </p>
                )}
              </div>
              <div className="subscription-plan-actions">
                <button className="subscription-btn subscription-btn-primary">
                  Upgrade Plan
                </button>
                <button className="subscription-btn subscription-btn-danger">
                  Cancel Subscription
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              <p>No active subscription found.</p>
              <Link href="/dashboard/projects/new">
                <button className="subscription-btn subscription-btn-primary" style={{ marginTop: '16px' }}>
                  Subscribe Now
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Manage Payment Card */}
        <div className="subscription-card">
          <h2 className="subscription-card-title">Manage Payment</h2>
          {loadingSubscription ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              Loading payment method...
            </div>
          ) : paymentMethod ? (
            <div className="subscription-payment-content">
              <div className="subscription-payment-left">
                <p className="subscription-payment-label">Payment Method</p>
                <div className="subscription-payment-method">
                  <div className="subscription-visa-logo">
                    {getCardBrandLogo(paymentMethod.brand)}
                  </div>
                  <span className="subscription-card-number">
                    {paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)} ending {paymentMethod.last4}
                  </span>
                </div>
              </div>
              <button className="subscription-btn subscription-btn-danger">
                Remove
              </button>
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              <p>No payment method on file.</p>
            </div>
          )}
        </div>

        {/* Invoices Card */}
        <div className="subscription-card">
          <h2 className="subscription-card-title">Invoices</h2>
          {loadingInvoices ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
              No invoices found
            </div>
          ) : (
            <div className="subscription-invoices-list">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="subscription-invoice-item">
                  <div className="subscription-invoice-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 2C3.44772 2 3 2.44772 3 3V17C3 17.5523 3.44772 18 4 18H16C16.5523 18 17 17.5523 17 17V6L11 0H4Z"
                        stroke="#6B7280"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M11 0V6H17"
                        stroke="#6B7280"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="subscription-invoice-info">
                    <span className="subscription-invoice-name">{formatInvoiceName(invoice)}</span>
                    <span className="subscription-invoice-date">
                      Date of Invoice {formatInvoiceDate(invoice.paid_at)}
                    </span>
                  </div>
                  <button 
                    className="subscription-invoice-download"
                    onClick={() => handleDownloadInvoice(invoice)}
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

