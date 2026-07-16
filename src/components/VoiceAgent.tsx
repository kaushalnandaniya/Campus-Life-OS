"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Loader2, Volume2, X } from "lucide-react";

export default function VoiceAgent() {
  const [state, setState] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [transcript, setTranscript] = useState("");
  const [replyText, setReplyText] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [isSupported, setIsSupported] = useState(true);

  // We need to keep a ref to the recognition object so we can stop it if needed
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if SpeechRecognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const handleMicClick = () => {
    // iOS Safari Hack: Initialize audio context synchronously during a user interaction
    // so that asynchronous speech synthesis later is not blocked.
    const warmup = new SpeechSynthesisUtterance("");
    warmup.volume = 0;
    window.speechSynthesis.speak(warmup);

    if (state === "idle") {
      startListening();
    } else if (state === "listening") {
      stopListening();
      if (transcript.trim()) {
        processTranscript(transcript);
      } else {
        setState("idle");
      }
    } else if (state === "speaking" || state === "processing") {
      window.speechSynthesis.cancel();
      stopListening();
      setState("idle");
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setTranscript("");
    setReplyText("");
    setState("listening");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    let finalTranscript = "";
    recognition.onresult = (event: any) => {
      finalTranscript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setTranscript(finalTranscript);
    };

    recognition.onend = () => {
      if (finalTranscript.trim()) {
        processTranscript(finalTranscript);
      } else {
        setState("idle");
      }
      
      // Force hardware release for Mac/iOS so orange dot goes away
      try { recognition.abort(); } catch(e) {}
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setState("idle");
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.abort(); } catch(e) {} // Abort forcefully drops the hardware mic stream
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }
  };

  const processTranscript = async (text: string) => {
    setState("processing");
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages,
          localTime: new Date().toString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setReplyText(data.reply);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      
      // If the LLM decided we need to sync the calendar
      if (data.action === "SYNC_CALENDAR") {
        console.log("[Voice Agent] Tool Calling: Executing background SYNC_CALENDAR...");
        fetch("/api/sync", { method: "POST" }).catch(e => console.error("Sync failed", e));
      } else if (data.action === "ADD_EVENT" && data.payload) {
        console.log("[Voice Agent] Tool Calling: Executing ADD_EVENT...", data.payload);
        fetch("/api/calendar/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.payload)
        }).catch(e => console.error("Add event failed", e));
      }

      speakResponse(data.reply, data.needsResponse);
    } catch (err) {
      console.error(err);
      setReplyText("Sorry, I encountered an error.");
      speakResponse("Sorry, I encountered an error.", false);
    }
  };

  const speakResponse = (text: string, needsResponse: boolean = false) => {
    setState("speaking");
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Pick a premium voice if available
    const voices = window.speechSynthesis.getVoices();
    const premiumNames = ["Samantha", "Victoria", "Daniel", "Karen", "Moira", "Rishi", "Tessa"];
    let preferredVoice = voices.find(v => premiumNames.some(name => v.name.includes(name)));
    
    // Fallback if no premium voice matches
    if (!preferredVoice) {
      preferredVoice = voices.find(v => v.lang.startsWith("en-") && v.name.includes("Female")) || voices.find(v => v.lang.startsWith("en-")) || voices[0];
    }
    
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onend = () => {
      if (needsResponse) {
        startListening();
      } else {
        setState("idle");
      }
    };

    utterance.onerror = () => {
      setState("idle");
    };

    window.speechSynthesis.speak(utterance);
  };

  if (!isSupported) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Bubble (only shows if there's a transcript or reply) */}
      {(transcript || replyText) && state !== "idle" && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl rounded-2xl p-4 max-w-xs animate-fade-in-up">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-semibold text-[var(--accent-color)] uppercase tracking-wider">
              Campus AI
            </span>
            <button 
              onClick={() => { setState("idle"); window.speechSynthesis.cancel(); setTranscript(""); setReplyText(""); }}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          </div>
          
          {transcript && (
            <p className="text-sm text-[var(--text-primary)] mb-2 italic">
              "{transcript}"
            </p>
          )}

          {state === "processing" && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Loader2 size={12} className="animate-spin" /> Thinking...
            </div>
          )}

          {replyText && state === "speaking" && (
            <p className="text-sm text-[var(--text-secondary)]">
              {replyText}
            </p>
          )}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={handleMicClick}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
          state === "idle" ? "bg-[var(--accent-color)] text-white hover:scale-105" :
          state === "listening" ? "bg-red-500 text-white animate-pulse" :
          state === "processing" ? "bg-amber-500 text-white" :
          "bg-emerald-500 text-white"
        }`}
      >
        {state === "idle" && <Mic size={24} />}
        {state === "listening" && <Mic size={24} />}
        {state === "processing" && <Loader2 size={24} className="animate-spin" />}
        {state === "speaking" && <Volume2 size={24} className="animate-pulse" />}
      </button>
    </div>
  );
}
