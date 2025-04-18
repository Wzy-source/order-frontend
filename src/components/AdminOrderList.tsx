import React, { useState, useEffect, useCallback } from 'react';
import { OrderData } from '../types';
import { AdminOrderItem } from './AdminOrderItem';
import { BACKEND_URL } from '../config';

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
            setOrders(allOrders);
        } catch (err: any) {
            console.error("Failed to fetch orders for admin:", err);
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
