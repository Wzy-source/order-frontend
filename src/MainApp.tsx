import  { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import BuyerPage from './pages/BuyerPage'; // Assuming these exist
import SellerPage from './pages/SellerPage'; // Assuming these exist
import AdminPage from './pages/AdminPage'; // Assuming these exist

function MainApp() {
    // useWallet hook will work because providers are set up in main.tsx/WalletAdapterSetup
    const { publicKey } = useWallet();
    const [view, setView] = useState<'buyer' | 'seller' | 'admin'>('buyer');

    // This check is now optional, as App.tsx handles the conditional rendering
    // if (!publicKey) {
    //     // This part will technically not be reached if App.tsx correctly gates rendering
    //     return <p>Wallet disconnected unexpectedly.</p>;
    // }

    return (
        <div>
            <h2>Order Manager Demo</h2>
            {/* Ensure publicKey exists before using it */}
            <p>Connected as: {publicKey ? publicKey.toBase58() : 'Loading...'}</p>
            <div>
                <button
                    style={{ marginRight: '10px' }} // Adjust '10px' as needed
                    onClick={() => setView('buyer')}
                    disabled={view === 'buyer'}
                >
                    Buyer View
                </button>
                <button
                    style={{ marginRight: '10px' }} // Adjust '10px' as needed
                    onClick={() => setView('seller')}
                    disabled={view === 'seller'}
                >
                    Seller View
                </button>
                {
                    publicKey?.toString() == "Aqkf36U1AicRZrRzHDon7dfa98XsrMHtxnAVyfh7Y4B4" &&
                  <button
                    onClick={() => setView('admin')}
                    disabled={view === 'admin'}
                  >
                    Admin View
                  </button>
                }
            </div>
            <hr />

            {view === 'buyer' && <BuyerPage />}
            {view === 'seller' && <SellerPage />}
            {view === 'admin' && <AdminPage />}

        </div>
    );
}

export default MainApp;
