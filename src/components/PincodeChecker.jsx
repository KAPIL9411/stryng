import { useState } from 'react';
import { MapPin, Check, X, Loader } from 'lucide-react';
import { checkPincodeServiceability } from '../api/addresses.api';

export default function PincodeChecker({ onServiceabilityCheck }) {
  const [pincode, setPincode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheck = async (e) => {
    e.preventDefault();

    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setResult({
        is_serviceable: false,
        message: 'Please enter a valid 6-digit pincode',
      });
      return;
    }

    setChecking(true);
    setResult(null);

    try {
      const response = await checkPincodeServiceability(pincode);

      if (response.success) {
        setResult(response.data);
        if (onServiceabilityCheck) {
          onServiceabilityCheck(response.data);
        }
      } else {
        setResult({
          is_serviceable: false,
          message: 'Error checking pincode. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setResult({
        is_serviceable: false,
        message: 'Error checking pincode. Please try again.',
      });
    } finally {
      setChecking(false);
    }
  };

  const handlePincodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPincode(value);
    if (result) setResult(null);
  };

  return (
    <div className="pincode-checker">
      <form onSubmit={handleCheck} className="pincode-checker__form">
        <div className="pincode-checker__input-group">
          <MapPin size={18} className="pincode-checker__icon" />
          <input
            type="text"
            value={pincode}
            onChange={handlePincodeChange}
            placeholder="Enter pincode"
            className="pincode-checker__input"
            maxLength={6}
            disabled={checking}
          />
          <button
            type="submit"
            className="pincode-checker__button"
            disabled={checking || pincode.length !== 6}
          >
            {checking ? <Loader size={16} className="spinner" /> : 'Check'}
          </button>
        </div>
      </form>

      {result && (
        <div
          className={`pincode-checker__result ${result.is_serviceable ? 'success' : 'error'}`}
        >
          <div className="pincode-checker__result-icon">
            {result.is_serviceable ? <Check size={18} /> : <X size={18} />}
          </div>
          <div className="pincode-checker__result-content">
            <p className="pincode-checker__result-message">{result.message}</p>
            {result.is_serviceable && (
              <div className="pincode-checker__result-details">
                <p className="pincode-checker__result-location">
                  {result.city}, {result.state}
                </p>
                <p className="pincode-checker__result-delivery">
                  Estimated delivery: {result.estimated_delivery_days} days
                </p>
                {result.is_cod_available && (
                  <p className="pincode-checker__result-cod">
                    Cash on Delivery available
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
                .pincode-checker {
                    margin: 1.5rem 0;
                }

                .pincode-checker__form {
                    width: 100%;
                }

                .pincode-checker__input-group {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 1rem;
                    border: 1px solid var(--color-border);
                    border-radius: 0;
                    background: var(--color-bg-primary);
                    transition: border-color 0.3s ease;
                }

                .pincode-checker__input-group:focus-within {
                    border-color: var(--color-text-primary);
                }

                .pincode-checker__icon {
                    color: var(--color-text-secondary);
                    flex-shrink: 0;
                }

                .pincode-checker__input {
                    flex: 1;
                    border: none;
                    outline: none;
                    font-size: 0.9375rem;
                    font-family: var(--font-primary);
                    background: transparent;
                    color: var(--color-text-primary);
                }

                .pincode-checker__input::placeholder {
                    color: var(--color-text-secondary);
                }

                .pincode-checker__button {
                    padding: 0.5rem 1.25rem;
                    background: var(--color-text-primary);
                    color: white;
                    border: none;
                    border-radius: 0;
                    font-size: 0.875rem;
                    font-weight: var(--font-semibold);
                    font-family: var(--font-primary);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 70px;
                }

                .pincode-checker__button:hover:not(:disabled) {
                    background: var(--color-accent);
                    color: var(--color-text-primary);
                }

                .pincode-checker__button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .pincode-checker__result {
                    display: flex;
                    gap: 0.75rem;
                    padding: 1rem;
                    margin-top: 1rem;
                    border-radius: 0;
                    animation: slideDown 0.3s ease;
                }

                .pincode-checker__result.success {
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                }

                .pincode-checker__result.error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                }

                .pincode-checker__result-icon {
                    flex-shrink: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                }

                .pincode-checker__result.success .pincode-checker__result-icon {
                    background: rgba(34, 197, 94, 0.2);
                    color: rgb(34, 197, 94);
                }

                .pincode-checker__result.error .pincode-checker__result-icon {
                    background: rgba(239, 68, 68, 0.2);
                    color: rgb(239, 68, 68);
                }

                .pincode-checker__result-content {
                    flex: 1;
                }

                .pincode-checker__result-message {
                    font-size: 0.9375rem;
                    font-weight: var(--font-medium);
                    color: var(--color-text-primary);
                    margin: 0 0 0.5rem 0;
                }

                .pincode-checker__result-details {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }

                .pincode-checker__result-location,
                .pincode-checker__result-delivery,
                .pincode-checker__result-cod {
                    font-size: 0.8125rem;
                    color: var(--color-text-secondary);
                    margin: 0;
                }

                .pincode-checker__result-cod {
                    color: rgb(34, 197, 94);
                    font-weight: var(--font-medium);
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @media (max-width: 480px) {
                    .pincode-checker__input-group {
                        padding: 0.625rem 0.875rem;
                    }

                    .pincode-checker__button {
                        padding: 0.5rem 1rem;
                        font-size: 0.8125rem;
                    }

                    .pincode-checker__result {
                        padding: 0.875rem;
                    }
                }
            `}</style>
    </div>
  );
}
