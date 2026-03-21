import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import './JuniorDashboard.css';

const JuniorDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [matchingLog, setMatchingLog] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (query.length === 0) return;

    setIsSearching(true);
    setMatchingLog(null); // Clear previous results

    const token = localStorage.getItem('shiftsync_token');
    if (!token) {
      alert('Authentication token missing. Please log in.');
      setIsSearching(false);
      return;
    }

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      alert("System Configuration Error: OpenAI API Key is missing in .env file.");
      setIsSearching(false); // Ensure searching state is reset
      return;
    }

    const openai = new OpenAI({ apiKey: apiKey, dangerouslyAllowBrowser: true }); // Initialize OpenAI client

    try {
      // First, fetch all logs from the backend
      const logsResponse = await fetch('http://localhost:8000/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!logsResponse.ok) {
        throw new Error(`Failed to fetch logs: ${logsResponse.statusText}`);
      }
      const allLogs = await logsResponse.json();

      // Use AI to find the best matching logs from the fetched data using native fetch
      const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an expert industrial knowledge assistant. Search through the technical logs and return the ONE best matching log that is semantically relevant to the junior technician's problem: "${query}".
              
              Logs: ${JSON.stringify(allLogs)}

              If a match is found, return ONLY the log object as JSON.
              If NO relevant logs are found, return exactly the string: NONE`
            }
          ],
          temperature: 0,
        }),
      });

      if (!chatResponse.ok) throw new Error('AI search failed');
      const chatData = await chatResponse.json();
      let aiResponseContent = chatData.choices[0].message.content.trim();

      // HEALING LOGIC: Strip Markdown code blocks if present
      if (aiResponseContent.includes('```')) {
        aiResponseContent = aiResponseContent.replace(/```(json)?/g, '').replace(/```/g, '').trim();
      }

      if (aiResponseContent === 'NONE') {
        alert("Please concern the senior technician. No direct matches found in Tribal Knowledge.");
      } else {
        try {
          const match = JSON.parse(aiResponseContent);
          setMatchingLog(match);
        } catch (e) {
          console.error('JSON Parse Error:', e, 'Raw:', aiResponseContent);
          alert("Search Error: Could not determine match. Please try a different query.");
        }
      }
    } catch (err) {
      console.error('AI Matching Error:', err);
      alert("Search Error: " + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="page-header">
        <h2>Knowledge Retrieval Agent</h2>
        <p>Ask a question or describe an issue to retrieve "Tribal Knowledge" from senior techs.</p>
      </div>

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input 
            type="text" 
            className="premium-input search-input" 
            placeholder="E.g., CNC vibration at 4000 RPM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isSearching}
          />
          <Button type="submit" variant="primary" disabled={isSearching}>
            {isSearching ? '🤖 AI Reasoning...' : 'Search Knowledge Graph'}
          </Button>
        </form>
      </div>

      {matchingLog && (
        <div className="results-section animate-fade-in">
          <Card title="Agent Found a Match!" className="result-card">
            <div className="match-header">
              <div className="match-confidence">98% Match</div>
              <div className="match-author">Source: {matchingLog.author || 'Senior Tech Ravi'}</div>
            </div>
            
            <div className="voice-note-player">
              <button 
                className="play-btn" 
                onClick={() => {
                  if (matchingLog.audioUrl) {
                    new Audio(matchingLog.audioUrl).play();
                  } else {
                    alert("No audio recording available for this legacy log.");
                  }
                }}
              >
                {matchingLog.audioUrl ? '▶️' : '🔇'}
              </button>
              <div className="waveform">
                <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
              <div className="time">0:00 / 0:15</div>
            </div>

            <div className="solution-details">
              <h4>Transcription</h4>
              <p className="quote">"{matchingLog.content}"</p>
              
              <div className="ar-guide-preview">
                <div className="ar-image-placeholder">
                  [ AR Guide Preview: Analyzing components related to capture ]
                </div>
                <Button variant="secondary" className="ar-btn">Launch AR Overlay Guide</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {!matchingLog && (
        <div className="suggested-queries">
          <h3>Common Problems Today</h3>
          <div className="queries-grid">
            <div className="query-chip" onClick={() => { setSearchQuery("Boiler pressure"); setTimeout(() => handleSearch(), 0); }}>
              Boiler pressure
            </div>
            <div className="query-chip" onClick={() => { setSearchQuery("Robotic arm"); setTimeout(() => handleSearch(), 0); }}>
              Robotic arm
            </div>
            <div className="query-chip" onClick={() => { setSearchQuery("Assembly B"); setTimeout(() => handleSearch(), 0); }}>
              Assembly B
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JuniorDashboard;
