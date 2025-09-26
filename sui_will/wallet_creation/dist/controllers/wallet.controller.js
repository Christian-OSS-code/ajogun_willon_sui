"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferTokens = exports.getBalance = exports.getWallet = exports.createWallet = void 0;
const client_1 = require("@mysten/sui/client");
const ed25519_1 = require("@mysten/sui/keypairs/ed25519");
const crypto_1 = require("../utils/crypto");
const wallet_model_1 = require("../models/wallet.model");
const crypto = __importStar(require("crypto"));
const dotenv = __importStar(require("dotenv"));
const transactions_1 = require("@mysten/sui/transactions");
dotenv.config();
const client = new client_1.SuiClient({ url: (0, client_1.getFullnodeUrl)('testnet') });
const createWallet = async (req, res) => {
    try {
        const { password, userId } = req.body;
        const keypair = new ed25519_1.Ed25519Keypair();
        const publicKey = keypair.getPublicKey().toSuiAddress();
        const secretKeyString = keypair.getSecretKey();
        console.log("Secret key string:", secretKeyString);
        console.log("Secret key type:", typeof secretKeyString);
        console.log("Secret key length:", secretKeyString.length);
        const privateKeyData = secretKeyString;
        const mnemonic = (0, crypto_1.generateMnemonic)();
        const salt = crypto.randomBytes(16).toString('hex');
        const { encrypted: encryptedPrivateKey, iv: privateKeyIv } = (0, crypto_1.encrypt)(privateKeyData, password, salt);
        const { encrypted: encryptedMnemonic, iv: mnemonicIv } = (0, crypto_1.encrypt)(mnemonic, password, salt);
        const wallet = new wallet_model_1.WalletModel({
            userId,
            address: publicKey,
            encryptedPrivateKey,
            privateKeyIv,
            encryptedMnemonic,
            mnemonicIv,
            salt,
        });
        await wallet.save();
        res.json({
            message: 'Wallet created successfully. Save your mnemonic securely!',
            address: publicKey,
            mnemonic,
        });
    }
    catch (err) {
        console.error("Error creating wallet:", err);
        res.status(500).json({ message: "Error creating wallet" });
    }
};
exports.createWallet = createWallet;
const getWallet = async (req, res) => {
    try {
        const { userId } = req.params;
        const { password } = req.body;
        if (!userId || !password) {
            return res.status(400).json({ message: 'Missing userId or password' });
        }
        const wallet = await wallet_model_1.WalletModel.findOne({ userId });
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }
        let mnemonic = null;
        if (req.query.includeMnemonic === 'true') {
            try {
                mnemonic = (0, crypto_1.decrypt)(wallet.encryptedMnemonic, wallet.mnemonicIv, password, wallet.salt);
            }
            catch (error) {
                return res.status(401).json({ message: 'Invalid password' });
            }
        }
        return res.status(200).json({
            address: wallet.address,
            mnemonic,
            message: 'Wallet fetched successfully',
        });
    }
    catch (error) {
        console.error('Wallet fetch failed:', error);
        return res.status(500).json({ message: 'Error fetching wallet' });
    }
};
exports.getWallet = getWallet;
const getBalance = async (req, res) => {
    try {
        const { userId } = req.params;
        const wallet = await wallet_model_1.WalletModel.findOne({ userId });
        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }
        const balance = await client.getBalance({ owner: wallet.address });
        return res.status(200).json({
            address: wallet.address,
            balance: balance.totalBalance,
            message: 'Balance fetched successfully',
        });
    }
    catch (error) {
        console.error('Balance fetch failed:', error);
        return res.status(500).json({ message: 'Error fetching balance' });
    }
};
exports.getBalance = getBalance;
const transferTokens = async (req, res) => {
    try {
        const { userId } = req.params;
        const { recipient, amount, password } = req.body;
        console.log("Transfer Request:", { userId, recipient, amount });
        const wallet = await wallet_model_1.WalletModel.findOne({ userId });
        if (!wallet) {
            return res.status(404).json({ message: "Wallet not found" });
        }
        console.log("Wallet found:", wallet.address);
        try {
            const privateKeyString = (0, crypto_1.decrypt)(wallet.encryptedPrivateKey, wallet.privateKeyIv, password, wallet.salt);
            console.log("Decrypted private key string:", privateKeyString);
            console.log("Decrypted key type:", typeof privateKeyString);
            console.log("Decrypted key length:", privateKeyString.length);
            const keypair = ed25519_1.Ed25519Keypair.fromSecretKey(privateKeyString);
            const derivedAddress = keypair.getPublicKey().toSuiAddress();
            if (derivedAddress !== wallet.address) {
                return res.status(401).json({ message: "Key derivation error: addresses don't match" });
            }
            const balance = await client.getBalance({ owner: wallet.address });
            const amountNum = parseInt(amount);
            if (parseInt(balance.totalBalance) < amountNum) {
                return res.status(400).json({
                    message: `Insufficient balance. Available: ${balance.totalBalance} MIST, Required: ${amountNum} MIST`
                });
            }
            const tx = new transactions_1.Transaction();
            const [coinToTransfer] = tx.splitCoins(tx.gas, [amountNum]);
            tx.transferObjects([coinToTransfer], recipient);
            tx.setGasBudget(10000000);
            const result = await client.signAndExecuteTransaction({
                signer: keypair,
                transaction: tx,
            });
            res.json({
                message: "Transfer successful",
                transactionDigest: result.digest,
                from: wallet.address,
                to: recipient,
                amount: amountNum,
            });
        }
        catch (decryptionError) {
            console.error("Decryption failed:", decryptionError);
            return res.status(401).json({ message: "Invalid password or decryption error" });
        }
    }
    catch (err) {
        console.error("Token transfer failed:", err);
        res.status(500).json({ message: "Error transferring tokens: " + (err instanceof Error ? err.message : String(err)) });
    }
};
exports.transferTokens = transferTokens;
