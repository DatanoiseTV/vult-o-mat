# I Built a Modular DSP Studio, Then the AI Took Over

### The Story of VultLab: From a Simple Web IDE to an Autonomous Audio Laboratory

Building custom synthesizers and audio effects is a notoriously high-friction process. If you’re working with embedded hardware like the Daisy or Teensy, your workflow is often a repetitive cycle of: write code, compile, flash, hook up an oscilloscope, realize your filter is exploding, and repeat.

I wanted to kill that friction. I wanted a zero-setup space where the mathematics of sound could be explored at the speed of thought. 

What started as a simple experiment in browser-based DSP turned into something much more ambitious—and, frankly, a little crazy.

---

## The Beginning: Zero-Setup DSP

The foundation was **Vult**—a specialized OCaml-style language designed for high-performance audio. Vult is brilliant because it’s expressive yet compiles to ultra-optimized C++.

The goal for **VultLab** was simple: Create a web-based IDE that could compile Vult code on the fly and run it immediately in a low-latency browser audio thread (AudioWorklet). No flashing hardware, no driver issues—just instant sound.

I built the core components: a Monaco-based code editor, a dual-trace oscilloscope, and a high-frequency telemetry system that could "peek" inside the audio thread to see what the variables were doing in real-time.

## The "Crazy" Turn: The Autonomous Partner

This is where things shifted from a tool to a collaboration. 

Instead of just adding a standard AI chat window for code snippets, I integrated a **Gemini 2.0 Autonomous Agent**. I didn't want a "Copilot" that suggested lines of code; I wanted a **Senior DSP Research Scientist** that could actually *use* the studio.

I gave the agent a "Diagnostic Rack"—a set of specialized tools that allow it to:
1.  **Read and Write Code:** Not just snippets, but full architectural refactors.
2.  **Observe the Signal:** The agent can "hear" by calling frequency analysis tools, measuring THD+N, and identifying harmonic peaks.
3.  **Configure Diagnostics:** It can autonomously set up its own logic analyzer probes to verify state machine transitions or envelope timings.
4.  **Test Melodies:** It can program the built-in 16-step sequencer to test how its code handles polyphony or legato slides.

Suddenly, I wasn't just coding alone. I was brainstorming with a partner that could propose an idea (like a physically modeled resonator), implement it, scope it, verify the SNR, and fix stability issues in the feedback loop before I even touched the keyboard.

## What VultLab is Today

Today, VultLab is a complete, industrial-grade DSP workbench. It features:

*   **The Laboratory:** A modular rack with a 16-step expressive sequencer, a bank of 12 MIDI CC knobs, and a virtual piano.
*   **Real-time Diagnostics:** Dual-trace oscilloscope, logarithmic FFT analyzer, and a multi-trace logic analyzer.
*   **Agentic Workflow:** An autonomous assistant that documents its plans, saves snapshots of your work, and empirically verifies every change it makes.
*   **Hardware-Ready Results:** Once your algorithm is perfected in the lab, a single click exports optimized C++ headers ready for your Eurorack module or embedded project.

## Why it Matters

The future of creative engineering isn't just about better tools; it’s about better partnerships. VultLab proves that when you give an AI the ability to "see" and "measure" its own output in a high-fidelity environment, it stops being a text generator and starts being a functional engineer.

Whether you're building a warm analog-style ladder filter or a complex FM oscillator, VultLab lets you focus on the *sound*, while the technology handles the heavy lifting.

---

**Explore the project:** [Link to your Repo]
**Try the Demo:** [Link to your Demo]
