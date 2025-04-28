import React, { useState } from 'react';
import { OrderData, OrderStatus } from '../types';
import { lamportsToDecimalString } from '../utils/formatting';
import { BACKEND_URL } from '../config';

interface AdminOrderItemProps {
    order: OrderData;
    onActionComplete: () => void;
}

// Calculate milliseconds in a day for clarity
const MSEC_IN_DAY = 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_IN_MSEC = 14 * MSEC_IN_DAY; // 默认14天 TODO 改为从区块链config中读取

const getStatusString = (status: OrderStatus): string => OrderStatus[status] || 'Unknown';

export const AdminOrderItem: React.FC<AdminOrderItemProps> = ({ order, onActionComplete }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSetState = async (newState: 'Shipped' | 'Confirmed') => {
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
        } catch (err: unknown) {
            console.error(`Failed to set status to ${newState}:`, err);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            setError(err.message || `Failed to set status to ${newState}.`);
        } finally {
            setIsLoading(false);
        }
    };

    const canMarkShipped = order.status === OrderStatus.Paid;
    const canMarkConfirmed = order.status === OrderStatus.Shipped;
    const canShowRedeemTime = order.status === OrderStatus.Paid;
    const isPaid = order.status !== OrderStatus.Unpaid;
    const isShipped = order.status !== OrderStatus.Unpaid && order.status!==OrderStatus.Paid;
    const isConfirmed = order.status == OrderStatus.Confirmed || order.status == OrderStatus.Completed;
    const isCompleted = order.status == OrderStatus.Completed;

    // Calculate the redeemable time safely
    let redeemableTimestamp = 0;
    if (order.paidAt && parseInt(order.paidAt) > 0) {
        redeemableTimestamp = parseInt(order.paidAt) * 1000 + FOURTEEN_DAYS_IN_MSEC;
    }

    return (
        <div style={styles.orderItem}>
            <h4>Order (Trade ID: {order.tradeId})</h4>
            <p>Status: <strong>{getStatusString(order.status as number)}</strong></p>
            <p>Amount: {lamportsToDecimalString(order.orderAmount)} USDC</p>
            <p>Escrow Account: 4dT8ogcUysTuxwk2UUYbZ9izaxqbnGzukdVvaus6QobN</p>
            <p><small>Buyer: {order.buyer}</small></p>
            <p><small>Seller: {order.seller}</small></p>
            <p><small>Created: {new Date(parseInt(order.createdAt) * 1000).toLocaleString()}</small></p>
            {isPaid &&
              <p><small>Paid: {new Date(parseInt(order.paidAt) * 1000).toLocaleString()}</small></p>
            }
            {isShipped &&
              <p><small>Shipped: {new Date(parseInt(order.shippedAt) * 1000).toLocaleString()}</small></p>
            }
            {isConfirmed &&
              <p><small>Confirmed: {new Date(parseInt(order.confirmedAt) * 1000).toLocaleString()}</small></p>
            }
            {isCompleted &&
              <p><small>Completed: {new Date(parseInt(order.completedAt) * 1000).toLocaleString()}</small></p>
            }
            {canShowRedeemTime &&
              <p><small>Buyer Redeemable Time: {new Date(redeemableTimestamp).toLocaleString()}</small></p>
            }
            {/* Display other relevant details */}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            <div style={styles.actions}>
                {canMarkShipped && <button onClick={() => handleSetState('Shipped')} disabled={isLoading}>Mark as Shipped</button>}
                {canMarkConfirmed && <button onClick={() => handleSetState('Confirmed')} disabled={isLoading}>Mark as Confirmed</button>}
            </div>
        </div>
    );
};

const styles = {
    orderItem: { border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '5px' },
    actions: { marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' },
} as const;
