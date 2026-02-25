// Lightweight procedural sound effects using Web Audio API

class AudioSystem {
    private ctx: AudioContext | null = null;
    private initialized = false;
    private isMuted = false;

    // Must be called upon first user interaction
    public init() {
        if (!this.initialized) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                this.initialized = true;
            }
        }
    }

    public setMuted(muted: boolean) {
        this.isMuted = muted;
    }

    public getMuted(): boolean {
        return this.isMuted;
    }

    private createContext(): AudioContext | null {
        if (this.isMuted) return null;
        if (!this.initialized) this.init();
        if (this.ctx?.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    // Generator helpers
    private playNoise(duration: number, vol = 0.1, type: 'white' | 'brown' = 'white') {
        const ctx = this.createContext();
        if (!ctx) return;

        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            if (type === 'brown') {
                data[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = data[i];
                data[i] *= 3.5; // Compensate gain
            } else {
                data[i] = white;
            }
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        noise.connect(gain);
        gain.connect(ctx.destination);
        
        // Simple bandpass for a more "crunchy" or specific sound
        const filter = ctx.createBiquadFilter();
        if (type === 'brown') {
            filter.type = 'lowpass';
            filter.frequency.value = 1000;
        } else {
            filter.type = 'bandpass';
            filter.frequency.value = 800;
        }

        gain.disconnect();
        gain.connect(filter);
        filter.connect(ctx.destination);

        noise.start();
    }

    // Explicit Sound Effects

    public playFeed() {
        // Crunch sound
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.playNoise(0.1, 0.2, 'brown');
            }, i * 150);
        }
    }

    public playWater() {
        // Splosh / gulp
        const ctx = this.createContext();
        if (!ctx) return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }

    public playPlay() {
        // Cheerful bounce
        const ctx = this.createContext();
        if (!ctx) return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }

    public playPet() {
        // Happy chirp / purr
        const ctx = this.createContext();
        if (!ctx) return;
        
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        lfo.type = 'sine';
        
        const now = ctx.currentTime;
        
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
        osc.frequency.linearRampToValueAtTime(1000, now + 0.3);

        lfo.frequency.value = 15; // Vibrato speed
        lfoGain.gain.value = 50;  // Vibrato depth
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        
        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.4);
        osc.stop(now + 0.4);
    }

    public playTeachSuccess() {
        // Bright chime
        const ctx = this.createContext();
        if (!ctx) return;
        
        const now = ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C major chord
        
        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.05 + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 1.5);
        });
    }

    public playTeachFail() {
        // Soft descending tone
        const ctx = this.createContext();
        if (!ctx) return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.4);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(now + 0.5);
    }

    public playEggWarmth() {
        // Gentle humming tone
        const ctx = this.createContext();
        if (!ctx) return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(250, now + 0.5);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.2);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
    }

    public playEggWobble() {
        // Soft rattling sound
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                this.playNoise(0.05, 0.05, 'white');
            }, i * 100);
        }
    }

    public playHatching() {
        // Fanfare
        const ctx = this.createContext();
        if (!ctx) return;
        
        // Cracks
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.playNoise(0.05, 0.2, 'brown');
            }, i * 200);
        }

        // Fanfare after 1 second
        setTimeout(() => {
            const freqs = [440, 554.37, 659.25, 880]; // A major arpeggio
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.value = freq;
                
                const t = ctx.currentTime + (idx * 0.15);
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.03, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
                
                // lowpass filter for square wave harshness
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 1500;
                
                osc.connect(gain);
                gain.connect(filter);
                filter.connect(ctx.destination);
                
                osc.start(t);
                osc.stop(t + 1.0);
            });
        }, 1000);
    }

    public playSad() {
        // Soft whimper
        const ctx = this.createContext();
        if (!ctx) return;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.2);
        osc.frequency.linearRampToValueAtTime(400, now + 0.5);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
    }
}

export const sfx = new AudioSystem();
