import { useWallet } from '@solana/wallet-adapter-react';
import { RegisterProductForm } from '../components/RegisterProductForm';
import { OrderList } from '../components/OrderList';

function SellerPage() {
    const { publicKey } = useWallet();

    return (
        <div>
            <h2>Seller Dashboard</h2>
            <RegisterProductForm />

            <hr style={{ margin: '30px 0' }} />

            <h3>Your Orders as Seller</h3>
            {publicKey && <OrderList userPublicKey={publicKey.toBase58()} role="seller" />}
            {!publicKey && <p>Connect wallet to see your orders.</p>}
        </div>
    );
}
export default SellerPage;
