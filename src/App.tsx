import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import MainApp from './MainApp';
import './App.css'; // Import App-specific styles

function App() {
    const { connected } = useWallet();

    return (
        // Outer div: This could be styled globally (e.g., body in index.css)
        // or have minimal styles. We'll add centering to the inner div.
        <div>
            {/* Add an inner container div for the main content */}
            <div className="app-content-container">
                <header className="app-header">
                    <h1 style={{ marginRight: '10px' }}>Cross-Border Payment Dapp</h1>
                    <WalletMultiButton />
                </header>

                <main className="app-main">
                    {connected ? (
                        <MainApp />
                    ) : (
                        <p className="connect-prompt">
                            Please connect your solana wallet using the button above to continue.
                        </p>
                    )}
                </main>
            </div> {/* End of app-content-container */}
        </div>
    );
}

export default App;
