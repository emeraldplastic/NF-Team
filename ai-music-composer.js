/**
 * AI Music Composer for NF-Team
 * Generative music based on mood/style parameters
 */

class AIMusicComposer {
    constructor() {
        this.apiEndpoint = null; // Configure with your AI music API endpoint
        this.apiKey = null; // Configure with your API key
        this.isComposing = false;
        this.audioContext = null;
        this.compositions = [];
        this.moodPresets = [
            { name: 'Energetic', tempo: 140, scale: 'minor', energy: 0.9 },
            { name: 'Calm', tempo: 80, scale: 'major', energy: 0.3 },
            { name: 'Mysterious', tempo: 100, scale: 'harmonic_minor', energy: 0.5 },
            { name: 'Happy', tempo: 120, scale: 'major', energy: 0.8 },
            { name: 'Melancholic', tempo: 70, scale: 'natural_minor', energy: 0.4 },
            { name: 'Epic', tempo: 110, scale: 'phrygian', energy: 0.9 }
        ];
    }

    /**
     * Initialize audio context
     */
    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    /**
     * Generate music based on parameters
     * @param {object} params - Music generation parameters
     * @returns {Promise<AudioBuffer>} - Generated audio buffer
     */
    async compose(params = {}) {
        if (this.isComposing) {
            throw new Error('Already composing music');
        }

        this.isComposing = true;

        try {
            // If API is configured, use it
            if (this.apiEndpoint && this.apiKey) {
                return await this._callMusicAPI(params);
            } else {
                // Fallback to procedural generation
                return await this._generateProcedural(params);
            }
        } finally {
            this.isComposing = false;
        }
    }

    /**
     * Call external AI music API
     * @private
     */
    async _callMusicAPI(params) {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                mood: params.mood || 'energetic',
                duration: params.duration || 30,
                tempo: params.tempo,
                scale: params.scale,
                instruments: params.instruments || ['piano', 'strings']
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Convert to audio buffer
        const audioContext = this.initAudioContext();
        const audioBuffer = await audioContext.decodeAudioData(
            this._base64ToArrayBuffer(data.audio_data)
        );

        // Save to compositions
        this.compositions.push({
            params,
            timestamp: Date.now(),
            audioBuffer
        });

        return audioBuffer;
    }

    /**
     * Procedural music generation
     * @private
     */
    async _generateProcedural(params) {
        const audioContext = this.initAudioContext();
        
        // Get mood preset or use defaults
        const mood = this.moodPresets.find(m => m.name.toLowerCase() === (params.mood || '').toLowerCase())
            || this.moodPresets[0];
        
        const tempo = params.tempo || mood.tempo;
        const duration = params.duration || 30;
        const scale = params.scale || mood.scale;
        
        // Create audio buffer
        const sampleRate = audioContext.sampleRate;
        const totalSamples = sampleRate * duration;
        const audioBuffer = audioContext.createBuffer(2, totalSamples, sampleRate);
        
        // Generate melody
        const melody = this._generateMelody(scale, tempo, duration);
        
        // Generate harmony
        const harmony = this._generateHarmony(scale, tempo, duration);
        
        // Generate rhythm
        const rhythm = this._generateRhythm(tempo, duration);
        
        // Mix tracks
        this._mixTracks(audioBuffer, melody, harmony, rhythm, sampleRate);
        
        // Save to compositions
        this.compositions.push({
            params,
            timestamp: Date.now(),
            audioBuffer
        });

        return audioBuffer;
    }

    /**
     * Generate melody sequence
     * @private
     */
    _generateMelody(scale, tempo, duration) {
        const notes = this._getScaleNotes(scale);
        const beatsPerSecond = tempo / 60;
        const totalBeats = duration * beatsPerSecond;
        const melody = [];
        
        let currentNoteIndex = 0;
        let lastNote = notes[0];
        
        for (let i = 0; i < totalBeats; i++) {
            // Choose note based on simple Markov chain
            const jump = Math.floor(Math.random() * 5) - 2; // -2 to +2
            currentNoteIndex = Math.max(0, Math.min(notes.length - 1, currentNoteIndex + jump));
            
            const note = notes[currentNoteIndex];
            const durationBeats = Math.random() > 0.7 ? 0.5 : 1; // 50% chance of half note
            
            melody.push({
                note: note,
                startTime: i,
                duration: durationBeats,
                velocity: 0.7 + Math.random() * 0.3
            });
            
            lastNote = note;
        }
        
        return melody;
    }

