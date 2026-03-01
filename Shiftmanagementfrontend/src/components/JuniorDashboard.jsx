import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRecordings, searchRecordings } from '../services/storageService';
import { PUMP_TYPES, PUMP_BRANDS, APPLICATION_AREAS } from '../utils/constants';
import { formatDate, isSpeechRecognitionSupported } from '../utils/helpers';
import './Dashboard.css';

const JuniorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Filter states
  const [selectedPumpType, setSelectedPumpType] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedApplication, setSelectedApplication] = useState('');
  
  // Voice search states
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  
  // Audio playback states
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  
  // Recent solutions
  const [recentSolutions, setRecentSolutions] = useState([]);
  
  // Refs
  const recognitionRef = useRef(null);
  const searchInputRef = useRef(null);
  const audioRef = useRef(null);

  // Load recent solutions on mount
  useEffect(() => {
    try {
      const allRecordings = getRecordings();
      setRecentSolutions(allRecordings.slice(0, 6));
    } catch (error) {
      console.error('Error loading recordings:', error);
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (isSpeechRecognitionSupported()) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setVoiceTranscript(finalTranscript);
          setSearchQuery(finalTranscript);
          performSearch(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access to use voice search.');
        } else {
          alert(`Error: ${event.error}. Please try again.`);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping recognition:', error);
        }
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Start voice search
  const startListening = async () => {
    if (recognitionRef.current) {
      try {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognitionRef.current.start();
        setIsListening(true);
        setVoiceTranscript('');
      } catch (error) {
        console.error('Microphone permission denied:', error);
        alert('Please allow microphone access to use voice search.');
      }
    } else {
      alert('Voice search is not supported in your browser. Please use Chrome, Edge, or Safari.');
    }
  };

  // Stop voice search
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      setIsListening(false);
    }
  };

  // Perform search
  const performSearch = (query) => {
    setIsSearching(true);
    
    // Simulate search delay
    setTimeout(() => {
      try {
        let results = searchRecordings(query);
        
        // Apply filters
        if (selectedPumpType) {
          results = results.filter(r => r.pumpType === selectedPumpType);
        }
        if (selectedBrand) {
          results = results.filter(r => r.pumpBrand === selectedBrand);
        }
        if (selectedApplication) {
          results = results.filter(r => r.application === selectedApplication);
        }
        
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  // Handle search submit
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  // Handle filter changes
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  }, [selectedPumpType, selectedBrand, selectedApplication]);

  // Clear all filters
  const clearFilters = () => {
    setSelectedPumpType('');
    setSelectedBrand('');
    setSelectedApplication('');
    setSearchQuery('');
    setSearchResults([]);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Play audio solution
  const playAudioSolution = (recording) => {
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      // If no audio URL, convert text to speech
      if (!recording.audioUrl) {
        const utterance = new SpeechSynthesisUtterance(
          `Problem: ${recording.problem}. Solution: ${recording.solution}`
        );
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.lang = 'en-US';
        
        window.speechSynthesis.speak(utterance);
        setCurrentlyPlaying(recording.id);
        
        utterance.onend = () => {
          setCurrentlyPlaying(null);
        };
        
        utterance.onerror = () => {
          setCurrentlyPlaying(null);
          alert('Error playing audio. Please try again.');
        };
      } else {
        // Play actual recorded audio
        audioRef.current = new Audio(recording.audioUrl);
        audioRef.current.play();
        setCurrentlyPlaying(recording.id);
        
        audioRef.current.onended = () => {
          setCurrentlyPlaying(null);
        };
        
        audioRef.current.onerror = () => {
          setCurrentlyPlaying(null);
          alert('Error playing audio. Please try again.');
        };
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setCurrentlyPlaying(null);
      alert('Error playing audio. Please try again.');
    }
  };

  // Stop audio playback
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    window.speechSynthesis.cancel();
    setCurrentlyPlaying(null);
  };

  // Handle logout
  const handleLogout = () => {
    stopAudio();
    logout();
    navigate('/login');
  };

  // Get suggestion chips based on common issues
  const getSuggestionChips = () => {
    return [
      'low pressure',
      'no flow',
      'leaking seal',
      'vibration',
      'overheating',
      'cavitation',
      'priming issue',
      'noisy operation'
    ];
  };

  return (
    <div className="dashboard junior-dashboard">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="brand-icon">🔄</span>
          PumpSync - Junior Technician
        </div>
        <div className="nav-user">
          <img 
            src={user?.avatar || 'https://via.placeholder.com/40'} 
            alt={user?.name || 'User'} 
            className="user-avatar" 
          />
          <span className="user-name">{user?.name || 'Technician'}</span>
          <button onClick={handleLogout} className="logout-btn">
            <span>🚪</span> Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Welcome, {user?.name || 'Technician'}! 👨</h1>
          <p>Search for pump solutions using text or voice. Learn from experienced technicians.</p>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <h2>🔍 Search Pump Solutions</h2>
          
          {/* Filters Row */}
          <div className="filters-row">
            <div className="filter-group">
              <label>Pump Type</label>
              <select
                value={selectedPumpType}
                onChange={(e) => setSelectedPumpType(e.target.value)}
                className="filter-select"
              >
                <option value="">All Pump Types</option>
                {PUMP_TYPES.map(pump => (
                  <option key={pump.id} value={pump.name}>{pump.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Brand</label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="filter-select"
              >
                <option value="">All Brands</option>
                {PUMP_BRANDS.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Application</label>
              <select
                value={selectedApplication}
                onChange={(e) => setSelectedApplication(e.target.value)}
                className="filter-select"
              >
                <option value="">All Applications</option>
                {APPLICATION_AREAS.map(app => (
                  <option key={app} value={app}>{app}</option>
                ))}
              </select>
            </div>

            <button onClick={clearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          </div>

          {/* Search Box with Voice */}
          <form onSubmit={handleSearch} className="search-box">
            <div className="search-input-wrapper">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type or speak your problem (e.g., 'centrifugal pump low pressure', 'seal leaking')"
                className="search-input"
              />
              {searchQuery && (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  className="clear-search"
                >
                  ✕
                </button>
              )}
            </div>
            
            <button type="submit" className="search-btn" disabled={isSearching}>
              {isSearching ? '⏳' : '🔍'}
            </button>
            
            <button 
              type="button" 
              onClick={isListening ? stopListening : startListening}
              className={`mic-btn ${isListening ? 'listening' : ''}`}
              disabled={isSearching}
            >
              {isListening ? '⏹️' : '🎤'}
            </button>
          </form>

          {/* Voice Search Status */}
          {isListening && (
            <div className="listening-indicator">
              <span className="pulse-small"></span>
              Listening... Speak clearly
              {voiceTranscript && (
                <div className="voice-transcript">
                  Heard: "{voiceTranscript}"
                </div>
              )}
            </div>
          )}

          {/* Search Suggestions */}
          {!searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="search-suggestions">
              <p>Try searching for:</p>
              <div className="suggestion-chips">
                {getSuggestionChips().map((suggestion, index) => (
                  <button
                    key={index}
                    className="suggestion-chip"
                    onClick={() => {
                      setSearchQuery(suggestion);
                      performSearch(suggestion);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className="search-results">
            {isSearching ? (
              <div className="searching-indicator">
                <div className="spinner-small"></div>
                Searching knowledge base...
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="results-header">
                  <h3>Found {searchResults.length} solution(s)</h3>
                  {(selectedPumpType || selectedBrand || selectedApplication) && (
                    <span className="active-filters">
                      Active filters: {
                        [selectedPumpType, selectedBrand, selectedApplication]
                          .filter(Boolean)
                          .join(' • ')
                      }
                    </span>
                  )}
                </div>
                
                <div className="results-grid">
                  {searchResults.map(result => (
                    <div key={result.id} className="result-card">
                      <div className="result-header">
                        <div className="result-title">
                          <h4>{result.pumpType || 'Pump'}</h4>
                          {result.pumpBrand && (
                            <span className="pump-brand-tag">{result.pumpBrand}</span>
                          )}
                        </div>
                        <span className="result-date">{formatDate(result.date)}</span>
                      </div>

                      <div className="result-tags">
                        {result.application && (
                          <span className="tag">📍 {result.application}</span>
                        )}
                        {result.failedComponent && (
                          <span className="tag">🔧 {result.failedComponent}</span>
                        )}
                        <span className={`tag criticality-${result.criticality || 'medium'}`}>
                          ⚡ {result.criticality || 'medium'} criticality
                        </span>
                      </div>

                      <div className="result-content">
                        <div className="problem-section">
                          <h5>⚠️ Problem:</h5>
                          <p>{result.problem}</p>
                        </div>
                        
                        <div className="solution-section">
                          <h5>✅ Solution:</h5>
                          <p>{result.solution}</p>
                        </div>

                        {(result.toolsUsed || result.spareParts) && (
                          <div className="resources-section">
                            {result.toolsUsed && (
                              <p><strong>🛠️ Tools:</strong> {result.toolsUsed}</p>
                            )}
                            {result.spareParts && (
                              <p><strong>📦 Parts:</strong> {result.spareParts}</p>
                            )}
                          </div>
                        )}

                        {/* Voice/Text Solution */}
                        <div className="solution-actions">
                          {currentlyPlaying === result.id ? (
                            <button 
                              onClick={stopAudio}
                              className="action-btn stop-btn"
                            >
                              ⏹️ Stop Playing
                            </button>
                          ) : (
                            <button 
                              onClick={() => playAudioSolution(result)}
                              className="action-btn play-btn"
                            >
                              🔊 Listen to Solution
                            </button>
                          )}
                          
                          {result.audioUrl && (
                            <div className="audio-indicator">
                              <span>📢 Voice recording available</span>
                            </div>
                          )}
                        </div>

                        <div className="technician-info">
                          <img 
                            src={result.technicianAvatar || 'https://via.placeholder.com/24'} 
                            alt={result.technician}
                            className="tech-avatar-small"
                          />
                          <span>
                            <strong>{result.technician}</strong> (Senior Technician)
                          </span>
                        </div>
                      </div>

                      <div className="result-footer">
                        <button className="helpful-btn">👍 Helpful</button>
                        <button className="not-helpful-btn">👎 Not Helpful</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : searchQuery && !isSearching ? (
              <div className="no-results">
                <p>🔍 No solutions found for "{searchQuery}"</p>
                <p className="no-results-suggestion">
                  Try:
                  <br />• Using different keywords
                  <br />• Checking your filters
                  <br />• Asking a senior technician
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Recent Solutions Section */}
        {recentSolutions.length > 0 && (
          <div className="recent-solutions">
            <h3>📋 Recent Solutions from Seniors</h3>
            <div className="solutions-grid">
              {recentSolutions.map(solution => (
                <div 
                  key={solution.id} 
                  className="solution-card"
                  onClick={() => {
                    setSearchQuery(solution.problem.split(' ').slice(0, 3).join(' '));
                    performSearch(solution.problem.split(' ').slice(0, 3).join(' '));
                  }}
                >
                  <h4>{solution.pumpType || 'Pump Issue'}</h4>
                  <p className="solution-preview">{solution.problem.substring(0, 60)}...</p>
                  <div className="solution-meta">
                    <span className="tech-name">👤 {solution.technician}</span>
                    <span className="solution-date">{formatDate(solution.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Global Audio Player (hidden) */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
};

export default JuniorDashboard;