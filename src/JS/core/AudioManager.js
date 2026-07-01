import { settings } from '../config/SimulationConfig.js';

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

export function playCollisionSound(intensity) {
    if (!settings.sound || intensity < 0.02) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(7500, audioContext.currentTime);
    
    const volume = Math.min(0.15, intensity * 0.05);
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.04);
    oscillator.stop(audioContext.currentTime + 0.05);
}