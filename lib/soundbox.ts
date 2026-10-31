/**
 * Soundbox Audio Utility
 * Simulates Paytm/PhonePe soundbox voice alerts and payment chimes in the browser.
 */

class Soundbox {
  private enabled: boolean = true;
  private volume: number = 1.0;
  private lang: "hi" | "en" = "hi";

  constructor() {
    if (typeof window !== "undefined") {
      this.enabled = localStorage.getItem("soundbox_enabled") !== "false";
      this.volume = parseFloat(localStorage.getItem("soundbox_volume") || "1.0");
      this.lang = (localStorage.getItem("soundbox_lang") as "hi" | "en") || "hi";
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== "undefined") {
      localStorage.setItem("soundbox_enabled", String(val));
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setLanguage(lang: "hi" | "en") {
    this.lang = lang;
    if (typeof window !== "undefined") {
      localStorage.setItem("soundbox_lang", lang);
    }
  }

  public getLanguage(): "hi" | "en" {
    return this.lang;
  }

  /**
   * Synthesizes a digital payment chime using Web Audio API (sine wave chord).
   */
  public playChime(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !this.enabled) {
        return resolve();
      }

      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return resolve();

        const ctx = new AudioContextClass();
        const now = ctx.currentTime;

        // Two-tone payment notification chord (e.g. 587.33Hz [D5] then 880Hz [A5])
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        gainNode.gain.setValueAtTime(0.3 * this.volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.setValueAtTime(880, now + 0.15); // A5

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(784, now); // G5
        osc2.frequency.setValueAtTime(1174.66, now + 0.15); // D6

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.5);

        setTimeout(() => {
          ctx.close();
          resolve();
        }, 550);
      } catch {
        resolve();
      }
    });
  }

  /**
   * Speaks the payment confirmation in Hindi or English.
   * e.g. "Paytm par pachaas rupaye prapt hue" / "Payment of fifty rupees received"
   */
  public async announcePayment(amount: number): Promise<void> {
    if (typeof window === "undefined" || !this.enabled) return;

    await this.playChime();

    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel(); // Cancel any ongoing speech

    const rounded = Math.round(amount);
    let speechText = "";

    if (this.lang === "hi") {
      speechText = `UPI par ${rounded} rupaye prapt hue`;
    } else {
      speechText = `Received ${rounded} rupees on UPI`;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = this.volume;

    // Pick Hindi or Indian English voice if available
    const voices = window.speechSynthesis.getVoices();
    if (this.lang === "hi") {
      const hiVoice = voices.find((v) => v.lang.startsWith("hi") || v.name.includes("Hindi"));
      if (hiVoice) utterance.voice = hiVoice;
      else utterance.lang = "hi-IN";
    } else {
      const inVoice = voices.find((v) => v.lang === "en-IN" || v.name.includes("India"));
      if (inVoice) utterance.voice = inVoice;
      else utterance.lang = "en-IN";
    }

    window.speechSynthesis.speak(utterance);
  }
}

export const soundbox = new Soundbox();
