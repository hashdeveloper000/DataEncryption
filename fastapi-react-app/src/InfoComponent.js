// InfoComponent.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const InfoComponent = () => {
  const [pinataData, setPinataData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:8000/getInfo');
        setPinataData(response.data);
      } catch (error) {
        console.error('Error fetching Pinata data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2>Pinata Info</h2>
      {loading ? (
        <p>Loading...</p>
      ) : pinataData ? (
        <div>
          <p>Number of Pins: {pinataData.pinCount}</p>
          <p>Last Pin Timestamp: {pinataData.lastPinTimestamp}</p>
        </div>
      ) : (
        <p>No Pinata data available.</p>
      )}
    </div>
  );
};

export default InfoComponent;
