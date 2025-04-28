import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { useOrderManager } from '../hooks/useOrderManager';
import { Product, PaymentMode } from '../types';
import {lamportsToDecimalString} from "../utils/formatting.ts"; // Import shared types

interface CreateOrderModalProps {
    product: Product;
    onClose: () => void;
    onOrderCreated: (txSignature: string) => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ product, onClose, onOrderCreated }) => {
    const { createOrder, connected } = useOrderManager();
    const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.Direct);
    const [advancePercentage, setAdvancePercentage] = useState<number>(30); // Default advance %
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreateOrder = async () => {
        if (!connected || isLoading) return;
        setIsLoading(true);
        setError(null);

        try {
            // Generate a simple unique trade ID for demo purposes
            // In production, this should come from the backend or a more robust system
            const randomSuffix = Math.floor(Math.random() * 10000); // Simple random part
            const tradeId = new BN(Date.now().toString() + randomSuffix.toString()); // Using timestamp as simple trade ID

            const orderAmountLamports = new BN(product.priceLamports);
            // 这里报错：
            const sellerPublicKey = new PublicKey(product.seller);

            const txSignature = await createOrder(
                tradeId,
                orderAmountLamports,
                paymentMode === PaymentMode.Advance ? { advance: {} } : { direct: {} }, // Map enum to contract structure
                paymentMode === PaymentMode.Advance ? advancePercentage : 0,
                sellerPublicKey
            );
            console.log(`Order creation successful: ${txSignature}`);
            onOrderCreated(txSignature!);
            onClose(); // Close modal on success
        } catch (err: unknown) {
            console.error("Order creation failed:", err);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            setError(err.message || "Failed to create order.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h3>Create Order for: {product.name}</h3>
                <p>Seller: {product.seller}</p>
                <p>Price: {lamportsToDecimalString(product.priceLamports)} USDC</p>
                <hr />
                <div>
                    <label>
                        Payment Mode:
                        <select
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(parseInt(e.target.value) as PaymentMode)}
                            disabled={isLoading}
                        >
                            <option value={PaymentMode.Direct}>Direct Payment</option>
                            <option value={PaymentMode.Advance}>Advance Payment</option>
                        </select>
                    </label>
                </div>
                {paymentMode === PaymentMode.Advance && (
                    <div>
                        <label>
                            Advance Percentage (%):
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={advancePercentage}
                                onChange={(e) => setAdvancePercentage(parseInt(e.target.value))}
                                disabled={isLoading}
                            />
                        </label>
                    </div>
                )}
                {error && <p style={{ color: 'red' }}>Error: {error}</p>}
                <div style={styles.modalActions}>
                    <button onClick={handleCreateOrder} disabled={isLoading || !connected}>
                        {isLoading ? 'Creating...' : 'Confirm & Create Order'}
                    </button>
                    <button onClick={onClose} disabled={isLoading}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

// Basic inline styles for demo
const styles = {
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    modalContent: { background: 'white', padding: '20px', borderRadius: '5px', minWidth: '300px' },
    modalActions: { marginTop: '15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
} as const; // Use 'as const' for better style type inference
