/**
 * ORDER SUCCESS PAGE
 * Simple, clean success confirmation
 */

import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Package, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';

export default function OrderSuccess() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to orders page after 10 seconds
    const timer = setTimeout(() => {
      navigate('/orders');
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <>
      <SEO title="Order Placed Successfully" description="Your order has been placed" />

      <div className="order-success-page">
        <div className="success-container">
          <div className="success-icon">
            <CheckCircle2 size={80} />
          </div>

          <h1>Order Placed Successfully!</h1>
          <p className="order-id">Order ID: <strong>#{orderId}</strong></p>

          <p className="success-message">
            Thank you for shopping with us! We'll send you a confirmation email shortly.
          </p>

          <div className="success-actions">
            <Link to="/orders" className="btn-primary">
              <Package size={20} />
              View All Orders
            </Link>
            <Link to={`/order/${orderId}`} className="btn-secondary">
              Track This Order
              <ArrowRight size={20} />
            </Link>
          </div>

          <Link to="/products" className="home-link">
            <ArrowRight size={16} />
            Continue Shopping
          </Link>
        </div>

        <style jsx>{`
          .order-success-page {
            min-height: 80vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background: var(--color-bg-secondary);
          }

          .success-container {
            text-align: center;
            max-width: 560px;
            background: var(--color-bg-primary);
            padding: 3rem 2rem;
            border-radius: var(--radius-xl);
            border: var(--border-thin);
            box-shadow: var(--shadow-card);
          }

          .success-icon {
            color: var(--color-success);
            margin-bottom: 1.5rem;
            animation: scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          @keyframes scaleIn {
            from {
              transform: scale(0) rotate(-180deg);
              opacity: 0;
            }
            to {
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
          }

          h1 {
            font-size: var(--text-3xl);
            font-weight: var(--font-bold);
            margin-bottom: 0.75rem;
            color: var(--color-text-primary);
            letter-spacing: var(--tracking-tight);
          }

          .order-id {
            font-size: var(--text-lg);
            color: var(--color-text-secondary);
            margin-bottom: 1.5rem;
            font-family: var(--font-mono);
          }

          .order-id strong {
            color: var(--color-accent);
            font-weight: var(--font-bold);
          }

          .success-message {
            font-size: var(--text-base);
            color: var(--color-text-secondary);
            margin-bottom: 2.5rem;
            line-height: var(--leading-relaxed);
          }

          .success-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-bottom: 2rem;
          }

          .btn-primary, .btn-secondary {
            display: inline-flex;
            align-items: center;
            gap: 0.625rem;
            padding: 1rem 2rem;
            border-radius: var(--radius-lg);
            font-weight: var(--font-semibold);
            font-size: var(--text-base);
            text-decoration: none;
            transition: all var(--transition-base);
            letter-spacing: var(--tracking-tight);
          }

          .btn-primary {
            background: var(--color-primary);
            color: white;
            border: 2px solid var(--color-primary);
          }

          .btn-primary:hover {
            background: var(--color-primary-light);
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
          }

          .btn-secondary {
            background: white;
            color: var(--color-primary);
            border: 2px solid var(--color-border-dark);
          }

          .btn-secondary:hover {
            background: var(--color-bg-tertiary);
            border-color: var(--color-primary);
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
          }

          .home-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--color-text-muted);
            text-decoration: none;
            font-size: var(--text-sm);
            font-weight: var(--font-medium);
            transition: color var(--transition-fast);
          }

          .home-link:hover {
            color: var(--color-accent);
          }

          @media (max-width: 640px) {
            .success-container {
              padding: 2rem 1.5rem;
            }

            h1 {
              font-size: var(--text-2xl);
            }

            .success-actions {
              flex-direction: column;
            }

            .btn-primary, .btn-secondary {
              width: 100%;
              justify-content: center;
            }
          }
        `}</style>
      </div>
    </>
  );
}
