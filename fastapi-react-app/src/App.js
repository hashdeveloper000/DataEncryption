import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Styling.css';


const FileEncryptionApp = () => {
  const [file, setFile] = useState(null);
  const [key, setKey] = useState('');
  const [encryptedFile, setEncryptedFile] = useState(null);
  const [decryptedFile, setDecryptedFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pinataInfo, setPinataInfo] = useState(null);

  useEffect(() => {
   
  }, []); // Empty dependency array means it runs only once

const getPinataInfo = async () => {
  try {
    const response = await axios.get('http://localhost:8000/getInfo');
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

  const handleKeyChange = (event) => {
    setKey(event.target.value);
  };

  const handleEncrypt = async () => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/encrypt', formData);
      setEncryptedFile(response.data);
    } catch (error) {
      console.error('Error encrypting file:', error);
    }
  };

  const handleDecrypt = async () => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`http://localhost:8000/decrypt?key=${key}`, formData);
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
      const response = await axios.post('http://localhost:8000/upload', formData, {
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
      <h2>AES File Encryption and Decryption</h2>

      <div>
        <label htmlFor="fileInput">Choose a file to Encrypt :</label>
        <input type="file" id="fileInput" onChange={handleFileChange} />
      </div>
      
      <button onClick={handleEncrypt}>Encrypt</button>
      {encryptedFile && (
        <div>
          <p>Encrypted File : {encryptedFile.encrypted_filename}</p>
          <p>Key: {encryptedFile.key}</p>
           <p>Download: <a href={`http://localhost:8000/download/${encryptedFile.encrypted_filename}`} download>Download Encrypted File</a></p>
         
        </div>
      )}
      <button onClick={handleDecrypt}>Decrypt</button>
      <div>
        <label htmlFor="keyInput">Enter decryption key:</label>
        <input type="text" id="keyInput" placeholder="Decryption Key" value={key} onChange={handleKeyChange} />
      </div>



      {decryptedFile && (
        <div>
          <p>Decrypted File: {decryptedFile.decrypted_filename}</p>
          <p>Download: <a href={`http://localhost:8000/download/${decryptedFile.decrypted_filename}`} download>Download Decrypted File</a></p>
        </div>
      )}
 <br />
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
