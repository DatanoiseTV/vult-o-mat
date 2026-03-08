import { WebMidi, Input } from 'webmidi';
import type { NoteMessageEvent, ControlChangeMessageEvent } from 'webmidi';

export class MIDIController {
  private onNoteOn: (note: number, velocity: number) => void;
  private onNoteOff: (note: number) => void;
  private onCC: (cc: number, val: number) => void;
  private onStatusChange: (status: string) => void;
  private selectedInputId: string | null = null;

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

  public async init() {
    try {
      await WebMidi.enable();
      this.onStatusChange(`MIDI Enabled: ${WebMidi.inputs.length} inputs found`);
      this.setupListeners();

      WebMidi.addListener('connected', () => {
        this.onStatusChange(`MIDI Input Connected. Total: ${WebMidi.inputs.length}`);
        this.setupListeners();
      });
      
      WebMidi.addListener('disconnected', () => {
        this.onStatusChange(`MIDI Input Disconnected. Total: ${WebMidi.inputs.length}`);
        this.setupListeners();
      });
    } catch (err: any) {
      this.onStatusChange(`MIDI Error: ${err.message}`);
    }
  }

  public getInputs() {
    return WebMidi.inputs;
  }

  public setInput(id: string | null) {
    this.selectedInputId = id;
    this.setupListeners();
  }

  private setupListeners() {
    WebMidi.inputs.forEach(input => input.removeListener());

    WebMidi.inputs.forEach((input: Input) => {
      if (this.selectedInputId && input.id !== this.selectedInputId) return;

      input.addListener('noteon', (e: NoteMessageEvent) => {
        // WebMidi v3 velocity is 0.0-1.0, scale to 0-127 for Vult
        const vel = Math.round(((e as any).velocity || 1) * 127);
        this.onNoteOn(e.note.number, vel);
      });
      
      input.addListener('noteoff', (e: NoteMessageEvent) => {
        this.onNoteOff(e.note.number);
      });
      
      input.addListener('controlchange', (e: ControlChangeMessageEvent) => {
        if (typeof (e as any).value === 'number') {
          // WebMidi v3 value is 0.0-1.0, scale to 0-127 for Vult
          const val = Math.round((e as any).value * 127);
          this.onCC((e as any).controller.number, val);
        }
      });
    });
  }
}
