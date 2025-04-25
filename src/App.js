import React, { useState, useRef } from 'react';
import axios from 'axios';

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [mediaBlob, setMediaBlob] = useState(null);
    const [audioURL, setAudioURL] = useState('');
    const [transcript, setTranscript] = useState('');
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const mediaRecorderRef = useRef(null);
    const audioChunks = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunks.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
                setMediaBlob(blob);
                setAudioURL(URL.createObjectURL(blob));
                await sendToBackend(blob); // Immediately send to backend after stopping
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setConfirmationMessage('Recording...');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            setConfirmationMessage('Error accessing microphone.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setConfirmationMessage('Processing audio...');
        }
    };

    const sendToBackend = async (blob) => {
        if (!blob) return;

        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');

        try {
            const response = await axios.post('http://localhost:3001/process-command', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setTranscript(response.data.transcript || '');
            setConfirmationMessage('Transcription received. You can edit it.');
        } catch (error) {
            console.error('Error sending audio:', error);
            setConfirmationMessage('Error processing the audio.');
        }
    };

    const confirmCommand = async () => {
        if (!transcript.trim()) {
            setConfirmationMessage('Please enter or receive a transcript to confirm.');
            return;
        }

        try {
            const response = await axios.post('http://localhost:3001/save-command', { transcript: transcript.trim() }, {
                headers: { 'Content-Type': 'application/json' },
            });

            setConfirmationMessage(response.data.message || 'Command confirmed successfully!');
            setTranscript(''); // Clear transcript after confirmation
            setMediaBlob(null);
            setAudioURL('');
        } catch (error) {
            console.error('Error confirming command:', error);
            setConfirmationMessage('Error confirming the command.');
        }
    };

    const handleTranscriptChange = (event) => {
        setTranscript(event.target.value);
        setConfirmationMessage(''); // Clear confirmation message on edit
    };

    return (
        <div style={{ padding: '2rem', fontFamily: 'Arial', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1>🎤 Voice Command App</h1>

            <div style={{ marginBottom: '1rem' }}>
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    style={{
                        padding: '1rem',
                        fontSize: '1rem',
                        backgroundColor: isRecording ? '#f44336' : '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        marginRight: '1rem',
                    }}
                >
                    {isRecording ? '⏹ Stop Recording' : '🎙 Start Recording'}
                </button>
            </div>

            {audioURL && (
                <div style={{ marginBottom: '1rem' }}>
                    <audio src={audioURL} controls />
                </div>
            )}

            <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3>📝 Edit Transcript:</h3>
                <textarea
                    value={transcript}
                    onChange={handleTranscriptChange}
                    rows={5}
                    cols={50}
                    placeholder="Recording will be transcribed here. You can edit it."
                    style={{ padding: '0.5rem', fontSize: '1rem', borderRadius: '5px', border: '1px solid #ccc', marginBottom: '0.5rem' }}
                />
                <button
                    onClick={confirmCommand}
                    disabled={!transcript.trim()}
                    style={{
                        padding: '1rem',
                        fontSize: '1rem',
                        backgroundColor: transcript.trim() ? '#007bff' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: transcript.trim() ? 'pointer' : 'not-allowed',
                    }}
                >
                    ✅ Confirm Command
                </button>
            </div>

            {confirmationMessage && (
                <p style={{ fontWeight: 'bold', marginTop: '1rem' }}>{confirmationMessage}</p>
            )}
        </div>
    );
}

export default App;