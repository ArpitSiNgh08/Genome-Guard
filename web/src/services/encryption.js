// Client-Side Encryption Service
// Uses Web Crypto API for end-to-end encryption of genomic data

class EncryptionService {
  constructor() {
    this.algorithm = {
      name: "AES-GCM",
      length: 256,
    };
  }

  /**
   * Generate encryption key and store in IndexedDB
   */
  async generateKey() {
    try {
      const key = await window.crypto.subtle.generateKey(
        this.algorithm,
        true, // extractable
        ["encrypt", "decrypt"]
      );

      // Export key for storage
      const exportedKey = await window.crypto.subtle.exportKey("jwk", key);
      
      // Store in IndexedDB
      await this.storeKey(exportedKey);

      return exportedKey;
    } catch (error) {
      console.error("Key generation failed:", error);
      throw error;
    }
  }

  /**
   * Encrypt file content
   */
  async encryptFile(fileContent) {
    try {
      // Get or generate encryption key
      let keyData = await this.getKey();
      if (!keyData) {
        keyData = await this.generateKey();
      }

      // Import key
      const key = await window.crypto.subtle.importKey(
        "jwk",
        keyData,
        this.algorithm,
        true,
        ["encrypt"]
      );

      // Generate IV (Initialization Vector)
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Convert file content to ArrayBuffer
      const encoder = new TextEncoder();
      const data = encoder.encode(fileContent);

      // Encrypt
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        key,
        data
      );

      // Combine IV + encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // Convert to base64
      const base64 = btoa(String.fromCharCode(...combined));

      return {
        encrypted: base64,
        keyId: keyData.kid || "default",
      };
    } catch (error) {
      console.error("Encryption failed:", error);
      throw error;
    }
  }

  /**
   * Decrypt file content
   */
  async decryptFile(encryptedBase64) {
    try {
      // Get encryption key
      const keyData = await this.getKey();
      if (!keyData) {
        throw new Error("Encryption key not found. Cannot decrypt.");
      }

      // Import key
      const key = await window.crypto.subtle.importKey(
        "jwk",
        keyData,
        this.algorithm,
        true,
        ["decrypt"]
      );

      // Convert from base64
      const combined = Uint8Array.from(atob(encryptedBase64), (c) =>
        c.charCodeAt(0)
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);

      // Decrypt
      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        key,
        encryptedData
      );

      // Convert to string
      const decoder = new TextDecoder();
      const decrypted = decoder.decode(decryptedData);

      return decrypted;
    } catch (error) {
      console.error("Decryption failed:", error);
      throw error;
    }
  }

  /**
   * Generate hash of encrypted content for blockchain
   */
  async generateHash(content) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      
      // Convert to hex
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      
      return hashHex;
    } catch (error) {
      console.error("Hash generation failed:", error);
      throw error;
    }
  }

  /**
   * Store encryption key in IndexedDB
   */
  async storeKey(keyData) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("GenomeGuardDB", 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(["keys"], "readwrite");
        const store = transaction.objectStore("keys");
        
        // Add unique ID if not present
        if (!keyData.kid) {
          keyData.kid = "default";
        }

        const putRequest = store.put(keyData);
        
        putRequest.onsuccess = () => resolve(keyData);
        putRequest.onerror = () => reject(putRequest.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("keys")) {
          db.createObjectStore("keys", { keyPath: "kid" });
        }
      };
    });
  }

  /**
   * Retrieve encryption key from IndexedDB
   */
  async getKey() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("GenomeGuardDB", 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains("keys")) {
          resolve(null);
          return;
        }

        const transaction = db.transaction(["keys"], "readonly");
        const store = transaction.objectStore("keys");
        const getRequest = store.get("default");

        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("keys")) {
          db.createObjectStore("keys", { keyPath: "kid" });
        }
      };
    });
  }

  /**
   * Delete encryption key (logout)
   */
  async deleteKey() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("GenomeGuardDB", 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains("keys")) {
          resolve();
          return;
        }

        const transaction = db.transaction(["keys"], "readwrite");
        const store = transaction.objectStore("keys");
        const deleteRequest = store.delete("default");

        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
    });
  }

  /**
   * Export key for backup (returns base64 encoded key)
   */
  async exportKey() {
    try {
      const keyData = await this.getKey();
      if (!keyData) {
        throw new Error("No key to export");
      }

      const keyJson = JSON.stringify(keyData);
      const base64Key = btoa(keyJson);
      
      return base64Key;
    } catch (error) {
      console.error("Key export failed:", error);
      throw error;
    }
  }

  /**
   * Import key from backup
   */
  async importKey(base64Key) {
    try {
      const keyJson = atob(base64Key);
      const keyData = JSON.parse(keyJson);
      
      await this.storeKey(keyData);
      
      return { success: true };
    } catch (error) {
      console.error("Key import failed:", error);
      throw error;
    }
  }
}

export default new EncryptionService();
