// Get all recordings
export const getRecordings = () => {
  try {
    const recordings = localStorage.getItem('recordings');
    return recordings ? JSON.parse(recordings) : [];
  } catch (error) {
    console.error('Error getting recordings:', error);
    return [];
  }
};

// Search recordings
export const searchRecordings = (query) => {
  try {
    const recordings = getRecordings();
    if (!query || query.trim() === '') return recordings;
    
    const lowerQuery = query.toLowerCase().trim();
    return recordings.filter(recording => {
      return (
        (recording.problem && recording.problem.toLowerCase().includes(lowerQuery)) ||
        (recording.solution && recording.solution.toLowerCase().includes(lowerQuery)) ||
        (recording.pumpType && recording.pumpType.toLowerCase().includes(lowerQuery)) ||
        (recording.failedComponent && recording.failedComponent.toLowerCase().includes(lowerQuery))
      );
    });
  } catch (error) {
    console.error('Error searching recordings:', error);
    return [];
  }
};

// Save recording
export const saveRecording = (recording) => {
  try {
    const recordings = getRecordings();
    recordings.unshift(recording);
    localStorage.setItem('recordings', JSON.stringify(recordings));
    return true;
  } catch (error) {
    console.error('Error saving recording:', error);
    return false;
  }
};