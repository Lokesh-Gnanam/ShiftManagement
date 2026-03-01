import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { saveRecording, getRecordings } from '../services/storageService';
import { 
  PUMP_TYPES, 
  PUMP_BRANDS, 
  COMMON_PUMP_ISSUES,
  PUMP_COMPONENTS,
  APPLICATION_AREAS,
  PLANT_AREAS,
  CRITICALITY_LEVELS
} from '../utils/constants';
import { formatDate } from '../utils/helpers';
import './Dashboard.css';

const SeniorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState([]);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState('problem');
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Form states - Pump specific
  const [selectedPump, setSelectedPump] = useState('');
  const [pumpBrand, setPumpBrand] = useState('');
  const [pumpModel, setPumpModel] = useState('');
  const [plantArea, setPlantArea] = useState('');
  const [application, setApplication] = useState('');
  const [criticality, setCriticality] = useState('medium');
  const [failedComponent, setFailedComponent] = useState('');
  const [problemText, setProblemText] = useState('');
  const [solutionText, setSolutionText] = useState('');
  const [toolsUsed, setToolsUsed] = useState('');
  const [spareParts, setSpareParts] = useState('');
  const [estimatedDowntime, setEstimatedDowntime] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Speech recognition
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Load existing recordings
    const savedRecordings = getRecordings();
    if (user?.name) {
      setRecordings(savedRecordings.filter(rec => rec.technician === user.name));
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported. Please use Chrome, Edge, or Safari.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user]);

  const initializeRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        
        if (recordingType === 'problem') {
          setProblemText(prev => prev + finalTranscript);
        } else {
          setSolutionText(prev => prev + finalTranscript);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      stopRecording();
      
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access.');
      } else {
        alert(`Error: ${event.error}. Please try again.`);
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        try {
          recognition.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
          setIsRecording(false);
        }
      }
    };

    return recognition;
  };

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }

    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async (type) => {
    if (!selectedPump) {
      alert('Please select a pump type first');
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setRecordingType(type);
      setTranscript('');
      
      const recognition = initializeRecognition();
      recognitionRef.current = recognition;
      
      recognition.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      recognitionRef.current = null;
    }
  };

  const handleSaveRecording = () => {
    if (!selectedPump) {
      alert('Please select a pump type');
      return;
    }
    if (!problemText.trim()) {
      alert('Please describe the problem');
      return;
    }
    if (!solutionText.trim()) {
      alert('Please describe the solution');
      return;
    }

    setIsProcessing(true);

    const newRecording = {
      id: Date.now(),
      pumpType: selectedPump,
      pumpBrand,
      pumpModel,
      plantArea,
      application,
      criticality,
      failedComponent,
      problem: problemText.trim(),
      solution: solutionText.trim(),
      toolsUsed,
      spareParts,
      estimatedDowntime,
      technician: user?.name,
      technicianAvatar: user?.avatar,
      date: new Date().toISOString(),
      timestamp: new Date().toLocaleString()
    };
    
    saveRecording(newRecording);
    setRecordings([newRecording, ...recordings]);
    
    // Reset form
    setSelectedPump('');
    setPumpBrand('');
    setPumpModel('');
    setPlantArea('');
    setApplication('');
    setCriticality('medium');
    setFailedComponent('');
    setProblemText('');
    setSolutionText('');
    setToolsUsed('');
    setSpareParts('');
    setEstimatedDowntime('');
    setTranscript('');

    setIsProcessing(false);
    alert('✅ Pump knowledge saved successfully!');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const clearForm = () => {
    if (window.confirm('Clear all fields?')) {
      setSelectedPump('');
      setPumpBrand('');
      setPumpModel('');
      setPlantArea('');
      setApplication('');
      setCriticality('medium');
      setFailedComponent('');
      setProblemText('');
      setSolutionText('');
      setToolsUsed('');
      setSpareParts('');
      setEstimatedDowntime('');
      setTranscript('');
    }
  };

  return (
    <div className="dashboard senior-dashboard">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="brand-icon">🔄</span>
          PumpSync - Senior Technician
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
          <h1>Welcome back, {user?.name || 'Technician'}! 👴</h1>
          <p>Share your valuable pump maintenance knowledge with the next generation of technicians.</p>
        </div>

        <div className="recording-section">
          <h2>🔄 Record New Pump Knowledge</h2>
          
          <div className="form-row">
            <div className="form-group half">
              <label>Pump Type *</label>
              <select
                value={selectedPump}
                onChange={(e) => setSelectedPump(e.target.value)}
                disabled={isRecording}
              >
                <option value="">Select pump type</option>
                {PUMP_TYPES.map(pump => (
                  <option key={pump.id} value={pump.name}>{pump.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group half">
              <label>Brand</label>
              <select
                value={pumpBrand}
                onChange={(e) => setPumpBrand(e.target.value)}
                disabled={isRecording}
              >
                <option value="">Select brand</option>
                {PUMP_BRANDS.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label>Model/Serial</label>
              <input
                type="text"
                value={pumpModel}
                onChange={(e) => setPumpModel(e.target.value)}
                placeholder="e.g., CR-32-8"
                disabled={isRecording}
              />
            </div>

            <div className="form-group half">
              <label>Plant Area</label>
              <select
                value={plantArea}
                onChange={(e) => setPlantArea(e.target.value)}
                disabled={isRecording}
              >
                <option value="">Select area</option>
                {PLANT_AREAS.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label>Application</label>
              <select
                value={application}
                onChange={(e) => setApplication(e.target.value)}
                disabled={isRecording}
              >
                <option value="">Select application</option>
                {APPLICATION_AREAS.map(app => (
                  <option key={app} value={app}>{app}</option>
                ))}
              </select>
            </div>

            <div className="form-group half">
              <label>Criticality</label>
              <select
                value={criticality}
                onChange={(e) => setCriticality(e.target.value)}
                disabled={isRecording}
              >
                {CRITICALITY_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Failed Component (if any)</label>
            <select
              value={failedComponent}
              onChange={(e) => setFailedComponent(e.target.value)}
              disabled={isRecording}
            >
              <option value="">Select component</option>
              {PUMP_COMPONENTS.map(component => (
                <option key={component} value={component}>{component}</option>
              ))}
            </select>
          </div>

          <div className="voice-controls">
            <div className="recording-status">
              {isRecording && (
                <div className="recording-indicator">
                  <span className="pulse"></span>
                  Recording {recordingType === 'problem' ? 'Problem' : 'Solution'}... 
                  ({formatTime(recordingTime)})
                </div>
              )}
            </div>

            <div className="recording-buttons">
              <button 
                onClick={() => startRecording('problem')}
                className={`record-btn ${recordingType === 'problem' && isRecording ? 'active' : ''}`}
                disabled={isRecording || !selectedPump}
              >
                <span>🎤</span> Record Problem
              </button>
              
              <button 
                onClick={() => startRecording('solution')}
                className={`record-btn ${recordingType === 'solution' && isRecording ? 'active' : ''}`}
                disabled={isRecording || !selectedPump}
              >
                <span>🎤</span> Record Solution
              </button>
              
              {isRecording && (
                <button onClick={stopRecording} className="record-btn stop">
                  <span>⏹️</span> Stop Recording
                </button>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Problem Description *</label>
            <textarea
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              placeholder="Describe the pump problem in detail (symptoms, when it occurs, etc.)"
              rows="3"
              disabled={isRecording}
            />
            {recordingType === 'problem' && isRecording && transcript && (
              <div className="live-transcript">
                <small>🎤 Speaking: {transcript}</small>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Solution Steps *</label>
            <textarea
              value={solutionText}
              onChange={(e) => setSolutionText(e.target.value)}
              placeholder="Describe step-by-step how to fix the problem..."
              rows="4"
              disabled={isRecording}
            />
            {recordingType === 'solution' && isRecording && transcript && (
              <div className="live-transcript">
                <small>🎤 Speaking: {transcript}</small>
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label>Tools Used</label>
              <input
                type="text"
                value={toolsUsed}
                onChange={(e) => setToolsUsed(e.target.value)}
                placeholder="e.g., Wrench, Multimeter, Puller"
                disabled={isRecording}
              />
            </div>

            <div className="form-group half">
              <label>Spare Parts Needed</label>
              <input
                type="text"
                value={spareParts}
                onChange={(e) => setSpareParts(e.target.value)}
                placeholder="e.g., Mechanical Seal, Bearings"
                disabled={isRecording}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Estimated Downtime</label>
            <input
              type="text"
              value={estimatedDowntime}
              onChange={(e) => setEstimatedDowntime(e.target.value)}
              placeholder="e.g., 2 hours, 1 day"
              disabled={isRecording}
            />
          </div>

          <div className="action-buttons">
            <button 
              onClick={clearForm}
              className="clear-btn"
              disabled={isRecording || isProcessing}
            >
              🗑️ Clear
            </button>
            
            <button 
              onClick={handleSaveRecording} 
              className="save-btn"
              disabled={!selectedPump || !problemText.trim() || !solutionText.trim() || isRecording || isProcessing}
            >
              {isProcessing ? '💾 Saving...' : '💾 Save to Knowledge Base'}
            </button>
          </div>
        </div>

        <div className="recent-recordings">
          <h3>📚 Your Recent Pump Knowledge Contributions</h3>
          {recordings.length === 0 ? (
            <p className="no-data">No pump solutions yet. Start by recording a solution above!</p>
          ) : (
            <div className="recordings-list">
              {recordings.map(recording => (
                <div key={recording.id} className="recording-card">
                  <div className="recording-header">
                    <div>
                      <h4>{recording.pumpType}</h4>
                      {recording.pumpBrand && (
                        <span className="pump-brand">{recording.pumpBrand}</span>
                      )}
                    </div>
                    <span className="recording-date">{formatDate(recording.date)}</span>
                  </div>
                  
                  <div className="recording-tags">
                    {recording.plantArea && (
                      <span className="tag">📍 {recording.plantArea}</span>
                    )}
                    {recording.application && (
                      <span className="tag">⚙️ {recording.application}</span>
                    )}
                    <span className={`tag criticality-${recording.criticality}`}>
                      🔴 {recording.criticality} criticality
                    </span>
                  </div>

                  <div className="recording-body">
                    <p><strong>⚠️ Problem:</strong> {recording.problem}</p>
                    <p><strong>✅ Solution:</strong> {recording.solution}</p>
                    
                    {recording.failedComponent && (
                      <p><strong>🔧 Failed Component:</strong> {recording.failedComponent}</p>
                    )}
                    
                    {(recording.toolsUsed || recording.spareParts) && (
                      <div className="resources-used">
                        {recording.toolsUsed && (
                          <p><strong>🛠️ Tools:</strong> {recording.toolsUsed}</p>
                        )}
                        {recording.spareParts && (
                          <p><strong>📦 Parts:</strong> {recording.spareParts}</p>
                        )}
                      </div>
                    )}
                    
                    {recording.estimatedDowntime && (
                      <p><strong>⏱️ Downtime:</strong> {recording.estimatedDowntime}</p>
                    )}
                    
                    <div className="recording-meta">
                      <small>Recorded by: {recording.technician} on {recording.timestamp}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeniorDashboard;