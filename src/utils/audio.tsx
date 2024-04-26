export const getAudioContext = () => {
    // Check for browser support for the Web Audio API
    const AudioContext = window.AudioContext;
    if (!AudioContext) {
        throw new Error('Web Audio API is not supported by this browser');
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();

    // Get microphone input
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            
            // Connect microphone source to analyser
            source.connect(analyser);
            analyser.connect(audioContext.destination);
        })
        .catch(err => {
            console.error('Error accessing microphone:', err);
        });

    // Set analyser settings
    analyser.fftSize = 2048;

    return { analyser, audioContext };
};