    /**
     * Generate harmony sequence
     * @private
     */
    _generateHarmony(scale, tempo, duration) {
        const notes = this._getScaleNotes(scale);
        const beatsPerSecond = tempo / 60;
        const totalBeats = duration * beatsPerSecond;
        const harmony = [];
        
        // Simple chord progression
        const chordProgression = [0, 3, 4, 3]; // I - IV - V - IV
        
        for (let i = 0; i < totalBeats; i += 2) {
            const chordIndex = chordProgression[Math.floor(i / 2) % chordProgression.length];
            const chordNotes = this._getChordNotes(notes, chordIndex);
            
            chordNotes.forEach(note => {
                harmony.push({
                    note: note,
                    startTime: i,
                    duration: 2,
                    velocity: 0.4
                });
            });
        }
        
        return harmony;
    }

    /**
     * Generate rhythm pattern
     * @private
     */
    _generateRhythm(tempo, duration) {
        const beatsPerSecond = tempo / 60;
        const totalBeats = duration * beatsPerSecond;
        const rhythm = [];
        
        // Basic drum pattern
        for (let i = 0; i < totalBeats; i++) {
            // Kick on beats 1 and 3
            if (i % 2 === 0) {
                rhythm.push({
                    type: 'kick',
                    startTime: i,
                    duration: 0.1,
                    velocity: 0.8
                });
            }
            
            // Snare on beats 2 and 4
            if (i % 2 === 1) {
                rhythm.push({
                    type: 'snare',
                    startTime: i,
                    duration: 0.1,
                    velocity: 0.6
                });
            }
            
            // Hi-hat on every beat
            rhythm.push({
                type: 'hihat',
                startTime: i + 0.5,
                duration: 0.05,
                velocity: 0.3
            });
        }
        
        return rhythm;
    }

    /**
     * Mix audio tracks into buffer
     * @private
     */
    _mixTracks(audioBuffer, melody, harmony, rhythm, sampleRate) {
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);
        
        // Clear buffer
        for (let i = 0; i < leftChannel.length; i++) {
            leftChannel[i] = 0;
            rightChannel[i] = 0;
        }
        
        // Add melody
        melody.forEach(note => {
            this._addNoteToBuffer(leftChannel, rightChannel, note, sampleRate);
        });
        
        // Add harmony
        harmony.forEach(note => {
            this._addNoteToBuffer(leftChannel, rightChannel, note, sampleRate, 0.3);
        });
        
        // Add rhythm
        rhythm.forEach(beat => {
            this._addBeatToBuffer(leftChannel, rightChannel, beat, sampleRate);
        });
        
