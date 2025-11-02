// Aptos Blockchain Integration Service
// Handles wallet connection, transactions, and smart contract interactions

import { AptosClient, AptosAccount, FaucetClient, Types } from "aptos";

const NODE_URL = process.env.REACT_APP_APTOS_NODE_URL || "https://fullnode.devnet.aptoslabs.com";
const FAUCET_URL = process.env.REACT_APP_APTOS_FAUCET_URL || "https://faucet.devnet.aptoslabs.com";

// Smart contract address (set after deployment)
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const MODULE_NAME = "privacy_analysis";

class AptosService {
  constructor() {
    this.client = new AptosClient(NODE_URL);
    this.faucet = new FaucetClient(NODE_URL, FAUCET_URL);
  }

  /**
   * Connect to Petra Wallet on Testnet
   */
  async connectWallet() {
    try {
      // Try Petra wallet (testing on testnet)
      if (window.aptos) {
        console.log('🔌 Connecting to Petra wallet...');
        console.log('🔍 Petra object:', window.aptos);
        
        const response = await window.aptos.connect();
        console.log('✅ Connection response:', response);
        
        if (!response || !response.address) {
          throw new Error('Failed to get address from Petra wallet');
        }
        
        return {
          address: response.address,
          publicKey: response.publicKey,
          connected: true,
          walletType: 'petra',
        };
      }
      
      // Martian as fallback
      if (window.martian) {
        console.log('🔌 Connecting to Martian wallet...');
        const response = await window.martian.connect();
        console.log('✅ Connection response:', response);
        
        if (!response || !response.address) {
          throw new Error('Failed to get address from Martian wallet');
        }
        
        return {
          address: response.address,
          publicKey: response.publicKey,
          connected: true,
          walletType: 'martian',
        };
      }

      // No wallet found
      throw new Error("No Aptos wallet found. Please install Petra (https://petra.app) or Martian (https://martianwallet.xyz)");
    } catch (error) {
      console.error("Wallet connection failed:", error);
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet() {
    try {
      if (window.aptos) {
        await window.aptos.disconnect();
      } else if (window.martian) {
        await window.martian.disconnect();
      }
      return { connected: false };
    } catch (error) {
      console.error("Wallet disconnect failed:", error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address) {
    try {
      const resources = await this.client.getAccountResources(address);
      const accountResource = resources.find(
        (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
      );
      
      if (accountResource) {
        return parseInt(accountResource.data.coin.value) / 100000000; // Convert Octas to APT
      }
      return 0;
    } catch (error) {
      console.error("Failed to get balance:", error);
      return 0;
    }
  }

  /**
   * Request analysis - Submit VCF and pay
   */
  async requestAnalysis(encryptedFileHash) {
    try {
      // Try Petra first, then Martian
      const wallet = window.aptos || window.martian;
      if (!wallet) {
        throw new Error("No Aptos wallet connected. Please install Petra or Martian.");
      }

      // Check if contract is deployed
      if (CONTRACT_ADDRESS === "0x..." || !CONTRACT_ADDRESS || CONTRACT_ADDRESS.length < 10) {
        console.warn("⚠️ Smart contract not deployed. Using mock mode.");
        // Return mock transaction for demo
        return {
          success: true,
          transactionHash: "0xmock" + Date.now(),
          analysisId: 1,
          mock: true,
          message: "Mock transaction (contract not deployed). Deploy contract to use real blockchain.",
        };
      }

      // Simple payload - let wallet handle gas
      const payload = {
        type: "entry_function_payload",
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::request_analysis`,
        type_arguments: [],
        arguments: [encryptedFileHash],
      };

      // NEW APPROACH: Build transaction with SDK, wallet only signs
      console.log('🚀 Building transaction with Aptos SDK...');
      console.log('📋 Payload:', payload);
      
      // Get wallet account
      const account = await wallet.account();
      console.log('� Wallet account:', account);
      
      if (!account || !account.address) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
      
      console.log('� Creating raw transaction with proper gas limits...');
      
      // Build raw transaction with SDK (proper gas handling)
      const rawTxn = await this.client.generateTransaction(
        account.address,
        payload,
        {
          max_gas_amount: "100000",  // Well above minimum
          gas_unit_price: "100",
        }
      );
      
      console.log('✅ Raw transaction created:', rawTxn);
      console.log('⚡ Gas amount:', rawTxn.max_gas_amount);
      
      // Have wallet sign the transaction (no simulation, just signing)
      console.log('✍️ Requesting wallet signature...');
      // Use wallet's signAndSubmitTransaction instead (avoids AccountAuthenticator error)
      const pendingTransaction = await wallet.signAndSubmitTransaction(payload);
      console.log('✅ Transaction submitted:', pendingTransaction);
      
      // Extract transaction hash from response
      const txHash = pendingTransaction.hash;
      console.log('🔗 Transaction hash:', txHash);
      
      if (!txHash) {
        throw new Error('Failed to get transaction hash');
      }
      
      console.log('⏳ Waiting for transaction confirmation...');
      await this.client.waitForTransaction(txHash);

      // Get analysis ID from events
      console.log('📊 Fetching transaction details...');
      const txn = await this.client.getTransactionByHash(txHash);
      const analysisId = this.extractAnalysisIdFromTransaction(txn);

      return {
        success: true,
        transactionHash: txHash,
        analysisId,
      };
    } catch (error) {
      console.error("❌ Request analysis failed:", error);
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Submit results (backend only)
   */
  async submitResults(operatorAccount, analysisId, encryptedResultHash) {
    try {
      const payload = {
        type: "entry_function_payload",
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::submit_results`,
        type_arguments: [],
        arguments: [analysisId, encryptedResultHash],
      };

      const txnRequest = await this.client.generateTransaction(
        operatorAccount.address(),
        payload
      );
      const signedTxn = await this.client.signTransaction(
        operatorAccount,
        txnRequest
      );
      const txnResult = await this.client.submitTransaction(signedTxn);
      await this.client.waitForTransaction(txnResult.hash);

      return {
        success: true,
        transactionHash: txnResult.hash,
      };
    } catch (error) {
      console.error("Submit results failed:", error);
      throw error;
    }
  }

  /**
   * Get analysis status
   */
  async getAnalysisStatus(analysisId) {
    try {
      const payload = {
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_analysis_status`,
        type_arguments: [],
        arguments: [analysisId],
      };

      const status = await this.client.view(payload);
      
      const statusMap = {
        0: "PENDING",
        1: "PROCESSING", 
        2: "COMPLETED",
        3: "FAILED",
      };

      return statusMap[status[0]] || "UNKNOWN";
    } catch (error) {
      console.error("Get status failed:", error);
      throw error;
    }
  }

  /**
   * Get encrypted result hash
   */
  async getEncryptedResult(analysisId) {
    try {
      const payload = {
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_encrypted_result`,
        type_arguments: [],
        arguments: [analysisId],
      };

      const result = await this.client.view(payload);
      return result[0]; // IPFS hash
    } catch (error) {
      console.error("Get result failed:", error);
      throw error;
    }
  }

  /**
   * Get total analyses count
   */
  async getTotalAnalyses() {
    try {
      const payload = {
        function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_total_analyses`,
        type_arguments: [],
        arguments: [],
      };

      const result = await this.client.view(payload);
      return parseInt(result[0]);
    } catch (error) {
      console.error("Get total analyses failed:", error);
      return 0;
    }
  }

  /**
   * Extract analysis ID from transaction events
   */
  extractAnalysisIdFromTransaction(txn) {
    try {
      if (txn.events) {
        const requestEvent = txn.events.find(
          (e) => e.type.includes("AnalysisRequestedEvent")
        );
        if (requestEvent) {
          return requestEvent.data.analysis_id;
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to extract analysis ID:", error);
      return null;
    }
  }

  /**
   * Fund account from faucet (devnet only)
   */
  async fundAccount(address) {
    try {
      await this.faucet.fundAccount(address, 100000000); // 1 APT
      return { success: true };
    } catch (error) {
      console.error("Fund account failed:", error);
      throw error;
    }
  }
}

export default new AptosService();
