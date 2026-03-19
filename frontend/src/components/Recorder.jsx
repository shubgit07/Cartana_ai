import React, { useState, useRef } from 'react';
import axios from 'axios';

const Recorder = ({ onJobCreated }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        await uploadAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const uploadAudio = async (blob) => {
    const formData = new FormData();
    // Use a default user_id of 1 for MVP
    formData.append('user_id', '1');
    formData.append('file', blob, 'recording.webm');

    try {
      // Assuming Vite proxy or direct full URL
      const response = await axios.post('http://localhost:8000/process-input', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data && response.data.job_id) {
        onJobCreated(response.data.job_id);
      }
    } catch (err) {
      console.error("Error uploading audio", err);
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md text-center">
      <h2 className="text-xl font-bold mb-4">Voice input</h2>
      <button 
        onClick={isRecording ? stopRecording : startRecording}
        className={`px-6 py-3 rounded-full text-white font-semibold transition-colors ${
          isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {isRecording && <p className="mt-2 text-red-500 text-sm">Recording in progress...</p>}
    </div>
  );
};

export default Recorder;
