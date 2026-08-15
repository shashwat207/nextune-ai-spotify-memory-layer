// High-Fidelity Web Audio Rhythm & Multi-Voice Synthesizer Engine for NexTune
import { Track } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;

  private isPlaying: boolean = false;
  private currentTrack: Track | null = null;
  private tempo: number = 110;
  private volume: number = 0.8;
  private elapsedSeconds: number = 0;

  // Web Audio Precision Lookahead Scheduler
  private schedulerTimerId: number | null = null;
  private nextNoteTime: number = 0;
  private currentStep: number = 0; // 0 to 31 (32 steps = 2 bars of 16th notes)
  private lookaheadIntervalMs: number = 25; // How often the scheduler checks
  private scheduleAheadTimeSec: number = 0.12; // How far ahead to schedule audio events

  private onTimeUpdateCallback?: (seconds: number) => void;
  private onTrackEndCallback?: () => void;
  private animationFrameId: number | null = null;
  private playStartTimeInContext: number = 0;
  private playStartOffsetSeconds: number = 0;

  constructor() {
    // Lazy AudioContext initialization
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      // Dynamics Compressor (Gives punchy mastering & prevents clipping)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(8, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

      // Live FFT Analyser
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      // Audio Graph: Instruments -> masterGain -> compressor -> analyser -> destination
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(16);
    }
    const array = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(array);
    return array;
  }

  public playTrack(
    track: Track,
    startTimeSeconds: number = 0,
    onTimeUpdate?: (s: number) => void,
    onEnd?: () => void
  ) {
    this.initContext();
    this.stop();

    if (!this.ctx) return;

    this.currentTrack = track;
    this.tempo = track.bpm || 110;
    this.elapsedSeconds = startTimeSeconds;
    this.playStartOffsetSeconds = startTimeSeconds;
    this.playStartTimeInContext = this.ctx.currentTime;
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onTrackEndCallback = onEnd;
    this.isPlaying = true;

    // Calculate step position based on start time
    const secondsPerStep = (60 / this.tempo) / 4; // 16th note step
    const totalStepsElapsed = Math.floor(startTimeSeconds / secondsPerStep);
    this.currentStep = totalStepsElapsed % 32;

    this.nextNoteTime = this.ctx.currentTime + 0.02;

    // Start precision scheduler
    this.startScheduler();
    this.startTimeTracker();
  }

  public pause() {
    this.isPlaying = false;
    this.stopScheduler();
  }

  public resume() {
    if (this.currentTrack && !this.isPlaying) {
      this.playTrack(
        this.currentTrack,
        this.elapsedSeconds,
        this.onTimeUpdateCallback,
        this.onTrackEndCallback
      );
    }
  }

  public seek(seconds: number) {
    this.elapsedSeconds = seconds;
    this.playStartOffsetSeconds = seconds;
    if (this.ctx) {
      this.playStartTimeInContext = this.ctx.currentTime;
      const secondsPerStep = (60 / this.tempo) / 4;
      const totalStepsElapsed = Math.floor(seconds / secondsPerStep);
      this.currentStep = totalStepsElapsed % 32;
      this.nextNoteTime = this.ctx.currentTime + 0.02;
    }
    if (this.onTimeUpdateCallback) {
      this.onTimeUpdateCallback(this.elapsedSeconds);
    }
  }

  public stop() {
    this.isPlaying = false;
    this.stopScheduler();
  }

  private stopScheduler() {
    if (this.schedulerTimerId !== null) {
      window.clearInterval(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private startScheduler() {
    this.schedulerTimerId = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx) return;

      // Lookahead: schedule all notes that will play within lookahead interval
      while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTimeSec) {
        this.scheduleStep(this.currentStep, this.nextNoteTime);
        this.advanceStep();
      }
    }, this.lookaheadIntervalMs);
  }

  private advanceStep() {
    const secondsPerStep = (60 / this.tempo) / 4;
    this.nextNoteTime += secondsPerStep;
    this.currentStep = (this.currentStep + 1) % 32;
  }

  private startTimeTracker() {
    const updateLoop = () => {
      if (!this.isPlaying || !this.ctx) return;

      const currentContextTime = this.ctx.currentTime;
      const elapsed = this.playStartOffsetSeconds + (currentContextTime - this.playStartTimeInContext);
      this.elapsedSeconds = elapsed;

      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.elapsedSeconds);
      }

      if (this.currentTrack && this.elapsedSeconds >= this.currentTrack.duration) {
        this.stop();
        if (this.onTrackEndCallback) {
          this.onTrackEndCallback();
        }
        return;
      }

      this.animationFrameId = window.requestAnimationFrame(updateLoop);
    };

    this.animationFrameId = window.requestAnimationFrame(updateLoop);
  }

  // ==========================================
  // INSTRUMENT SYNTHESIS MODULES (PRECISION)
  // ==========================================

  /**
   * 1. Punjabi Dhol Dagga (Low Bass Drum)
   * Resonant low skin strike with acoustic pitch decay and body boom.
   */
  private playPunjabiDholDagga(time: number, velocity: number = 0.8) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Pitch drop typical of acoustic bass skin: 75Hz -> 48Hz
      osc.frequency.setValueAtTime(75, time);
      osc.frequency.exponentialRampToValueAtTime(46, time + 0.18);

      gain.gain.setValueAtTime(0.6 * velocity, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.23);
    } catch {}
  }

  /**
   * 2. Punjabi Dhol Thili (High Stick Slap)
   * Snappy stick strike on parchment skin with high frequency crack.
   */
  private playPunjabiDholThili(time: number, velocity: number = 0.7) {
    if (!this.ctx || !this.masterGain) return;
    try {
      // Noise component for stick click
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = this.ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(2400, time);
      bandpass.Q.setValueAtTime(4.0, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.45 * velocity, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      noise.connect(bandpass);
      bandpass.connect(gain);
      gain.connect(this.masterGain);

      noise.start(time);
    } catch {}
  }

  /**
   * 3. Punjabi Tumbi String (Iconic Single-String Folk Instrument)
   * High-pitch pluck with rich upper harmonics and sharp decay.
   */
  private playTumbiString(time: number, freq: number, duration: number = 0.14, velocity: number = 0.5) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(freq * 2, time); // 1 octave overtone

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.8, time);
      filter.Q.setValueAtTime(3.5, time);

      gain.gain.setValueAtTime(0.4 * velocity, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc2.start(time);
      osc.stop(time + duration + 0.01);
      osc2.stop(time + duration + 0.01);
    } catch {}
  }

  /**
   * 4. Deep 808 Trap Sub Bass
   */
  private play808Sub(time: number, freq: number = 55, duration: number = 0.35, velocity: number = 0.8) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 1.5, time);
      osc.frequency.exponentialRampToValueAtTime(freq, time + 0.06);

      gain.gain.setValueAtTime(0.7 * velocity, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + duration + 0.01);
    } catch {}
  }

  /**
   * 5. Punchy Snare / Gated Snare
   */
  private playSnare(time: number, duration: number = 0.12, velocity: number = 0.6, isGated: boolean = false) {
    if (!this.ctx || !this.masterGain) return;
    try {
      // Body tone
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(90, time + 0.06);

      oscGain.gain.setValueAtTime(0.4 * velocity, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.08);

      // Snare rattle / noise
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = isGated ? 'lowpass' : 'highpass';
      filter.frequency.setValueAtTime(isGated ? 2500 : 1200, time);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35 * velocity, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start(time);
    } catch {}
  }

  /**
   * 6. Crisp Hi-Hat / Shaker
   */
  private playHiHat(time: number, open: boolean = false, velocity: number = 0.4) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const duration = open ? 0.14 : 0.04;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6500, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25 * velocity, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(time);
    } catch {}
  }

  /**
   * 7. Electronic Synth Arp & Lead
   */
  private playSynthLead(
    time: number,
    freq: number,
    duration: number = 0.16,
    type: OscillatorType = 'sawtooth',
    detune: number = 0,
    velocity: number = 0.4
  ) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);
      osc.detune.setValueAtTime(detune, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 3, time);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.2, time + duration);

      gain.gain.setValueAtTime(0.3 * velocity, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + duration + 0.01);
    } catch {}
  }

  /**
   * 8. Rhodes Jazz EPiano (Lo-Fi / Coding Focus)
   */
  private playRhodesKeys(time: number, freq: number, duration: number = 0.6, velocity: number = 0.4) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, time);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, time);

      gain.gain.setValueAtTime(0.28 * velocity, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + duration + 0.01);
      osc2.stop(time + duration + 0.01);
    } catch {}
  }

  /**
   * 9. Acoustic Indie Guitar Pluck
   */
  private playAcousticPluck(time: number, freq: number, duration: number = 0.35, velocity: number = 0.45) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 4, time);
      filter.frequency.exponentialRampToValueAtTime(freq * 1.5, time + duration);

      gain.gain.setValueAtTime(0.35 * velocity, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + duration + 0.01);
    } catch {}
  }

  // ==========================================
  // TRACK MUSICAL SCORE SEQUENCER (32-STEP)
  // ==========================================
  private scheduleStep(step: number, time: number) {
    if (!this.currentTrack) return;
    const id = this.currentTrack.id;

    // 1. SO HIGH - Sidhu Moosewala (96 BPM)
    // Iconic Punjabi Dhol beat + high G-minor Tumbi lead hook
    if (id === 'trk_so_high') {
      // Dhol / Drum rhythm:
      if (step === 0 || step === 8 || step === 16 || step === 24) {
        this.playPunjabiDholDagga(time, 0.9);
      }
      if (step === 4 || step === 12 || step === 20 || step === 28) {
        this.playPunjabiDholThili(time, 0.75);
        this.playSnare(time, 0.1, 0.5);
      }
      if (step % 2 === 0) {
        this.playHiHat(time, step % 8 === 4, 0.45);
      }
      // 808 Trap Sub Bass
      if (step === 0 || step === 10 || step === 16 || step === 26) {
        this.play808Sub(time, 49, 0.35, 0.85); // G1
      }
      // Iconic high Tumbi lead riff in Gm: G5, Bb5, D6, C6, G5, Bb5, A5, G5
      const soHighTumbiMelody = [783.99, 932.33, 1174.66, 1046.5, 783.99, 932.33, 880.0, 783.99];
      if (step % 2 === 0) {
        const noteIdx = Math.floor(step / 2) % soHighTumbiMelody.length;
        this.playTumbiString(time, soHighTumbiMelody[noteIdx], 0.12, 0.55);
      }
    }

    // 2. 295 - Sidhu Moosewala (90 BPM)
    // Heavy minor drill drums, dark piano stabs, low rebellious 808
    else if (id === 'trk_295') {
      if (step === 0 || step === 10 || step === 16 || step === 22) {
        this.play808Sub(time, 43.65, 0.45, 0.9); // F1
        this.playPunjabiDholDagga(time, 0.8);
      }
      if (step === 4 || step === 12 || step === 20 || step === 28) {
        this.playSnare(time, 0.14, 0.7, true);
        this.playPunjabiDholThili(time, 0.6);
      }
      if (step % 2 === 1) {
        this.playHiHat(time, false, 0.35);
      }
      // Dark minor brass/synth stabs
      if (step === 0 || step === 8 || step === 16 || step === 24) {
        this.playSynthLead(time, 146.83, 0.28, 'sawtooth', 0, 0.3); // D3
        this.playSynthLead(time, 174.61, 0.28, 'sawtooth', 5, 0.25); // F3
        this.playSynthLead(time, 220.0, 0.28, 'sawtooth', -5, 0.22); // A3
      }
      if (step % 4 === 2) {
        this.playTumbiString(time, 587.33, 0.15, 0.35); // D5
      }
    }

    // 3. WAVY - Karan Aujla (102 BPM)
    // West Coast bounce bass, bouncy hi-hat rolls, infectious synth lead
    else if (id === 'trk_wavy') {
      const wavyBassScale = [65.41, 73.42, 87.31, 98.0, 87.31, 65.41];
      if (step % 4 === 0 || step === 6 || step === 14 || step === 22) {
        const bNote = wavyBassScale[Math.floor(step / 4) % wavyBassScale.length];
        this.play808Sub(time, bNote, 0.22, 0.75);
      }
      if (step === 4 || step === 12 || step === 20 || step === 28) {
        this.playSnare(time, 0.11, 0.65);
        this.playPunjabiDholThili(time, 0.5);
      }
      // Bouncy west-coast 16th hats:
      this.playHiHat(time, step % 8 === 4, 0.4);
      // High synth whistle:
      if (step % 8 === 2 || step % 8 === 5) {
        this.playSynthLead(time, 1318.51, 0.16, 'sine', 0, 0.3);
      }
    }

    // 4. G.O.A.T. - Diljit Dosanjh (105 BPM)
    // Celebratory Bhangra Dhol rhythm + festive harmonium / brass hook
    else if (id === 'trk_goat') {
      // Authentic Dhol Bhangra Chaal:
      // Dha (0), Ge (4), Ge (6), Na (8), Dha (12), Na (14)
      if (step === 0 || step === 6 || step === 12 || step === 16 || step === 22 || step === 28) {
        this.playPunjabiDholDagga(time, 0.85);
      }
      if (step === 4 || step === 8 || step === 14 || step === 20 || step === 24 || step === 30) {
        this.playPunjabiDholThili(time, 0.7);
      }
      if (step % 2 === 0) {
        this.playHiHat(time, step === 6 || step === 22, 0.45);
      }
      // G.O.A.T. Melody Lead (C Major / G Major Bhangra Brass)
      const goatNotes = [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33];
      if (step % 4 === 0 || step === 6 || step === 22) {
        const mIdx = Math.floor(step / 4) % goatNotes.length;
        this.playSynthLead(time, goatNotes[mIdx], 0.2, 'square', 0, 0.35);
        this.playTumbiString(time, goatNotes[mIdx] * 1.5, 0.15, 0.4);
      }
    }

    // 5. NO COMPETITION - Jass Manak (98 BPM)
    else if (id === 'trk_no_competition') {
      if (step % 8 === 0 || step % 8 === 6) {
        this.playPunjabiDholDagga(time, 0.8);
        this.play808Sub(time, 58.27, 0.25, 0.7);
      }
      if (step % 8 === 4) {
        this.playSnare(time, 0.1, 0.6);
        this.playPunjabiDholThili(time, 0.5);
      }
      this.playHiHat(time, false, 0.35);
      if (step % 4 === 2) {
        this.playSynthLead(time, 783.99, 0.15, 'sawtooth', 0, 0.25);
      }
    }

    // 6. BROWN MUNDE - AP Dhillon (94 BPM)
    else if (id === 'trk_brown_munde') {
      if (step === 0 || step === 12 || step === 16 || step === 28) {
        this.play808Sub(time, 41.2, 0.4, 0.8);
      }
      if (step === 8 || step === 24) {
        this.playSnare(time, 0.12, 0.6);
      }
      if (step % 2 === 1) {
        this.playHiHat(time, false, 0.3);
      }
    }

    // 7. CHEQUES - Shubh (100 BPM)
    else if (id === 'trk_cheques') {
      if (step === 0 || step === 8 || step === 16 || step === 24) {
        this.play808Sub(time, 55, 0.3, 0.8);
      }
      if (step === 4 || step === 12 || step === 20 || step === 28) {
        this.playSnare(time, 0.1, 0.6);
      }
      this.playHiHat(time, step % 4 === 2, 0.4);
      const chequesPlucks = [329.63, 392.0, 440.0, 523.25];
      if (step % 4 === 0) {
        this.playAcousticPluck(time, chequesPlucks[(step / 4) % chequesPlucks.length], 0.25, 0.45);
      }
    }

    // 8. MIDNIGHT CIRCUIT - Nova Lane (118 BPM)
    // 80s Cyberpunk Synthwave: Driving 4-on-floor kick, gated snare, 16th arps
    else if (id === 'trk_midnight_circuit') {
      // 4-on-the-floor kick
      if (step % 4 === 0) {
        this.play808Sub(time, 65, 0.18, 0.85);
      }
      // Gated Snare on 2 and 4 (steps 4, 12, 20, 28)
      if (step % 8 === 4) {
        this.playSnare(time, 0.16, 0.7, true);
      }
      // Offbeat high-hats
      if (step % 2 === 1) {
        this.playHiHat(time, step % 4 === 2, 0.4);
      }
      // 16th-note analog synthwave arpeggio:
      const synthwaveArp = [220.0, 261.63, 329.63, 392.0, 440.0, 523.25, 659.25, 523.25];
      const note = synthwaveArp[step % synthwaveArp.length];
      this.playSynthLead(time, note, 0.13, 'sawtooth', 0, 0.35);
      this.playSynthLead(time, note * 1.008, 0.13, 'sawtooth', 12, 0.2); // Chorus detune
    }

    // 9. VELVET MORNING - Nova Lane (104 BPM)
    // Chillwave Dream Pop / Ambient synth chords
    else if (id === 'trk_velvet_morning') {
      if (step === 0 || step === 16) {
        this.playRhodesKeys(time, 196.0, 0.9, 0.45); // G3
        this.playRhodesKeys(time, 246.94, 0.9, 0.4); // B3
        this.playRhodesKeys(time, 293.66, 0.9, 0.35); // D4
        this.playRhodesKeys(time, 369.99, 0.9, 0.3); // F#4
      }
      if (step === 8 || step === 24) {
        this.playRhodesKeys(time, 164.81, 0.9, 0.45); // E3
        this.playRhodesKeys(time, 220.0, 0.9, 0.4); // A3
        this.playRhodesKeys(time, 261.63, 0.9, 0.35); // C4
      }
      if (step === 0 || step === 12 || step === 16 || step === 28) {
        this.play808Sub(time, 49, 0.25, 0.6);
      }
      if (step % 8 === 4) {
        this.playSnare(time, 0.1, 0.35, true);
      }
    }

    // 10. CONSTELLATIONS - Cosmic Kind (122 BPM)
    // Deep House / Progressive Melodic Techno
    else if (id === 'trk_constellations') {
      if (step % 4 === 0) {
        this.play808Sub(time, 58, 0.2, 0.85); // House Kick
      }
      if (step % 8 === 4) {
        this.playSnare(time, 0.1, 0.6);
      }
      if (step % 2 === 1) {
        this.playHiHat(time, false, 0.45);
      }
      const housePluckMelody = [392.0, 466.16, 587.33, 698.46, 587.33, 466.16];
      if (step % 2 === 0) {
        const noteIdx = Math.floor(step / 2) % housePluckMelody.length;
        this.playSynthLead(time, housePluckMelody[noteIdx], 0.12, 'square', 0, 0.3);
      }
    }

    // 11. SLOW TIDE - Harbor Days (92 BPM)
    // Acoustic Indie Guitar & Coastal Shakers
    else if (id === 'trk_slow_tide') {
      if (step % 8 === 0) {
        this.play808Sub(time, 73.42, 0.3, 0.5);
      }
      const indieStrum = [293.66, 369.99, 440.0, 587.33, 440.0, 369.99];
      if (step % 2 === 0) {
        const noteIdx = Math.floor(step / 2) % indieStrum.length;
        this.playAcousticPluck(time, indieStrum[noteIdx], 0.28, 0.5);
      }
      if (step % 4 === 2) {
        this.playHiHat(time, false, 0.25);
      }
    }

    // 12. QUIET WORKSPACE - Komorebi Sounds (76 BPM)
    // Soft Rhodes Jazz Piano & Lo-Fi Vinyl Rain Ambience
    else if (id === 'trk_quiet_workspace') {
      if (step === 0 || step === 16) {
        this.playRhodesKeys(time, 130.81, 0.8, 0.45); // C3
        this.playRhodesKeys(time, 164.81, 0.8, 0.4); // E3
        this.playRhodesKeys(time, 196.0, 0.8, 0.35); // G3
        this.playRhodesKeys(time, 246.94, 0.8, 0.3); // B3
      }
      if (step === 8 || step === 24) {
        this.playRhodesKeys(time, 110.0, 0.8, 0.45); // A2
        this.playRhodesKeys(time, 164.81, 0.8, 0.4); // E3
        this.playRhodesKeys(time, 220.0, 0.8, 0.35); // A3
      }
      if (step === 0 || step === 10 || step === 16 || step === 26) {
        this.play808Sub(time, 43.65, 0.2, 0.45);
      }
      if (step === 8 || step === 24) {
        this.playSnare(time, 0.08, 0.3);
      }
      if (step % 4 === 2) {
        this.playHiHat(time, false, 0.15);
      }
    }

    // 13. COFFEE SHOP KEYS - Study Beats Collective (80 BPM)
    else if (id === 'trk_coffee_shop_keys') {
      if (step === 0 || step === 16) {
        this.playRhodesKeys(time, 174.61, 0.7, 0.4);
        this.playRhodesKeys(time, 220.0, 0.7, 0.35);
        this.playRhodesKeys(time, 261.63, 0.7, 0.3);
      }
      if (step % 8 === 0) {
        this.play808Sub(time, 55, 0.25, 0.5);
      }
      if (step % 8 === 4) {
        this.playSnare(time, 0.09, 0.35);
      }
    }

    // 14. CRUEL SUMMER - Taylor Swift (170 BPM)
    // 170 BPM High-Energy Synth Pop
    else if (id === 'trk_cruel_summer') {
      if (step % 4 === 0) {
        this.play808Sub(time, 65.41, 0.16, 0.8);
      }
      if (step % 8 === 4) {
        this.playSnare(time, 0.11, 0.65);
      }
      this.playHiHat(time, step % 4 === 2, 0.4);
      const popLead = [523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 440.0];
      if (step % 4 === 0 || step % 8 === 6) {
        const pIdx = Math.floor(step / 4) % popLead.length;
        this.playSynthLead(time, popLead[pIdx], 0.16, 'sawtooth', 0, 0.3);
      }
    }

    // 15. BLINDING LIGHTS - The Weeknd (171 BPM)
    // 80s Fast Electro-Pop Bassline
    else if (id === 'trk_blinding_lights') {
      if (step % 4 === 0) {
        this.play808Sub(time, 60, 0.16, 0.85);
      }
      if (step % 8 === 4) {
        this.playSnare(time, 0.12, 0.7, true);
      }
      this.playHiHat(time, step % 2 === 1, 0.45);
      const weekndBassScale = [174.61, 155.56, 138.59, 130.81];
      const bNote = weekndBassScale[Math.floor(step / 8) % weekndBassScale.length];
      if (step % 2 === 0) {
        this.playSynthLead(time, bNote, 0.11, 'sawtooth', 0, 0.35);
      }
      if (step === 0 || step === 6 || step === 12 || step === 14) {
        this.playSynthLead(time, 698.46, 0.15, 'sawtooth', 10, 0.3); // High synth hook
      }
    }

    // 16. LEVITATING - Dua Lipa (103 BPM)
    // Nu-Disco Funky Bass
    else if (id === 'trk_levitating') {
      if (step % 4 === 0) {
        this.play808Sub(time, 60, 0.18, 0.8);
      }
      if (step % 8 === 4) {
        this.playSnare(time, 0.1, 0.6);
      }
      this.playHiHat(time, step % 4 === 2, 0.4);
      const discoBass = [123.47, 146.83, 164.81, 185.0, 164.81];
      if (step % 2 === 0) {
        const dIdx = Math.floor(step / 2) % discoBass.length;
        this.playSynthLead(time, discoBass[dIdx], 0.14, 'triangle', 0, 0.4);
      }
    }

    // Generic fallback beat
    else {
      if (step % 4 === 0) this.play808Sub(time, 60, 0.2, 0.7);
      if (step % 8 === 4) this.playSnare(time, 0.1, 0.5);
      if (step % 2 === 1) this.playHiHat(time, false, 0.3);
    }
  }
}

export const audioEngine = new AudioEngine();
