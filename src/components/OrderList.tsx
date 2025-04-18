import React, { useState, useEffect, useCallback } from 'react';
import { OrderData } from '../types';
import { OrderItem } from './OrderItem';
import { BACKEND_URL } from '../config'; // Use backend for fetching

interface OrderListProps {
    userPublicKey: string;
    role: 'buyer' | 'seller';
}

export const OrderList: React.FC<OrderListProps> = ({ userPublicKey, role }) => {
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // const { program } = useOrderManager(); // For direct fetching (inefficient)

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        console.log(`Fetching orders for ${role}: ${userPublicKey}`);

        try {
            // **DEMO:** Fetch ALL orders from backend and filter client-side
            // **PRODUCTION:** Backend should provide filtered endpoint /orders?buyer=... or /orders?seller=...
            const response = await fetch(`${BACKEND_URL}/orders/all`);
            if (!response.ok) throw new Error('Failed to fetch orders from backend');
            const allOrders: OrderData[] = await response.json();

            const filteredOrders = allOrders.filter(order =>
                (role === 'buyer' && order.buyer === userPublicKey) ||
                (role === 'seller' && order.seller === userPublicKey)
            );
            console.log(`Found ${filteredOrders.length} orders for ${role}`);
            setOrders(filteredOrders);

            /* // **Alternative (Direct Fetch - Inefficient):**
            if (!program) throw new Error("Program not loaded");
            const allAccounts = await program.account.orderState.all();
            const userOrders = allAccounts
                .map(acc => ({ // Convert to OrderData format
                    publicKey: acc.publicKey.toBase58(),
                    buyer: acc.account.buyer.toBase58(),
                    seller: acc.account.seller.toBase58(),
                     mint: acc.account.mint.toBase58(),
                    tradeId: acc.account.tradeId.toString(),
                     orderAmount: acc.account.orderAmount.toString(),
                     paidAmount: acc.account.paidAmount.toString(),
                     claimedAmount: acc.account.claimedAmount.toString(),
                     paymentMode: acc.account.paymentMode,
                     advancePercentage: acc.account.advancePercentage,
                     status: acc.account.status,
                     createdAt: acc.account.createdAt.toString(),
                     paidAt: acc.account.paidAt.toString(),
                     shippedAt: acc.account.shippedAt.toString(),
                     signedAt: acc.account.signedAt.toString(),
                     confirmedAt: acc.account.confirmedAt.toString(),
                     completedAt: acc.account.completedAt.toString(),
                }))
                .filter(order =>
                    (role === 'buyer' && order.buyer === userPublicKey) ||
                    (role === 'seller' && order.seller === userPublicKey)
                );
            setOrders(userOrders);
            */

        } catch (err: any) {
            console.error("Failed to fetch orders:", err);
            setError(err.message || "Could not load orders.");
        } finally {
            setIsLoading(false);
        }
    }, [userPublicKey, role /*, program - if direct fetch */]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    return (
        <div>
            <button onClick={fetchOrders} disabled={isLoading}>Refresh Orders</button>
            {isLoading && <p>Loading orders...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {!isLoading && orders.length === 0 && <p>No orders found for your role.</p>}
            {!isLoading && orders.map(order => (
                <OrderItem
                    key={order.publicKey} // Use PDA address as key
                    order={order}
                    role={role}
                    onActionComplete={fetchOrders} // Refresh list after an action
                />
            ))}
        </div>
    );
};
