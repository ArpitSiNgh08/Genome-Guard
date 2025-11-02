// IPFS Storage Service
// Handles uploading encrypted files to IPFS/Pinata

const PINATA_API_KEY = process.env.REACT_APP_PINATA_API_KEY || "";
const PINATA_SECRET_KEY = process.env.REACT_APP_PINATA_SECRET_KEY || "";
const PINATA_API_URL = "https://api.pinata.cloud";

class IPFSService {
  constructor() {
    this.pinataApiKey = PINATA_API_KEY;
    this.pinataSecretKey = PINATA_SECRET_KEY;
  }

  /**
   * Upload encrypted file to IPFS via Pinata
   */
  async uploadEncryptedFile(encryptedContent, metadata = {}) {
    try {
      if (!this.pinataApiKey || !this.pinataSecretKey) {
        console.warn("Pinata credentials not configured, using mock storage");
        return this.mockUpload(encryptedContent);
      }

      // Create blob from encrypted content
      const blob = new Blob([encryptedContent], { type: "text/plain" });
      
      // Create FormData
      const formData = new FormData();
      formData.append("file", blob, "encrypted_data.enc");
      
      // Add metadata
      const pinataMetadata = JSON.stringify({
        name: metadata.filename || "genomic_data.vcf.enc",
        keyvalues: {
          encrypted: "true",
          type: "genomic_analysis",
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      });
      formData.append("pinataMetadata", pinataMetadata);

      // Upload to Pinata
      const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: "POST",
        headers: {
          pinata_api_key: this.pinataApiKey,
          pinata_secret_api_key: this.pinataSecretKey,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        ipfsHash: result.IpfsHash,
        pinSize: result.PinSize,
        timestamp: result.Timestamp,
        url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
      };
    } catch (error) {
      console.error("IPFS upload failed:", error);
      
      // Fallback to mock storage for demo
      return this.mockUpload(encryptedContent);
    }
  }

  /**
   * Download encrypted file from IPFS
   */
  async downloadEncryptedFile(ipfsHash) {
    try {
      // Try Pinata gateway first
      let url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      
      let response = await fetch(url);
      
      // Fallback to public gateways
      if (!response.ok) {
        url = `https://ipfs.io/ipfs/${ipfsHash}`;
        response = await fetch(url);
      }

      if (!response.ok) {
        // Check if it's a mock hash
        if (ipfsHash.startsWith("Qmmock")) {
          return this.mockDownload(ipfsHash);
        }
        throw new Error(`IPFS download failed: ${response.statusText}`);
      }

      const encryptedContent = await response.text();
      
      return {
        success: true,
        content: encryptedContent,
      };
    } catch (error) {
      console.error("IPFS download failed:", error);
      
      // Try mock download
      if (ipfsHash.startsWith("Qmmock")) {
        return this.mockDownload(ipfsHash);
      }
      
      throw error;
    }
  }

  /**
   * Pin file to ensure persistence
   */
  async pinFile(ipfsHash) {
    try {
      if (!this.pinataApiKey || !this.pinataSecretKey) {
        return { success: true, message: "Mock pinning successful" };
      }

      const response = await fetch(`${PINATA_API_URL}/pinning/pinByHash`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          pinata_api_key: this.pinataApiKey,
          pinata_secret_api_key: this.pinataSecretKey,
        },
        body: JSON.stringify({
          hashToPin: ipfsHash,
        }),
      });

      if (!response.ok) {
        throw new Error(`Pin failed: ${response.statusText}`);
      }

      return {
        success: true,
        message: "File pinned successfully",
      };
    } catch (error) {
      console.error("Pin failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Mock upload for demo purposes (no Pinata credentials)
   */
  mockUpload(content) {
    // Generate mock IPFS hash
    const mockHash = "Qmmock" + Date.now() + Math.random().toString(36).substr(2, 9);
    
    // Store in localStorage (temporary)
    const storageKey = `ipfs_${mockHash}`;
    try {
      localStorage.setItem(storageKey, content);
    } catch (e) {
      console.warn("localStorage full, using in-memory storage");
      if (!window._mockIPFS) {
        window._mockIPFS = {};
      }
      window._mockIPFS[mockHash] = content;
    }

    console.log("Using mock IPFS storage:", mockHash);

    return {
      success: true,
      ipfsHash: mockHash,
      pinSize: content.length,
      timestamp: new Date().toISOString(),
      url: `mock://ipfs/${mockHash}`,
      mock: true,
    };
  }

  /**
   * Mock download for demo purposes
   */
  mockDownload(ipfsHash) {
    const storageKey = `ipfs_${ipfsHash}`;
    
    // Try localStorage first
    let content = localStorage.getItem(storageKey);
    
    // Try in-memory storage
    if (!content && window._mockIPFS) {
      content = window._mockIPFS[ipfsHash];
    }

    if (!content) {
      throw new Error(`Mock IPFS file not found: ${ipfsHash}`);
    }

    return {
      success: true,
      content: content,
      mock: true,
    };
  }

  /**
   * Get file metadata from Pinata
   */
  async getFileMetadata(ipfsHash) {
    try {
      if (!this.pinataApiKey || !this.pinataSecretKey) {
        return { mock: true };
      }

      const response = await fetch(
        `${PINATA_API_URL}/data/pinList?hashContains=${ipfsHash}`,
        {
          headers: {
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Metadata fetch failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.rows[0] || null;
    } catch (error) {
      console.error("Metadata fetch failed:", error);
      return null;
    }
  }

  /**
   * Check if Pinata is configured
   */
  isConfigured() {
    return !!(this.pinataApiKey && this.pinataSecretKey);
  }
}

export default new IPFSService();
