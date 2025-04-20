import React, { useState } from 'react';
import { Product } from '../types';
import { CreateOrderModal } from './CreateOrderModal';
import { lamportsToDecimalString } from '../utils/formatting';

interface ProductListProps {
    products: Product[];
}

export const ProductList: React.FC<ProductListProps> = ({ products }) => {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const handleBuyClick = (product: Product) => {
        setSelectedProduct(product);
    };

    const handleCloseModal = () => {
        setSelectedProduct(null);
    };

    const handleOrderCreated = (tx: string) => {
        alert(`Order creation transaction sent: ${tx}\nPlease check your orders.`);
        // Optionally refresh product list or redirect
    };

    return (
        <div>
            {products.length === 0 && <p>No products found.</p>}
            <ul style={styles.list}>
                {products.map((product) => (
                    <li key={product.id} style={styles.listItem}>
                        <div>
                            <strong>{product.name}</strong><br />
                            Price: {lamportsToDecimalString(product.priceLamports)} USDC<br />
                            <small>Seller: {product.seller}</small>
                        </div>
                        <button onClick={() => handleBuyClick(product)}>Buy</button>
                    </li>
                ))}
            </ul>
            {selectedProduct && (
                <CreateOrderModal
                    product={selectedProduct}
                    onClose={handleCloseModal}
                    onOrderCreated={handleOrderCreated}
                />
            )}
        </div>
    );
};

const styles = {
    list: { listStyle: 'none', padding: 0 },
    listItem: { border: '1px solid #ccc', marginBottom: '10px', padding: '10px', display: 'flex', alignItems: 'center', gap: '15px' },
    image: { width: '50px', height: '50px', objectFit: 'cover' },
} as const;
