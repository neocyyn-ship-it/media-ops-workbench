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
  resultIndex?: number;
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
  const keepListeningRef = useRef(false);
  const manualStopRef = useRef(false);
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
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let index = event.resultIndex ?? 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim() ?? "";
        if (!transcript) continue;

        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (interimText) {
        setStatus("listening");
        setStatusText(`正在识别：${interimText.length > 16 ? `${interimText.slice(0, 16)}...` : interimText}`);
      }

      if (finalText) {
        transcriptRef.current = transcriptRef.current
          ? `${transcriptRef.current}${transcriptRef.current.endsWith("。") ? "" : "，"}${finalText}`
          : finalText;
        onTranscript(finalText);
        setStatus("listening");
        setStatusText(
          `已追加：${finalText.length > 18 ? `${finalText.slice(0, 18)}...` : finalText}，继续说或手动结束`,
        );
      }
    };
    recognition.onerror = () => {
      keepListeningRef.current = false;
      setIsListening(false);
      setStatus("error");
      setStatusText("识别失败，请再试一次");
    };
    recognition.onend = () => {
      if (keepListeningRef.current && !manualStopRef.current) {
        try {
          recognition.start();
          setIsListening(true);
          setStatus("listening");
          setStatusText("正在听你说...点击结束录音才会停止");
          return;
        } catch {
          keepListeningRef.current = false;
          setIsListening(false);
          setStatus("error");
          setStatusText("重新开启录音失败，请再试一次");
          return;
        }
      }

      setIsListening(false);
      keepListeningRef.current = false;
      if (!transcriptRef.current) {
        setStatus("idle");
        setStatusText("已停止录音，未识别到内容");
      } else if (manualStopRef.current) {
        setStatus("success");
        setStatusText("已停止录音，内容已填入输入框");
      }
      manualStopRef.current = false;
    };
    recognitionRef.current = recognition;

    return () => {
      keepListeningRef.current = false;
      recognition.stop();
    };
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
      manualStopRef.current = true;
      keepListeningRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    transcriptRef.current = "";
    manualStopRef.current = false;
    keepListeningRef.current = true;
    setStatus("listening");
    setStatusText("正在听你说...点击结束录音才会停止");
    recognitionRef.current.start();
    setIsListening(true);
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        className={[
          "button-secondary gap-2",
          isListening ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]" : "",
        ].join(" ")}
        title="浏览器语音输入"
      >
        {isListening ? <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--accent)] animate-pulse" /> : null}
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
