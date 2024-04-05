export const getAudioContext = (file: string) => {
    const audioContext = new window.AudioContext();
    const analyser = audioContext.createAnalyser();

    // Load audio file
    const audioElement = new Audio(file);
    const source = audioContext.createMediaElementSource(audioElement);

    // Connect audio source to analyser
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    // Set analyser settings
    analyser.fftSize = 2048;
    // const bufferLength = analyser.frequencyBinCount;
    // const dataArray = new Uint8Array(bufferLength);

    return {audioElement, analyser, audioContext};
};