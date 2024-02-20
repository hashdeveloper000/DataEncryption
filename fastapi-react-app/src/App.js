import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Styling.css';

const FileEncryptionApp = () => {
  const [file, setFile] = useState(null);
//  const [key, setKey] = useState('');
  const [encryptedFile, setEncryptedFile] = useState(null);
  const [decryptedFile, setDecryptedFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pinataInfo, setPinataInfo] = useState(null);
  const [keys, setKeys] = useState(null);

  useEffect(() => {
    // Fetch Pinata information on component mount
    getPinataInfo();
  }, []); // Empty dependency array means it runs only once

  const generateKeys = async () => {
    try {
      const response = await axios.get('https://standardencyptionprotocolstest.onrender.com/generate_keys');
      setKeys(response.data);
    } catch (error) {
      console.error('Error generating keys:', error);
    }
  };

  const getPinataInfo = async () => {
    try {
      const response = await axios.get('https://standardencyptionprotocolstest.onrender.com/getInfo');
      console.log('Pinata response:', response); // Log the response for inspection

      const firstRow = response.data.rows[0];

      setPinataInfo({
        number_of_pins: response.data.count || 0,
  ipfs_hash: firstRow ? firstRow.ipfs_pin_hash : null,
  last_pin_timestamp: firstRow ? firstRow.date_pinned : null,
  id: firstRow ? firstRow.id : null,
  size: firstRow ? firstRow.size : null,
  user_id: firstRow ? firstRow.user_id : null,
        metadata: firstRow && firstRow.metadata
          ? {
              name: firstRow.metadata.name || null,
              keyvalues: firstRow.metadata.keyvalues || null,
            }
            : null,
            regions: firstRow && firstRow.regions
              ? firstRow.regions.map(region => ({
                  regionId: region.regionId || null,
                  currentReplicationCount: region.currentReplicationCount || null,
                  desiredReplicationCount: region.desiredReplicationCount || null,
                }))
              : null,
            mime_type: firstRow ? firstRow.mime_type : null,
            number_of_files: firstRow ? firstRow.number_of_files : null,
          });
    } catch (error) {
      console.error('Error fetching Pinata data:', error);
    }
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  //const handleKeyChange = (event) => {
  //  setKey(event.target.value);
 // };

  const [userPublicKey, setUserPublicKey] = useState('');


  const handleEncrypt = async () => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('https://standardencyptionprotocolstest.onrender.com/encrypt', formData, {
        params: { public_key: userPublicKey },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setEncryptedFile(response.data);
    } catch (error) {
      console.error('Error encrypting file:', error);
    }
  };

  const [userPrivateKey, setUserPrivateKey] = useState('');

  const handleDecrypt = async () => {
    // Check if userPrivateKey is not empty
    if (!userPrivateKey) {
      console.error('Please enter decryption key');
      return;
    }

    const formattedPrivateKey = userPrivateKey.startsWith('0x') ? userPrivateKey : `0x${userPrivateKey}`;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('https://standardencyptionprotocolstest.onrender.com/decrypt', formData, {
        params: { private_key: formattedPrivateKey },
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setDecryptedFile(response.data);
    } catch (error) {
      console.error('Error decrypting file:', error);
    }
  };

  const handleUpload = async () => {
    // To Check if a file is selected
    if (!file) {
      console.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('https://standardencyptionprotocolstest.onrender.com/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });


      setUploadedFile(response.data);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  return (
    <div>
      <h2> ESS File Encryption and Decryption</h2>

      <div>
        <button onClick={generateKeys}>Generate Keys</button>
      </div>

      {keys && (
        <div>
          <p>Private Key: {keys.private_key}</p>
          <p>Public Key: {keys.public_key}</p>
        </div>
      )}

      <div>
        <label htmlFor="fileInput">Choose a file to Encrypt :</label>
        <input type="file" id="fileInput" onChange={handleFileChange} />
      </div>

      <div>
  <label htmlFor="publicKeyInput">Enter recipient's public key:</label>
  <input
    type="text"
    id="publicKeyInput"
    placeholder="Recipient's Public Key"
    value={userPublicKey}
    onChange={(e) => setUserPublicKey(e.target.value)}
  />
</div>

      <button onClick={handleEncrypt}>Encrypt</button>
      {encryptedFile && (
          <div>
            <p>Encrypted File : {encryptedFile.encrypted_filename}</p>
            <p>Key: {encryptedFile.key}</p>
            <p>Download: <a
                href={`https://standardencyptionprotocolstest.onrender.com/download/${encryptedFile.encrypted_filename}`}
                download>Download Encrypted File</a></p>
          </div>
      )}


      <div>
        <label htmlFor="keyInput">Enter decryption key:</label>
        <input type="text" id="keyInput" placeholder="Decryption Key" value={userPrivateKey} onChange={(e) => setUserPrivateKey(e.target.value)} />
</div>

<button onClick={handleDecrypt}>Decrypt</button>

      {decryptedFile && (
          <div>
            <p>Decrypted File: {decryptedFile.decrypted_filename}</p>
            <p>Download: <a
                href={`https://standardencyptionprotocolstest.onrender.com/download/${decryptedFile.decrypted_filename}`}
                download>Download Decrypted File</a></p>
          </div>
      )}

      <div>
        <label htmlFor="uploadFileInput">Choose a file for upload to IPFS :</label>
        <input type="file" id="uploadFileInput" onChange={handleFileChange} />
      </div>

      <button onClick={handleUpload}>Upload to Pinata</button>

{uploadedFile && (
  <div>
    <p>File Uploaded to Pinata:</p>
    <p>Pinata Response: {JSON.stringify(uploadedFile)}</p>
  </div>
)}

<button onClick={getPinataInfo}>Get Pinata Info</button>

{pinataInfo && (
  <div>
    <h2>Pinata Info</h2>
    <p>ID: {pinataInfo.id}</p>
    <p>IPFS Hash: {pinataInfo.ipfs_hash}</p>
    <p>Last Pin Timestamp: {pinataInfo.last_pin_timestamp}</p>
    <p>Number of Pins: {pinataInfo.number_of_pins}</p>
    <p>Size: {pinataInfo.size}</p>
    <p>User ID: {pinataInfo.user_id}</p>
                        
    {pinataInfo.metadata && (
<div>
  <h3>Metadata</h3>
  <p>File Name: {pinataInfo.metadata.name}</p>
</div>
)}
<p>File Type: {pinataInfo.mime_type}</p>
<p>Number of Files: {pinataInfo.number_of_files}</p>
</div>

  
)}
</div>
);
};

export default FileEncryptionApp;

