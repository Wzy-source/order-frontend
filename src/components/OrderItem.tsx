import React, {useState} from 'react';
import {useWallet} from '@solana/wallet-adapter-react';
import {BN} from '@coral-xyz/anchor';
import {OrderData, OrderStatus, PaymentMode} from '../types';
import {useOrderManager} from '../hooks/useOrderManager';
import {lamportsToDecimalString} from '../utils/formatting';

interface OrderItemProps {
    order: OrderData;
    role: 'buyer' | 'seller' | 'admin';
    onActionComplete: () => void; // Callback to refresh list after action
}

// Calculate milliseconds in a day for clarity
const MSEC_IN_DAY = 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_IN_MSEC = 14 * MSEC_IN_DAY; // 默认14天 TODO 改为从区块链config中读取

// Helper to get status string
const getStatusString = (status: OrderStatus): string => {
    return OrderStatus[status] || 'Unknown';
};

export const OrderItem: React.FC<OrderItemProps> = ({order, role, onActionComplete}) => {
    const {publicKey} = useWallet();
    const {payOrder, redeemOrder, claimAdvance, claimOrder} = useOrderManager();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAction = async (actionFn: (tradeId: BN) => Promise<string | null>) => {
        if (!publicKey || isLoading) return;
        setIsLoading(true);
        setError(null);
        try {
            const txSignature = await actionFn(new BN(order.tradeId));
            if (txSignature) {
                alert(`Action successful! Transaction: ${txSignature}`);
                onActionComplete(); // Refresh the list
            } else {
                setError("Action failed. Check console for details.");
            }
        } catch (err: unknown) {
            console.error("Action failed:", err);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            setError(err.message || "An error occurred during the action.");
        } finally {
            setIsLoading(false);
        }
    };


    const canPay = role === 'buyer' && order.status === OrderStatus.Unpaid;
    const canRedeem = role === 'buyer' && order.status === OrderStatus.Paid; // Add time check logic here or in hook if needed
    const canShowRedeemTime = order.status === OrderStatus.Paid;
    const isPaid = order.status !== OrderStatus.Unpaid;
    const isShipped = order.status !== OrderStatus.Unpaid && order.status!==OrderStatus.Paid;
    const isConfirmed = order.status == OrderStatus.Confirmed || order.status == OrderStatus.Completed;
    const isCompleted = order.status == OrderStatus.Completed;
    const canClaimAdvance = role === 'seller' &&
        order.paymentMode === PaymentMode.Advance &&
        (order.status === OrderStatus.Shipped || order.status === OrderStatus.Confirmed) &&
        new BN(order.claimedAmount).isZero(); // Only if advance not claimed
    const canClaimOrder = role === 'seller' &&
        order.status === OrderStatus.Confirmed; // Add timeout check logic if needed


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
            <p>Paid: {lamportsToDecimalString(order.paidAmount)} USDC</p>
            <p>Claimed: {lamportsToDecimalString(order.claimedAmount)} USDC</p>
            <p>Escrow Account: 4dT8ogcUysTuxwk2UUYbZ9izaxqbnGzukdVvaus6QobN</p>
            <p>Mode: {order.paymentMode === PaymentMode.Advance ? `Advance (${order.advancePercentage}%)` : 'Direct'}</p>
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

            {error && <p style={{color: 'red'}}>Error: {error}</p>}

            <div style={styles.actions}>
                {/* Buyer Actions */}
                {canPay && <button onClick={() => handleAction(payOrder)} disabled={isLoading}>Pay Order</button>}
                {/* Add button for Redeem based on canRedeem and timeout check */}
                {canRedeem &&
                  <button onClick={() => handleAction(redeemOrder)} disabled={isLoading}>Redeem (If Timeout)</button>}

                {/* Seller Actions */}
                {canClaimAdvance &&
                  <button onClick={() => handleAction(claimAdvance)} disabled={isLoading}>Claim Advance</button>}
                {canClaimOrder &&
                  <button onClick={() => handleAction(claimOrder)} disabled={isLoading}>Claim Final Payment</button>}
            </div>
        </div>
    );
};

const styles = {
    orderItem: {border: '1px solid #eee', padding: '15px', marginBottom: '10px', borderRadius: '5px'},
    actions: {marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap'},
} as const;
