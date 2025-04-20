import  { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ProductList } from '../components/ProductList'; // Import component
import { OrderList } from '../components/OrderList';   // Import component
import { Product } from '../types';
import { BACKEND_URL } from '../config';

function BuyerPage() {
    const { publicKey } = useWallet();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    const [errorProducts, setErrorProducts] = useState<string | null>(null);

    // Effect to fetch products (same as before)
    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoadingProducts(true);
            setErrorProducts(null);
            try {
                const response = await fetch(`${BACKEND_URL}/products`);
                if (!response.ok) throw new Error('Failed to fetch products');
                const data = await response.json();
                setProducts(data);
            } catch (err: unknown) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                setErrorProducts(err.message || 'An error occurred');
            } finally {
                setIsLoadingProducts(false);
            }
        };
        fetchProducts();
    }, []);


    return (
        <div>
            <h2>Buyer Dashboard</h2>
            <h3>Products for Sale</h3>
            {isLoadingProducts && <p>Loading products...</p>}
            {errorProducts && <p style={{ color: 'red' }}>Error loading products: {errorProducts}</p>}
            {!isLoadingProducts && !errorProducts && <ProductList products={products} />}

            <hr style={{ margin: '30px 0' }} />

            <h3>Your Orders as Buyer</h3>
            {publicKey && <OrderList userPublicKey={publicKey.toBase58()} role="buyer" />}
            {!publicKey && <p>Connect wallet to see your orders.</p>}
        </div>
    );
}
export default BuyerPage;
