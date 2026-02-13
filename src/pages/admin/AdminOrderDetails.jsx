import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, MapPin, Phone, Mail, Package, CreditCard, Calendar, CheckCircle, Clock, Truck, User } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

export default function AdminOrderDetails() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchOrder = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*, profiles(full_name, email), order_items(*, product:products(*))')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching order:', error);
        } else {
            // Normalize items similar to OrderTracking
            const normalizedOrder = {
                ...data,
                items: data.order_items ? data.order_items.map(item => ({
                    ...item,
                    product: item.product
                })) : []
            };
            setOrder(normalizedOrder);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const updateStatus = async (newStatus) => {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
        if (!error) {
            setOrder({ ...order, status: newStatus });
            alert('Order status updated!');
        }
    };

    const markPaid = async () => {
        if (confirm('Confirm payment received?')) {
            const { error } = await supabase
                .from('orders')
                .update({ payment_status: 'paid', status: 'processing' })
                .eq('id', id);

            if (!error) fetchOrder();
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'badge--warning',
            processing: 'badge--info',
            shipped: 'badge--primary',
            delivered: 'badge--success',
            cancelled: 'badge--danger'
        };
        return <span className={`badge ${styles[status] || ''}`}>{status}</span>;
    };

    if (loading) return <div className="admin-page"><div className="admin-container">Loading...</div></div>;
    if (!order) return <div className="admin-page"><div className="admin-container">Order not found</div></div>;

    return (
        <div className="admin-page">
            <div className="admin-container">
                <div style={{ marginBottom: 'var(--space-6)' }}>
                    <Link to="/admin/orders" className="btn btn--ghost btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <ChevronLeft size={16} /> Back to Orders
                    </Link>
                </div>

                <div className="admin-header">
                    <div>
                        <h1 style={{ marginBottom: 'var(--space-2)' }}>Order #{order.id}</h1>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                            <div className="text-sm text-muted flex items-center gap-2">
                                <Calendar size={14} /> {new Date(order.created_at).toLocaleString()}
                            </div>
                            {getStatusBadge(order.status)}
                            <span className={`badge ${order.payment_status === 'paid' ? 'badge--success' : 'badge--warning'}`}>
                                Payment: {order.payment_status}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        {/* Status Actions */}
                        <select
                            className="input"
                            style={{ width: 'auto' }}
                            value={order.status}
                            onChange={(e) => updateStatus(e.target.value)}
                        >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>

                        {order.payment_status === 'verification_pending' && (
                            <button className="btn btn--primary" onClick={markPaid}>
                                <CheckCircle size={16} style={{ marginRight: '8px' }} /> Verify Payment
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid--2" style={{ alignItems: 'start' }}>
                    {/* Left Column: Items */}
                    <div className="panel">
                        <h3 className="panel__title">Order Items ({order.items.length})</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            {order.items.map((item, i) => {
                                const product = item.product || {};
                                return (
                                    <div key={i} style={{ display: 'flex', gap: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: 'var(--border-thin)' }}>
                                        <img
                                            src={product.images?.[0]}
                                            alt={product.name}
                                            style={{ width: '60px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', background: '#eee' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: '4px' }}>
                                                {product.name}
                                            </h4>
                                            <div className="text-sm text-muted">
                                                Size: {item.size} | Color: {item.color?.name || item.color}
                                            </div>
                                            <div className="text-sm font-semibold mt-1">
                                                {formatPrice(item.price)} x {item.quantity}
                                            </div>
                                        </div>
                                        <div className="font-bold">
                                            {formatPrice(item.price * item.quantity)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: 'var(--border-thin)' }}>
                            <div className="flex flex--between mb-2 text-sm">
                                <span>Subtotal</span>
                                <span>{formatPrice(order.total / 1.18)}</span>
                            </div>
                            <div className="flex flex--between mb-2 text-sm">
                                <span>Tax (18%)</span>
                                <span>{formatPrice(order.total - (order.total / 1.18))}</span>
                            </div>
                            <div className="flex flex--between mb-2 text-sm">
                                <span>Shipping</span>
                                <span>Free</span>
                            </div>
                            <div className="flex flex--between font-bold text-lg mt-4">
                                <span>Total</span>
                                <span>{formatPrice(order.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                        {/* Customer */}
                        <div className="panel">
                            <h3 className="panel__title"><User size={18} /> Customer Details</h3>
                            <div className="flex flex--column gap-2 text-sm">
                                <strong className="text-base">{order.profiles?.full_name || 'Guest User'}</strong>
                                <div className="flex items-center gap-2 text-muted">
                                    <Mail size={14} /> {order.profiles?.email}
                                </div>
                                <div className="flex items-center gap-2 text-muted">
                                    <Phone size={14} /> {order.address?.phone}
                                </div>
                            </div>
                        </div>

                        {/* Shipping */}
                        <div className="panel">
                            <h3 className="panel__title"><Truck size={18} /> Shipping Address</h3>
                            <div className="text-sm text-muted leading-relaxed">
                                <p className="font-semibold text-primary mb-1">{order.address?.name}</p>
                                <p>{order.address?.street}</p>
                                <p>{order.address?.city}, {order.address?.state}</p>
                                <p>{order.address?.pin}</p>
                            </div>
                        </div>

                        {/* Payment */}
                        <div className="panel">
                            <h3 className="panel__title"><CreditCard size={18} /> Payment Information</h3>
                            <div className="grid grid--2 text-sm">
                                <div>
                                    <label className="text-xs text-muted uppercase">Method</label>
                                    <p className="font-semibold capitalize">{order.payment_method === 'upi' ? 'UPI / QR' : 'Cash on Delivery'}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-muted uppercase">Status</label>
                                    <p className={`font-semibold capitalize ${order.payment_status === 'paid' ? 'text-success' :
                                            order.payment_status === 'verification_pending' ? 'text-warning' : 'text-info'
                                        }`}>
                                        {order.payment_status === 'verification_pending' ? 'Verification Pending' : order.payment_status}
                                    </p>
                                </div>
                                {order.transaction_id && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label className="text-xs text-muted uppercase">Transaction Ref</label>
                                        <p className="font-mono bg-gray-100 p-1 rounded text-xs">{order.transaction_id}</p>
                                    </div>
                                )}
                            </div>

                            {order.payment_method === 'upi' && order.payment_status !== 'paid' && (
                                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                    <strong>Admin Note:</strong> Check your bank statement for <b>{formatPrice(order.total)}</b> from this user before marking as paid.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .panel {
                    background: var(--color-bg-primary);
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-lg);
                    padding: var(--space-6);
                }
                .panel__title {
                    font-size: var(--text-base);
                    font-weight: var(--font-semibold);
                    margin-bottom: var(--space-4);
                    padding-bottom: var(--space-3);
                    border-bottom: var(--border-thin);
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    color: var(--color-text-primary);
                }
                .text-muted { color: var(--color-text-muted); }
                .text-sm { font-size: var(--text-sm); }
                .text-xs { font-size: var(--text-xs); }
                .font-bold { font-weight: var(--font-bold); }
                .font-semibold { font-weight: var(--font-semibold); }
                .font-mono { font-family: var(--font-mono); }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .gap-2 { gap: 0.5rem; }
                .mb-1 { margin-bottom: 0.25rem; }
                .mb-2 { margin-bottom: 0.5rem; }
                .mt-1 { margin-top: 0.25rem; }
                .mt-4 { margin-top: 1rem; }
                .uppercase { text-transform: uppercase; }
                .capitalize { text-transform: capitalize; }
                .bg-gray-100 { background-color: #f3f4f6; }
                .p-1 { padding: 0.25rem; }
                .rounded { border-radius: 0.25rem; }
                .text-success { color: var(--color-success); }
                .text-warning { color: var(--color-warning); }
                .text-info { color: var(--color-info); }
                .bg-yellow-50 { background-color: #fefce8; }
                .border-yellow-200 { border-color: #fef08a; }
                .text-yellow-800 { color: #854d0e; }
            `}</style>
        </div>
    );
}
