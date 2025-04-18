import  { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import BuyerPage from './pages/BuyerPage';
import SellerPage from './pages/SellerPage';
import AdminPage from './pages/AdminPage';

function MainApp() {
    const { connected, publicKey } = useWallet();
    const [view, setView] = useState<'buyer' | 'seller' | 'admin'>('buyer'); // Simple view toggle

    if (!connected || !publicKey) {
        return <p>Please connect your wallet.</p>;
    }


    return (
        <div>
            <h2>Order Manager Demo</h2>
            <p>Connected as: {publicKey.toBase58()}</p>
            <div>
                <button onClick={() => setView('buyer')} disabled={view === 'buyer'}>Buyer View</button>
                <button onClick={() => setView('seller')} disabled={view === 'seller'}>Seller View</button>
                <button onClick={() => setView('admin')} disabled={view === 'admin'}>Admin View</button>
            </div>
            <hr />

            {view === 'buyer' && <BuyerPage />}
            {view === 'seller' && <SellerPage />}
            {view === 'admin' && <AdminPage />}

        </div>
    );
}

export default MainApp;
