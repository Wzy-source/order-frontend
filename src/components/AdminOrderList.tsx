import React, { useState, useEffect, useCallback } from 'react';
import {OrderData, OrderStatus, PaymentMode} from '../types';
import { AdminOrderItem } from './AdminOrderItem';
import { BACKEND_URL } from '../config';

const statusValueMap: Record<string, OrderStatus> = {
    unpaid: OrderStatus.Unpaid,
    paid: OrderStatus.Paid,
    shipped: OrderStatus.Shipped,
    signed: OrderStatus.Signed,
    confirmed: OrderStatus.Confirmed,
    completed: OrderStatus.Completed,
    unfulfilled: OrderStatus.Unfulfilled,
};


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


export const AdminOrderList: React.FC = () => {
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAdminOrders = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
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
            setOrders(transformedOrders);
        } catch (err: unknown) {
            console.error("Failed to fetch orders for admin:", err);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            setError(err.message || "Could not load orders.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdminOrders();
    }, [fetchAdminOrders]);

    return (
        <div>
            <h3>All Orders (Admin View)</h3>
            <button onClick={fetchAdminOrders} disabled={isLoading}>Refresh All Orders</button>
            {isLoading && <p>Loading all orders...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {!isLoading && orders.length === 0 && <p>No orders found.</p>}
            {!isLoading && orders.map(order => (
                <AdminOrderItem
                    key={order.publicKey}
                    order={order}
                    onActionComplete={fetchAdminOrders}
                />
            ))}
        </div>
    );
};
