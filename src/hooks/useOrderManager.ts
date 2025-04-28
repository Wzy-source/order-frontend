import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import * as anchor from "@coral-xyz/anchor";
import {Program, AnchorProvider, BN} from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { useMemo, useCallback } from 'react';

// --- Import Config and Types ---
import { PROGRAM_ID, USDC_MINT_ADDRESS, CENTRAL_VAULT_TOKEN_ACCOUNT, BACKEND_URL } from '../config'; // Import constants
import idlJson from '../idl/order_manager.json'; // Import the IDL JSON
import { OrderManager } from '../types/order_manager'; // Import generated types
import { OrderData } from '../types'; // Import shared types


// --- Seed Constants ---
const CONFIG_SEED = Buffer.from("config");
const VAULT_AUTHORITY_SEED = Buffer.from("vault_authority");

export const useOrderManager = () => {
    const { connection } = useConnection();
    const wallet = useAnchorWallet(); // Gets the connected wallet adapter's wallet object

    // --- Create Anchor Provider and Program instance ---
    // These will be undefined until the wallet is connected.
    const provider = useMemo(() => {
        if (!wallet) return undefined;
        // Use the connected wallet to create the provider
        return new AnchorProvider(connection, wallet, {
            commitment: "confirmed",
            preflightCommitment:"confirmed",
            skipPreflight:true,
        });
    }, [connection, wallet]);

    const program = useMemo(() => {
        if (!provider) return undefined;
        // Create the program instance using the IDL, Program ID, and Provider
        return  new Program<OrderManager>(idlJson as OrderManager,provider);
    }, [provider]);

    // --- PDA Calculation Helpers ---
    // Use useCallback to prevent recalculation on every render unless dependencies change
    const findConfigPDA = useCallback((): [PublicKey, number] => {
        return PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID);
    }, []); // PROGRAM_ID is constant, no dependencies needed

    const findOrderStatePDA = useCallback((tradeId: anchor.BN): [PublicKey, number] => {
        // Ensure tradeId is correctly converted to a Buffer for the seed
        return PublicKey.findProgramAddressSync(
            [Buffer.from("order"), tradeId.toArrayLike(Buffer, "le", 8)],
            PROGRAM_ID
        );
    }, []); // PROGRAM_ID is constant

    const findVaultAuthorityPDA = useCallback((): [PublicKey, number] => {
        return PublicKey.findProgramAddressSync([VAULT_AUTHORITY_SEED], PROGRAM_ID);
    }, []); // PROGRAM_ID is constant

    // --- Interaction Functions ---
    // Each function checks for program/wallet availability and wraps the contract call

    // Buyer: Create Order
    const createOrder = useCallback(async (
        tradeId: anchor.BN,
        amount: anchor.BN,
        paymentMode: any, // Use structure expected by contract: { direct: {} } or { advance: {} }
        advancePercentage: number,
        sellerPublicKey: PublicKey
    ): Promise<string | null> => { // Return signature or null on error
        if (!program || !wallet?.publicKey || !provider) {
            console.error("Cannot create order: Wallet not connected or program not initialized.");
            throw new Error("Wallet not connected or program not initialized");
        }

        const [orderPDA] = findOrderStatePDA(tradeId);
        console.log("Creating Order with params:", {
            tradeId: tradeId.toString(),
            amount: amount.toString(),
            paymentMode,
            advancePercentage,
            buyer: wallet.publicKey.toBase58(),
            seller: sellerPublicKey.toBase58(),
            orderPDA: orderPDA.toBase58()
        });

        try {
            const txSignature = await program.methods
                .createOrder(tradeId, amount, paymentMode, advancePercentage)
                .accountsStrict({
                    buyer: provider.wallet.publicKey, // Use provider's wallet publicKey
                    seller: sellerPublicKey,
                    orderState: orderPDA,
                    usdcMint: USDC_MINT_ADDRESS,
                    systemProgram: SystemProgram.programId,
                    rent: SYSVAR_RENT_PUBKEY,
                })
                // Provider handles signing automatically for wallet transactions
                .rpc();
            console.log(`Create Order Tx Signature: ${txSignature}`);
            return txSignature;
        } catch (error) {
            console.error("Error creating order:", error);
            // Add more specific error handling if possible
            if (error instanceof anchor.AnchorError) {
                console.error("AnchorError:", error.error);
                console.error("Logs:", error.logs);
                throw new Error(`Blockchain Error: ${error.error.errorMessage}`);
            }
            throw error; // Re-throw for UI handling
        }
    }, [program, wallet, provider, findOrderStatePDA]); // Include dependencies

    // Buyer: Pay Order
    const payOrder = useCallback(async (tradeId: anchor.BN): Promise<string | null> => {
        if (!program || !wallet?.publicKey || !provider) {
            console.error("Cannot pay order: Wallet not connected or program not initialized.");
            throw new Error("Wallet not connected or program not initialized");
        }

        const [orderPDA] = findOrderStatePDA(tradeId);
        const [configPDA] = findConfigPDA();
        const [vaultAuthorityPDA] = findVaultAuthorityPDA();

        // Find buyer's Associated Token Account (ATA) for USDC
        const buyerUsdcAta = getAssociatedTokenAddressSync(USDC_MINT_ADDRESS, provider.wallet.publicKey);
        console.log(`Paying Order ${tradeId.toString()}...`);
        console.log(`  Buyer: ${provider.wallet.publicKey.toBase58()}`);
        console.log(`  Buyer USDC ATA: ${buyerUsdcAta.toBase58()}`);
        console.log(`  Vault ATA: ${CENTRAL_VAULT_TOKEN_ACCOUNT.toBase58()}`);


        try {
            const txSignature = await program.methods
                .payOrder(tradeId)
                .accountsStrict({
                    buyer: provider.wallet.publicKey,
                    buyerTokenAccount: buyerUsdcAta,
                    vaultTokenAccount: CENTRAL_VAULT_TOKEN_ACCOUNT,
                    vaultAuthority: vaultAuthorityPDA,
                    orderState: orderPDA,
                    configState: configPDA,
                    usdcMint: USDC_MINT_ADDRESS,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc();
            console.log(`Pay Order Tx Signature: ${txSignature}`);
            return txSignature;
        } catch (error) {
            console.error("Error paying order:", error);
            if (error instanceof anchor.AnchorError) {
                console.error("AnchorError:", error.error);
                console.error("Logs:", error.logs);
                // Check logs for hints like "insufficient funds" or "account not initialized"
                if (error.logs?.some(log => log.includes("Source account is empty"))) {
                    throw new Error("Blockchain Error: Buyer's USDC account might be empty or not initialized.");
                }
                throw new Error(`Blockchain Error: ${error.error.errorMessage}`);
            }
            throw error;
        }
    }, [program, wallet, provider, findOrderStatePDA, findConfigPDA, findVaultAuthorityPDA]);

    // Buyer: Confirm Order Receipt
    // const confirmOrder = useCallback(async (tradeId: anchor.BN): Promise<string | null> => {
    //     if (!program || !wallet?.publicKey || !provider) {
    //         console.error("Cannot confirm order: Wallet not connected or program not initialized.");
    //         throw new Error("Wallet not connected or program not initialized");
    //     }
    //     const [orderPDA] = findOrderStatePDA(tradeId);
    //     console.log(`Confirming Order ${tradeId.toString()}...`);
    //
    //     try {
    //         const txSignature = await program.methods
    //             .confirmOrder(tradeId)
    //             .accounts({
    //                 buyer: provider.wallet.publicKey,
    //                 orderState: orderPDA,
    //                 clock: SYSVAR_CLOCK_PUBKEY,
    //             })
    //             .rpc();
    //         console.log(`Confirm Order Tx Signature: ${txSignature}`);
    //         return txSignature;
    //     } catch (error) {
    //         console.error("Error confirming order:", error);
    //         if (error instanceof anchor.AnchorError) {
    //             console.error("AnchorError:", error.error);
    //             console.error("Logs:", error.logs);
    //             throw new Error(`Blockchain Error: ${error.error.errorMessage}`);
    //         }
    //         throw error;
    //     }
    // }, [program, wallet, provider, findOrderStatePDA]);

    // Buyer: Redeem Order (if seller timeout)
    const redeemOrder = useCallback(async (tradeId: anchor.BN): Promise<string | null> => {
        if (!program || !wallet?.publicKey || !provider) {
            console.error("Cannot redeem order: Wallet not connected or program not initialized.");
            throw new Error("Wallet not connected or program not initialized");
        }

        const [orderPDA] = findOrderStatePDA(tradeId);
        const [configPDA] = findConfigPDA();
        const [vaultAuthorityPDA] = findVaultAuthorityPDA();
        const buyerUsdcAta = getAssociatedTokenAddressSync(USDC_MINT_ADDRESS, provider.wallet.publicKey);
        console.log(`Redeeming Order ${tradeId.toString()}...`);

        try {
            const txSignature = await program.methods
                .redeemOrder(tradeId)
                .accountsStrict({
                    buyer: provider.wallet.publicKey,
                    buyerTokenAccount: buyerUsdcAta,
                    vaultTokenAccount: CENTRAL_VAULT_TOKEN_ACCOUNT,
                    vaultAuthority: vaultAuthorityPDA,
                    orderState: orderPDA,
                    configState: configPDA,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    clock: SYSVAR_CLOCK_PUBKEY,
                })
                .rpc();
            console.log(`Redeem Order Tx Signature: ${txSignature}`);
            return txSignature;
        } catch (error) {
            console.error("Error redeeming order:", error);
            if (error instanceof anchor.AnchorError) {
                console.error("AnchorError:", error.error);
                console.error("Logs:", error.logs);
                throw new Error(`Blockchain Error: ${error.error.errorMessage}`); // Check logs for timeout related errors
            }
            throw error;
        }
    }, [program, wallet, provider, findOrderStatePDA, findConfigPDA, findVaultAuthorityPDA]);

    // Seller: Claim Advance
    const claimAdvance = useCallback(async (tradeId: anchor.BN): Promise<string | null> => {
        if (!program || !wallet?.publicKey || !provider) {
            console.error("Cannot claim advance: Wallet not connected or program not initialized.");
            throw new Error("Wallet not connected or program not initialized");
        }

        const [orderPDA] = findOrderStatePDA(tradeId);
        const [configPDA] = findConfigPDA();
        const [vaultAuthorityPDA] = findVaultAuthorityPDA();
        // Seller's ATA (assuming connected wallet is seller)
        const sellerUsdcAta = getAssociatedTokenAddressSync(USDC_MINT_ADDRESS, provider.wallet.publicKey);
        console.log(`Claiming Advance for Order ${tradeId.toString()}...`);
        console.log(`  Seller ATA: ${sellerUsdcAta.toBase58()}`);


        try {
            const txSignature = await program.methods
                .claimAdvance(tradeId)
                .accountsStrict({
                    seller: provider.wallet.publicKey,
                    sellerTokenAccount: sellerUsdcAta,
                    vaultTokenAccount: CENTRAL_VAULT_TOKEN_ACCOUNT,
                    vaultAuthority: vaultAuthorityPDA,
                    orderState: orderPDA,
                    configState: configPDA,
                    tokenProgram: TOKEN_PROGRAM_ID,
                })
                .rpc();
            console.log(`Claim Advance Tx Signature: ${txSignature}`);
            return txSignature;
        } catch (error) {
            console.error("Error claiming advance:", error);
            if (error instanceof anchor.AnchorError) {
                console.error("AnchorError:", error.error);
                console.error("Logs:", error.logs);
                // Check logs for ATA init error, state error, already claimed error etc.
                throw new Error(`Blockchain Error: ${error.error.errorMessage}`);
            }
            throw error;
        }
    }, [program, wallet, provider, findOrderStatePDA, findConfigPDA, findVaultAuthorityPDA]);

    // Seller: Claim Order (Final)
    const claimOrder = useCallback(async (tradeId: anchor.BN): Promise<string | null> => {
        if (!program || !wallet?.publicKey || !provider) {
            console.error("Cannot claim order: Wallet not connected or program not initialized.");
            throw new Error("Wallet not connected or program not initialized");
        }

        const [orderPDA] = findOrderStatePDA(tradeId);
        const [configPDA] = findConfigPDA();
        const [vaultAuthorityPDA] = findVaultAuthorityPDA();
        const sellerUsdcAta = getAssociatedTokenAddressSync(USDC_MINT_ADDRESS, provider.wallet.publicKey);
        console.log(`Claiming Final Payment for Order ${tradeId.toString()}...`);

        try {
            const txSignature = await program.methods
                .claimOrder(tradeId)
                .accountsStrict({
                    seller: provider.wallet.publicKey,
                    sellerTokenAccount: sellerUsdcAta,
                    vaultTokenAccount: CENTRAL_VAULT_TOKEN_ACCOUNT,
                    vaultAuthority: vaultAuthorityPDA,
                    orderState: orderPDA,
                    configState: configPDA,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    clock: SYSVAR_CLOCK_PUBKEY,
                })
                .rpc();
            console.log(`Claim Order Tx Signature: ${txSignature}`);
            return txSignature;
        } catch (error) {
            console.error("Error claiming order:", error);
            if (error instanceof anchor.AnchorError) {
                console.error("AnchorError:", error.error);
                console.error("Logs:", error.logs);
                // Check logs for state error, timeout error, already claimed error etc.
                throw new Error(`Blockchain Error: ${error.error.errorMessage}`);
            }
            throw error;
        }
    }, [program, wallet, provider, findOrderStatePDA, findConfigPDA, findVaultAuthorityPDA]);

    // --- Data Fetching Functions (Using Backend API is Recommended for Lists) ---

    // Function to fetch order state data
    const fetchOrderData = useCallback(async (tradeId: string | number | anchor.BN): Promise<OrderData | null> => {
        const bnTradeId = new BN(tradeId); // Ensure BN for consistency
        // Option 1: Direct fetch (can be slow/rate-limited for many reads)
        /*
        if (!program) {
            console.error("Cannot fetch order data: Program not initialized.");
            return null;
        }
        const [orderPDA] = findOrderStatePDA(bnTradeId);
        try {
            const accountData = await program.account.orderState.fetch(orderPDA);
            // Convert fetched data to OrderData format (BNs/Pubkeys to strings/numbers)
            return {
                publicKey: orderPDA.toBase58(),
                buyer: accountData.buyer.toBase58(),
                seller: accountData.seller.toBase58(),
                mint: accountData.mint.toBase58(),
                tradeId: accountData.tradeId.toString(),
                orderAmount: accountData.orderAmount.toString(),
                paidAmount: accountData.paidAmount.toString(),
                claimedAmount: accountData.claimedAmount.toString(),
                paymentMode: accountData.paymentMode,
                advancePercentage: accountData.advancePercentage,
                status: accountData.status,
                createdAt: accountData.createdAt.toString(),
                paidAt: accountData.paidAt.toString(),
                shippedAt: accountData.shippedAt.toString(),
                confirmedAt: accountData.confirmedAt.toString(),
                completedAt: accountData.completedAt.toString(),
            };
        } catch (error) {
             if (error instanceof Error && error.message.includes("Account does not exist")) {
                 console.log(`Order state PDA ${orderPDA.toBase58()} not found for trade ID ${bnTradeId.toString()}`);
             } else {
                console.error(`Error fetching order data for ${bnTradeId.toString()} directly:`, error);
             }
            return null;
        }
        */

        // Option 2: Fetch from backend API (Recommended)
        console.log(`Fetching order data for ${bnTradeId.toString()} from backend...`);
        try {
            const response = await fetch(`${BACKEND_URL}/orders/${bnTradeId.toString()}`);
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`Order ${bnTradeId.toString()} not found via backend.`);
                    return null;
                }
                console.error(`Failed to fetch order ${bnTradeId.toString()} from backend: ${response.statusText}`);
                return null;
            }
            // Assuming backend already returns data in OrderData format
            const data: OrderData = await response.json();
            return data;
        } catch (error) {
            console.error("Error fetching order from backend:", error);
            return null;
        }

    }, [program, findOrderStatePDA]); // Include program/findOrderStatePDA if using direct fetch


    // Function to fetch config state (from Backend API is efficient)
    const fetchConfigData = useCallback(async () => {
        console.log("Fetching config data from backend...");
        try {
            const response = await fetch(`${BACKEND_URL}/config`);
            if (!response.ok) {
                console.error(`Failed to fetch config from backend: ${response.statusText}`);
                return null;
            }
            // Assuming backend returns simplified config data
            return await response.json();
        } catch (error) {
            console.error("Error fetching config from backend:", error);
            return null;
        }
    }, []);


    // --- Return values from the hook ---
    return {
        connected: !!wallet?.publicKey, // Boolean indicating if wallet is connected
        publicKey: wallet?.publicKey, // Connected wallet's public key
        program, // Anchor program instance (can be undefined)
        provider, // Anchor provider instance (can be undefined)

        // PDA Calculators
        findConfigPDA,
        findOrderStatePDA,
        findVaultAuthorityPDA,

        // Blockchain Interaction Functions
        createOrder,
        payOrder,
        redeemOrder,
        claimAdvance,
        claimOrder,

        // Data Fetching Wrappers
        fetchOrderData,
        fetchConfigData,
    };
};
