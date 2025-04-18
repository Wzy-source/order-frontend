import React, { useState } from 'react';
import { OrderData, OrderStatus } from '../types';
import { lamportsToDecimalString } from '../utils/formatting';
import { BACKEND_URL } from '../config';

interface AdminOrderItemProps {
    order: OrderData;
    onActionComplete: () => void;
}

const getStatusString = (status: OrderStatus): string => OrderStatus[status] || 'Unknown';

export const AdminOrderItem: React.FC<AdminOrderItemProps> = ({ order, onActionComplete }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSetState = async (newState: 'Shipped' | 'Signed') => {
        if (isLoading) return;
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${BACKEND_URL}/admin/orders/${order.tradeId}/set-state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newState }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }
            alert(`Successfully set status to ${newState}. Tx: ${result.signature}`);
            onActionComplete(); // Refresh list
        } catch (err: any) {
            console.error(`Failed to set status to ${newState}:`, err);
            setError(err.message || `Failed to set status to ${newState}.`);
        } finally {
            setIsLoading(false);
        }
    };

    const canMarkShipped = order.status === OrderStatus.Paid;
    const canMarkSigned = order.status === OrderStatus.Shipped;

    return (
        <div style={styles.orderItem}>
            <h4>Order (Trade ID: {order.tradeId})</h4>
            <p>Status: <strong>{getStatusString(order.status)}</strong></p>
            <p>Amount: {lamportsToDecimalString(order.orderAmount)} USDC</p>
            <p><small>Buyer: {order.buyer}</small></p>
            <p><small>Seller: {order.seller}</small></p>
            {/* Display other relevant details */}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            <div style={styles.actions}>
                {canMarkShipped && <button onClick={() => handleSetState('Shipped')} disabled={isLoading}>Mark as Shipped</button>}
                {canMarkSigned && <button onClick={() => handleSetState('Signed')} disabled={isLoading}>Mark as Signed</button>}
            </div>
        </div>
    );
};

const styles = {
    orderItem: { border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '5px' },
    actions: { marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' },
} as const;