        // Normalize
        this._normalizeBuffer(leftChannel);
        this._normalizeBuffer(rightChannel);
    }

    /**
     * Add note to audio buffer
     * @private
     */
    _addNoteToBuffer(leftChannel, rightChannel, note, sampleRate, volume = 0.5) {
        const startSample = Math.floor(note.startTime * sampleRate);
        const durationSamples = Math.floor(note.duration * sampleRate);
        const frequency = this._noteToFrequency(note.note);
        
        for (let i = 0; i < durationSamples && startSample + i < leftChannel.length; i++) {
            const t = i / sampleRate;
            const sample = Math.sin(2 * Math.PI * frequency * t) * note.velocity * volume;
            
            // Apply envelope
            const envelope = this._applyEnvelope(i, durationSamples);
            
            leftChannel[startSample + i] += sample * envelope;
            rightChannel[startSample + i] += sample * envelope;
        }
    }

    /**
     * Add beat to audio buffer
     * @private
     */
    _addBeatToBuffer(leftChannel, rightChannel, beat, sampleRate) {
        const startSample = Math.floor(beat.startTime * sampleRate);
        const durationSamples = Math.floor(beat.duration * sampleRate);
        
        for (let i = 0; i < durationSamples && startSample + i < leftChannel.length; i++) {
            const t = i / sampleRate;
            let sample;
            
            if (beat.type === 'kick') {
                sample = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 20);
            } else if (beat.type === 'snare') {
                sample = (Math.random() - 0.5) * Math.exp(-t * 30);
            } else { // hi-hat
                sample = (Math.random() - 0.5) * Math.exp(-t * 50);
            }
            
            leftChannel[startSample + i] += sample * beat.velocity;
            rightChannel[startSample + i] += sample * beat.velocity;
        }
    }

    /**
     * Apply ADSR envelope
     * @private
     */
    _applyEnvelope(sample, duration) {
        const attack = duration * 0.1;
        const decay = duration * 0.1;
        const sustain = duration * 0.6;
        const release = duration * 0.2;
        
        if (sample < attack) {
            return sample / attack;
        } else if (sample < attack + decay) {
            return 1 - (sample - attack) / decay * 0.3;
        } else if (sample < attack + decay + sustain) {
            return 0.7;
        } else {
            return 0.7 * (1 - (sample - attack - decay - sustain) / release);
        }
    }

    /**
     * Normalize audio buffer
     * @private
     */
    _normalizeBuffer(channel) {
        let max = 0;
        for (let i = 0; i < channel.length; i++) {
            max = Math.max(max, Math.abs(channel[i]));
        }
        
        if (max > 0) {
            for (let i = 0; i < channel.length; i++) {
                channel[i] /= max;
            }
        }
    }

    /**
     * Get scale notes
     * @private
     */
    _getScaleNotes(scale) {
        const baseNotes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C major scale
        
        const scalePatterns = {
            'major': [0, 2, 4, 5, 7, 9, 11],
            'minor': [0, 2, 3, 5, 7, 8, 10],
            'harmonic_minor': [0, 2, 3, 5, 7, 8, 11],
            'natural_minor': [0, 2, 3, 5, 7, 8, 10],
            'phrygian': [0, 1, 3, 5, 7, 8, 10]
        };
        
        const pattern = scalePatterns[scale] || scalePatterns['major'];
        
        return pattern.map(interval => {
            const octave = Math.floor(interval / 12);
            const noteIndex = interval % 12;
            const baseNote = baseNotes[noteIndex % baseNotes.length] || 261.63;
            return baseNote * Math.pow(2, octave);
        });
    }

    /**
     * Get chord notes
     * @private
     */
    _getChordNotes(scaleNotes, rootIndex) {
        // Simple triad: root, third, fifth
        return [
            scaleNotes[rootIndex % scaleNotes.length],
            scaleNotes[(rootIndex + 2) % scaleNotes.length],
            scaleNotes[(rootIndex + 4) % scaleNotes.length]
        ];
    }

    /**
     * Convert note name to frequency
     * @private
     */
    _noteToFrequency(note) {
        return note; // Already in Hz
    }

    /**
     * Base64 to ArrayBuffer conversion
     * @private
     */
    _base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Play composition
     */
    play(audioBuffer) {
        const audioContext = this.initAudioContext();
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
        return source;
    }

    /**
     * Get mood presets
     */
    getMoodPresets() {
        return this.moodPresets;
    }

    /**
     * Get composition history
     */
    getCompositions() {
        return this.compositions;
    }

    /**
     * Clear compositions
     */
    clearCompositions() {
        this.compositions = [];
    }

    /**
     * Configure API settings
     */
    configureAPI(endpoint, apiKey) {
        this.apiEndpoint = endpoint;
        this.apiKey = apiKey;
    }

    /**
     * Check if currently composing
     */
    isComposingMusic() {
        return this.isComposing;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIMusicComposer;
}

// Global instance
window.aiMusicComposer = new AIMusicComposer();
