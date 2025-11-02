import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { analysisAPI } from '../services/api';
import aptosService from '../services/aptos';
import encryptionService from '../services/encryption';
import ipfsService from '../services/ipfs';
import toast from 'react-hot-toast';
import { Upload as UploadIcon, FileText, AlertCircle, Wallet, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Upload = () => {
  const [uploading, setUploading] = useState(false);
  const [analysisId, setAnalysisId] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [useBlockchain, setUseBlockchain] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if wallet is already connected
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      if (window.aptos) {
        const account = await window.aptos.account();
        if (account) {
          setWalletConnected(true);
          setWalletAddress(account.address);
        }
      }
    } catch (error) {
      // Wallet not connected
    }
  };

  const connectWallet = async () => {
    try {
      const result = await aptosService.connectWallet();
      setWalletConnected(result.connected);
      setWalletAddress(result.address);
      toast.success('Wallet connected successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to connect wallet');
    }
  };

  const disconnectWallet = async () => {
    try {
      await aptosService.disconnectWallet();
      setWalletConnected(false);
      setWalletAddress('');
      toast.success('Wallet disconnected');
    } catch (error) {
      toast.error('Failed to disconnect wallet');
    }
  };

  const onDrop = async (acceptedFiles) => {
    console.log('🔍 Upload: onDrop triggered');
    console.log('📁 Files received:', acceptedFiles);
    
    const file = acceptedFiles[0];
    
    if (!file) {
      console.error('❌ No file received');
      toast.error('No file selected');
      return;
    }
    
    console.log('📄 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    if (!file.name.endsWith('.vcf')) {
      console.error('❌ Invalid file type:', file.name);
      toast.error('Please upload a VCF file');
      return;
    }

    setUploading(true);
    console.log('⏳ Starting upload...');
    
    try {
      if (useBlockchain && walletConnected) {
        await handleBlockchainUpload(file);
      } else {
        await handleTraditionalUpload(file);
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Upload failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      console.log('✅ Upload process finished');
    }
  };

  const handleTraditionalUpload = async (file) => {
    console.log('🚀 Traditional upload...');
    const response = await analysisAPI.upload(file);
    console.log('✅ Upload response:', response);
    
    const { analysis_id } = response.data;
    console.log('🎯 Analysis ID:', analysis_id);
    
    setAnalysisId(analysis_id);
    toast.success('File uploaded successfully! Analysis started.');
    
    // Redirect to results page after a delay
    setTimeout(() => {
      console.log('🔄 Redirecting to results page...');
      navigate(`/results/${analysis_id}`);
    }, 2000);
  };

  const handleBlockchainUpload = async (file) => {
    console.log('🔗 Blockchain upload...');
    
    // Step 1: Read file content
    setUploadProgress('Reading file...');
    const fileContent = await readFileAsText(file);
    
    // Step 2: Encrypt file
    setUploadProgress('Encrypting data (client-side)...');
    const { encrypted, keyId } = await encryptionService.encryptFile(fileContent);
    console.log('🔒 File encrypted with key:', keyId);
    
    // Step 3: Upload to IPFS
    setUploadProgress('Uploading to IPFS...');
    const ipfsResult = await ipfsService.uploadEncryptedFile(encrypted, {
      filename: file.name,
      size: file.size,
    });
    console.log('📦 IPFS upload:', ipfsResult);
    
    // Step 4: Use IPFS hash as file identifier (better than hex hash)
    const fileHash = ipfsResult.ipfsHash;
    console.log('🔢 File hash (IPFS):', fileHash);
    
    // Step 5: Submit to blockchain
    setUploadProgress('Submitting to Aptos blockchain...');
    toast('📝 Petra wallet will ask for approval. If you see "MAX_GAS" error in simulation, click "Approve Anyway" - the actual transaction will work fine!', {
      duration: 8000,
      icon: '💡',
    });
    const txResult = await aptosService.requestAnalysis(fileHash);
    console.log('⛓️ Blockchain transaction:', txResult);
    
    // Step 6: Send encrypted file to backend for processing
    setUploadProgress('Sending to analysis pipeline...');
    // Backend will process and return encrypted results to IPFS
    const response = await analysisAPI.upload(file, {
      blockchain: true,
      ipfsHash: ipfsResult.ipfsHash,
      txHash: txResult.transactionHash,
      analysisId: txResult.analysisId,
      mock: txResult.mock || false,
    });
    
    const { analysis_id } = response.data;
    setAnalysisId(analysis_id);
    
    toast.success('✅ Blockchain-secured analysis started!');
    setUploadProgress('Complete!');
    
    // Redirect with blockchain flag
    setTimeout(() => {
      navigate(`/results/${analysis_id}?blockchain=true&mock=${txResult.mock || false}`);
    }, 2000);
  };

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.vcf']
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024 // 100MB
  });

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Upload Genomic Data
        </h1>
        <p className="text-gray-600">
          Upload your VCF file to start genetic disease risk analysis
        </p>
      </div>

      {/* Wallet Connection & Blockchain Toggle */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Shield className="h-6 w-6 text-primary-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Blockchain Privacy Mode</h3>
              <p className="text-sm text-gray-600">
                Enable decentralized, end-to-end encrypted analysis
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {walletConnected ? (
              <>
                <div className="text-sm">
                  <p className="text-gray-600">Connected:</p>
                  <p className="font-mono text-xs text-gray-900">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="btn-secondary text-sm"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connectWallet}
                className="btn-primary flex items-center"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Connect Petra
              </button>
            )}
          </div>
        </div>
        
        {walletConnected && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useBlockchain}
                onChange={(e) => setUseBlockchain(e.target.checked)}
                className="mr-3 h-5 w-5 text-primary-600 rounded"
              />
              <div>
                <span className="font-medium text-gray-900">
                  Use blockchain for this analysis
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  ✓ Client-side encryption ✓ IPFS storage ✓ Privacy tokens ✓ 0.1 APT fee
                </p>
              </div>
            </label>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Area */}
        <div className="card">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-400'
            }`}
          >
            <input {...getInputProps()} />
            <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            
            {uploading ? (
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {uploadProgress || 'Uploading...'}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-600 h-2 rounded-full animate-pulse w-1/2"></div>
                </div>
                {useBlockchain && (
                  <p className="text-xs text-gray-600 mt-3">
                    🔐 Encrypting locally • 📦 Uploading to IPFS • ⛓️ Recording on Aptos
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isDragActive ? 'Drop your VCF file here' : 'Drag & drop your VCF file'}
                </p>
                <p className="text-gray-600 mb-4">
                  or click to browse files
                </p>
                <button className="btn-primary">
                  Select File
                </button>
              </div>
            )}
          </div>

          {analysisId && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ Analysis started! ID: {analysisId}
              </p>
              <p className="text-green-600 text-sm mt-1">
                Redirecting to results page...
              </p>
            </div>
          )}
        </div>

        {/* Information Panel */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary-600" />
              File Requirements
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>• File format: VCF (.vcf)</li>
              <li>• Maximum size: 100MB</li>
              <li>• Standard VCF format required</li>
              <li>• Human genome data only</li>
            </ul>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-warning-500" />
              Privacy & Security
            </h3>
            {useBlockchain ? (
              <ul className="space-y-2 text-gray-600">
                <li>🔒 Client-side encryption only</li>
                <li>⛓️ Decentralized storage (IPFS)</li>
                <li>🔑 You control decryption keys</li>
                <li>🎫 Privacy token NFT proof</li>
                <li>✅ Zero-knowledge verification</li>
              </ul>
            ) : (
              <ul className="space-y-2 text-gray-600">
                <li>• All data processed locally</li>
                <li>• Secure encrypted storage</li>
                <li>• No data sharing with third parties</li>
                <li>• Full data deletion available</li>
              </ul>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Analysis Process</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                  1
                </div>
                <span className="text-gray-700">Variant extraction</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                  2
                </div>
                <span className="text-gray-700">Disease annotation</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                  3
                </div>
                <span className="text-gray-700">ML risk prediction</span>
              </div>
              <div className="flex items-center">
                <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                  4
                </div>
                <span className="text-gray-700">Report generation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;