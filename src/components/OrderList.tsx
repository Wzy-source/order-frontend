import React, { useState, useEffect, useCallback } from 'react';
import { OrderData,OrderStatus ,PaymentMode} from '../types';
import { OrderItem } from './OrderItem';
import { BACKEND_URL } from '../config'; // Use backend for fetching

interface OrderListProps {
    userPublicKey: string;
    role: 'buyer' | 'seller';
}

const statusValueMap: Record<string, OrderStatus> = {
    unpaid: OrderStatus.Unpaid,
    paid: OrderStatus.Paid,
    shipped: OrderStatus.Shipped,
    confirmed: OrderStatus.Confirmed,
    completed: OrderStatus.Completed,
    unfulfilled: OrderStatus.Unfulfilled,
};


const paymentModeValueMap: Record<string, PaymentMode> = {
    advance: PaymentMode.Advance,
    direct: PaymentMode.Direct,
};


const getPaymentModeStringFromRustObject = (rustPaymentMode:unknown):number => {
    if (typeof rustPaymentMode !== 'object' || rustPaymentMode === null || Array.isArray(rustPaymentMode)) {
        return -1;
    }
    const keys = Object.keys(rustPaymentMode);
    if (keys.length !== 1) {
        return -1;
    }
    const modeKey:string = keys[0];
    return paymentModeValueMap[modeKey];
}


// 4. The getStatusString function (can be reused or integrated)
const getStatusStringFromRustObject = (rustStatus: unknown): number => {
    if (typeof rustStatus !== 'object' || rustStatus === null || Array.isArray(rustStatus)) {
        return -1;
    }
    const keys = Object.keys(rustStatus);
    if (keys.length !== 1) {
        return -1;
    }
    const statusKey:string = keys[0];
    return statusValueMap[statusKey];
};

export const OrderList: React.FC<OrderListProps> = ({ userPublicKey, role }) => {
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // const { program } = useOrderManager(); // For direct fetching (inefficient)

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // **DEMO:** Fetch ALL orders from backend and filter client-side
            // **PRODUCTION:** Backend should provide filtered endpoint /orders?buyer=... or /orders?seller=...
            const response = await fetch(`${BACKEND_URL}/orders/all`);
            if (!response.ok) throw new Error('Failed to fetch orders from backend');
            const allOrders: OrderData[] = await response.json();

            // 将rust中order的状态映射为typescript定义的order的状态：
            const transformedOrders: OrderData[] = allOrders.map(orderFromBackend => {
                // Use the helper function to get the string status
                const stringStatus = getStatusStringFromRustObject(orderFromBackend.status);
                const stringPaymentMode = getPaymentModeStringFromRustObject(orderFromBackend.paymentMode);

                // Return a new object conforming to the OrderData interface (with string status)
                return {
                    ...orderFromBackend, // Copy all existing properties
                    status: stringStatus, // Override the status property with the transformed string
                    paymentMode:stringPaymentMode
                };
            });


            const filteredOrders = transformedOrders.filter(order =>
                (role === 'buyer' && order.buyer === userPublicKey) ||
                (role === 'seller' && order.seller === userPublicKey)
            );
            console.log(`Found ${filteredOrders.length} orders for ${role}`);
            console.log(filteredOrders);
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
                     confirmedAt: acc.account.confirmedAt.toString(),
                     completedAt: acc.account.completedAt.toString(),
                }))
                .filter(order =>
                    (role === 'buyer' && order.buyer === userPublicKey) ||
                    (role === 'seller' && order.seller === userPublicKey)
                );
            setOrders(userOrders);
            */

        } catch (err:unknown) {
            console.error("Failed to fetch orders:", err);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
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
