import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import WalletAdapterSetup from './WalletAdapterSetup.tsx'; // Import the setup component
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {/* Use the imported setup component */}
        <WalletAdapterSetup>
            <App />
        </WalletAdapterSetup>
    </React.StrictMode>,
);
