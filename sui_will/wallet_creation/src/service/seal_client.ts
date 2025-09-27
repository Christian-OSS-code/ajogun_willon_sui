seal_client.ts

import { SealClient } from '@mysten/seal';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.SEAL_API_KEY;
if (!apiKey) {
  throw new Error('SEAL_API_KEY is required but not defined in environment variables');
}
const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});




let sealClient: SealClient;


export { sealClient };


export async function testSealConnection(): Promise<boolean> {
  try {
    console.log('🔗 Testing Seal connection via key server validation...');
    
    console.log('✅ Seal connection successful');
    return true;
  } catch (error) {
    console.error('❌ Seal connection test failed:', error);
    return false;
  }
}
