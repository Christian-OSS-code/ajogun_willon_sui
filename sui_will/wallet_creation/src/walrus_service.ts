walrus_service.ts

import { createClient } from '@walrusdb/walrusdb';

export interface IWallet {
  userId: string;
  address: string;
  encryptedPrivateKey: string;
  privateKeyIv: string;
  encryptedMnemonic: string;
  mnemonicIv: string;
  salt: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

class WalrusService {
  private client: any;
  private isConnected = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      this.client = createClient({
        url: process.env.WALRUS_URL || 'https://walrus.mystenlabs.com',
        network: process.env.SUI_NETWORK || 'testnet',
      });
      this.isConnected = true;
      console.log('✅ Walrus client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Walrus client:', error);
      this.isConnected = false;
    }
  }

  async connect(): Promise<boolean> {
    if (this.isConnected) return true;
    
    try {
      // Test connection by checking network
      const network = await this.client.getNetwork();
      console.log('✅ Connected to Walrus database on network:', network);
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Walrus:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Wallet operations
  async createWallet(walletData: Omit<IWallet, 'createdAt' | 'updatedAt'>): Promise<string> {
    if (!this.isConnected) await this.connect();
    
    const walletWithTimestamps = {
      ...walletData,
      id: ${walletData.userId}-${Date.now()},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.client.insert('wallets', walletWithTimestamps);
    return result.id;
  }

  async findWalletByUserId(userId: string): Promise<IWallet | null> {
    if (!this.isConnected) await this.connect();
    
    try {
      const wallets = await this.client.query('wallets', { 
        filter: { userId } 
      });
      return wallets.length > 0 ? wallets[0] : null;
    } catch (error) {
      console.error('Error finding wallet by userId:', error);
      return null;
    }
  }

  async findWalletByAddress(address: string): Promise<IWallet | null> {
    if (!this.isConnected) await this.connect();
    
    try {
      const wallets = await this.client.query('wallets', { 
        filter: { address } 
      });
      return wallets.length > 0 ? wallets[0] : null;
    } catch (error) {
      console.error('Error finding wallet by address:', error);
      return null;
    }
  }

  async updateWallet(userId: string, updates: Partial<IWallet>): Promise<boolean> {
    if (!this.isConnected) await this.connect();
    
    try {
      const updatedData = {
        ...updates,
        updatedAt: new Date(),
      };

      const result = await this.client.update(
        'wallets', 
        { filter: { userId } }, 
        { $set: updatedData }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error updating wallet:', error);
      return false;
    }
  }
  async findAllWallets(): Promise<IWallet[]> {
    if (!this.isConnected) await this.connect();
    
    try {
      return await this.client.query('wallets', {});
    } catch (error) {
      console.error('Error finding all wallets:', error);
      return [];
    }
  }
  
  async findWalletsByFilter(filter: any): Promise<IWallet[]> {
    if (!this.isConnected) await this.connect();
    
    try {
      return await this.client.query('wallets', { filter });
    } catch (error) {
      console.error('Error finding wallets by filter:', error);
      return [];
    }
  }

  async deleteWallet(userId: string): Promise<boolean> {
    if (!this.isConnected) await this.connect();
    
    try {
      const result = await this.client.delete('wallets', { 
        filter: { userId } 
      });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting wallet:', error);
      return false;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const walrusService = new WalrusService();
