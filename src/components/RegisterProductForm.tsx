import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BACKEND_URL } from '../config';
import { decimalStringToLamports } from '../utils/formatting';

export const RegisterProductForm: React.FC = () => {
    const { publicKey } = useWallet();
    const [name, setName] = useState('');
    const [priceDecimal, setPriceDecimal] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publicKey || isLoading) return;
        setIsLoading(true);
        setMessage(null);

        const priceLamports = decimalStringToLamports(priceDecimal);

        try {
            const response = await fetch(`${BACKEND_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    priceLamports: priceLamports.toString(),
                    seller: publicKey.toBase58(), // Use connected wallet as seller
                    imageUrl,
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }
            setMessage(`Product "${result.name}" registered successfully!`);
            // Clear form
            setName('');
            setPriceDecimal('');
            setImageUrl('');
        } catch (err: any) {
            console.error("Failed to register product:", err);
            setMessage(`Error: ${err.message || "Failed to register product."}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={styles.form}>
            <h3>Register New Product</h3>
            {!publicKey && <p style={{color: 'orange'}}>Connect wallet to register products.</p>}
            <div>
                <label>Product Name: </label>
                <input style={{ backgroundColor: 'white',color: 'black' }} type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={!publicKey || isLoading}/>
            </div>
            <div>
                <label>Price (USDC): </label>
                <input style={{ backgroundColor: 'white',color: 'black' }} type="number" step="0.000001" value={priceDecimal} onChange={(e) => setPriceDecimal(e.target.value)} required disabled={!publicKey || isLoading}/>
            </div>
            <div>
                <label>Image URL (Optional): </label>
                <input style={{ backgroundColor: 'white',color: 'black' }} type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} disabled={!publicKey || isLoading}/>
            </div>
            <button style={{marginTop:'10px'}} type="submit" disabled={!publicKey || isLoading}>
                {isLoading ? 'Registering...' : 'Register Product'}
            </button>
            {message && <p>{message}</p>}
        </form>
    );
};

const styles = {
    form: { border: '1px solid #aaabbb', padding: '15px', marginBottom: '20px' },
} as const;
