import { BN } from "@coral-xyz/anchor";

const USDC_DECIMALS = 6; // Define USDC decimals

export function lamportsToDecimalString(lamports: string | BN | number): string {
    try {
        const bnLamports = new BN(lamports);
        const base = new BN(10).pow(new BN(USDC_DECIMALS));
        const integerPart = bnLamports.div(base);
        const fractionalPart = bnLamports.mod(base).toString().padStart(USDC_DECIMALS, '0');
        // Trim trailing zeros from fractional part for cleaner display if desired
        // const trimmedFractional = fractionalPart.replace(/0+$/, '');
        // return `${integerPart}.${trimmedFractional || '0'}`;
        return `${integerPart}.${fractionalPart}`;
    } catch (e) {
        console.error("Error formatting lamports:", lamports, e);
        return "0.00"; // Or handle error appropriately
    }
}

export function decimalStringToLamports(decimalString: string): BN {
    try {
        if (!decimalString || isNaN(parseFloat(decimalString))) {
            return new BN(0);
        }
        const parts = decimalString.split('.');
        const integerPart = parts[0] || "0";
        let fractionalPart = (parts[1] || "").padEnd(USDC_DECIMALS, '0').slice(0, USDC_DECIMALS);

        const integerBN = new BN(integerPart).mul(new BN(10).pow(new BN(USDC_DECIMALS)));
        const fractionalBN = new BN(fractionalPart);

        return integerBN.add(fractionalBN);
    } catch (e) {
        console.error("Error converting decimal string to lamports:", decimalString, e);
        return new BN(0); // Or handle error appropriately
    }
}
