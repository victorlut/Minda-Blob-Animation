export const getAudioContext = async () => {
    // Check for browser support for the Web Audio API
    const AudioContext = window.AudioContext;
    if (!AudioContext) {
        throw new Error('Web Audio API is not supported by this browser');
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();

    // Get microphone input
    navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia ||
                     (navigator.mediaDevices as any).webkitGetUserMedia ||
                     (navigator.mediaDevices as any).mozGetUserMedia;
    const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(microphone);
    
    // Connect microphone source to analyser
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    // Set analyser settings
    analyser.fftSize = 4096;

    return { analyser, audioContext };
};