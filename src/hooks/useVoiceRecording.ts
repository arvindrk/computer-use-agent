import { useCallback, useEffect, useRef, useState } from "react";

export interface UseVoiceRecordingReturn {
  isRecording: boolean;
  transcript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const transcript = finalTranscript + interimTranscript;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    return new Promise<void>((resolve) => {
      const finalize = () => {
        if (websocketRef.current) {
          const state = websocketRef.current.readyState;
          if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) {
            websocketRef.current.close(1000);
          }
        }

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }

        mediaRecorderRef.current = null;
        websocketRef.current = null;
        setIsRecording(false);
        resolve();
      };

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        const recorder = mediaRecorderRef.current;
        recorder.onstop = finalize;
        recorder.stop();
      } else {
        finalize();
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    await cleanup();

    setError(null);
    setFinalTranscript("");
    setInterimTranscript("");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Microphone not supported in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/deepgram/stream`;
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        mediaRecorder.start(250);
        setIsRecording(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.error) {
            setError(data.error);
            cleanup();
            return;
          }

          const transcriptText = data.channel?.alternatives?.[0]?.transcript;
          console.log(transcriptText);
          if (transcriptText?.trim()) {
            if (data.is_final) {
              setFinalTranscript((prev) => prev + transcriptText + " ");
              setInterimTranscript("");
            } else {
              setInterimTranscript(transcriptText);
            }
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = () => {
        setError("Failed to connect to transcription service");
        cleanup();
      };

      ws.onclose = () => {
        if (isRecording) {
          cleanup();
        }
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Microphone access denied. Please enable in browser settings.");
      } else {
        setError("Failed to access microphone");
      }
      cleanup();
    }
  }, [cleanup, isRecording]);

  const stopRecording = useCallback(async () => {
    const fullTranscript = (finalTranscript + interimTranscript).trim();
    await cleanup();
    setFinalTranscript("");
    setInterimTranscript("");
    return fullTranscript;
  }, [finalTranscript, interimTranscript, cleanup]);

  return {
    isRecording,
    transcript,
    error,
    startRecording,
    stopRecording,
  };
}
