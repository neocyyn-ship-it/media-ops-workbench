"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

export function VoiceInput({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef("");
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState("点击开始语音输入");

  const supported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    if (!supported) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join("")
        .trim();
      if (text) {
        transcriptRef.current = text;
        onTranscript(text);
        setStatus("success");
        setStatusText(`已识别：${text.length > 18 ? `${text.slice(0, 18)}...` : text}`);
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      setStatus("error");
      setStatusText("识别失败，请再试一次");
    };
    recognition.onend = () => {
      setIsListening(false);
      if (!transcriptRef.current) {
        setStatus("idle");
        setStatusText("录音结束，未识别到内容");
      }
    };
    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [onTranscript, supported]);

  if (!supported) {
    return (
      <div className="inline-flex flex-col items-end gap-1">
        <span className="rounded-full bg-white px-3 py-2 text-xs muted-text">
          当前浏览器不支持语音输入
        </span>
        <span className="px-1 text-[11px] text-slate-400">建议改用手动输入</span>
      </div>
    );
  }

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    transcriptRef.current = "";
    setStatus("listening");
    setStatusText("正在听你说...");
    recognitionRef.current.start();
    setIsListening(true);
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        className="button-secondary gap-2"
        title="浏览器语音输入"
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        {isListening ? "结束录音" : "语音输入"}
      </button>
      <span
        className={[
          "px-1 text-[11px]",
          status === "listening"
            ? "text-[color:var(--accent)]"
            : status === "success"
              ? "text-emerald-600"
              : status === "error"
                ? "text-rose-600"
                : "text-slate-400",
        ].join(" ")}
      >
        {statusText}
      </span>
    </div>
  );
}
