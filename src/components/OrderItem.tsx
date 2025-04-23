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
    const canClaimAdvance = role === 'seller' &&
        order.paymentMode === PaymentMode.Advance &&
        (order.status === OrderStatus.Shipped || order.status === OrderStatus.Confirmed) &&
        new BN(order.claimedAmount).isZero(); // Only if advance not claimed
    const canClaimOrder = role === 'seller' &&
        order.status === OrderStatus.Confirmed; // Add timeout check logic if needed


    return (
        <div style={styles.orderItem}>
            <h4>Order (Trade ID: {order.tradeId})</h4>
            <p>Status: <strong>{getStatusString(order.status as number)}</strong></p>
            <p>Amount: {lamportsToDecimalString(order.orderAmount)} USDC</p>
            <p>Paid: {lamportsToDecimalString(order.paidAmount)} USDC</p>
            <p>Claimed: {lamportsToDecimalString(order.claimedAmount)} USDC</p>
            <p>Mode: {order.paymentMode === PaymentMode.Advance ? `Advance (${order.advancePercentage}%)` : 'Direct'}</p>
            <p><small>Buyer: {order.buyer}</small></p>
            <p><small>Seller: {order.seller}</small></p>
            <p><small>Created: {new Date(parseInt(order.createdAt) * 1000).toLocaleString()}</small></p>
            {/* Display other timestamps if needed */}

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
