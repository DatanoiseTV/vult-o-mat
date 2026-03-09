import { WebMidi, Input } from 'webmidi';
import type { NoteMessageEvent, ControlChangeMessageEvent } from 'webmidi';

export class MIDIController {
  private onNoteOn: (note: number, velocity: number) => void;
  private onNoteOff: (note: number) => void;
  private onCC: (cc: number, val: number) => void;
  private onStatusChange: (status: string) => void;
  private selectedInputId: string | null = null;
  private initialized = false;

  constructor(
    onNoteOn: (note: number, velocity: number) => void,
    onNoteOff: (note: number) => void,
    onCC: (cc: number, val: number) => void,
    onStatusChange: (status: string) => void
  ) {
    this.onNoteOn = onNoteOn;
    this.onNoteOff = onNoteOff;
    this.onCC = onCC;
    this.onStatusChange = onStatusChange;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  // Must be called from a user-gesture handler (click, keydown, etc.).
  // Never throws — errors are reported via onStatusChange only.
  public async init(): Promise<void> {
    if (this.initialized) return;
    try {
      // Race WebMidi.enable against a 3-second timeout.
      // Browsers silently hang when no MIDI devices are present or the
      // permission prompt is auto-dismissed — we must not block audio on this.
      await Promise.race([
        WebMidi.enable({ sysex: false }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timed out')), 3000)
        ),
      ]);

      this.initialized = true;
      this.onStatusChange(`MIDI: ${WebMidi.inputs.length} input${WebMidi.inputs.length !== 1 ? 's' : ''}`);
      this.setupListeners();

      WebMidi.addListener('connected', () => {
        this.onStatusChange(`MIDI: ${WebMidi.inputs.length} input${WebMidi.inputs.length !== 1 ? 's' : ''}`);
        this.setupListeners();
      });

      WebMidi.addListener('disconnected', () => {
        this.onStatusChange(`MIDI: ${WebMidi.inputs.length} input${WebMidi.inputs.length !== 1 ? 's' : ''}`);
        this.setupListeners();
      });
    } catch (err: any) {
      this.initialized = false;
      const msg: string = err?.message ?? String(err);
      if (msg.includes('timed out') || msg.includes('no devices')) {
        this.onStatusChange('MIDI: No devices');
      } else if (msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('permission')) {
        this.onStatusChange('MIDI: Permission denied');
      } else if (msg.toLowerCase().includes('not supported')) {
        this.onStatusChange('MIDI: Not supported');
      } else {
        this.onStatusChange('MIDI: Unavailable');
      }
      // Rethrow so callers can decide whether to care
      throw err;
    }
  }

  public getInputs(): Input[] {
    return this.initialized ? WebMidi.inputs : [];
  }

  public setInput(id: string | null) {
    this.selectedInputId = id;
    if (this.initialized) this.setupListeners();
  }

  private setupListeners() {
    WebMidi.inputs.forEach(input => input.removeListener());

    WebMidi.inputs.forEach((input: Input) => {
      if (this.selectedInputId && input.id !== this.selectedInputId) return;

      input.addListener('noteon', (e: NoteMessageEvent) => {
        const vel = Math.round(((e as any).velocity || 1) * 127);
        this.onNoteOn(e.note.number, vel);
      });

      input.addListener('noteoff', (e: NoteMessageEvent) => {
        this.onNoteOff(e.note.number);
      });

      input.addListener('controlchange', (e: ControlChangeMessageEvent) => {
        if (typeof (e as any).value === 'number') {
          const val = Math.round((e as any).value * 127);
          this.onCC((e as any).controller.number, val);
        }
      });
    });
  }
}
