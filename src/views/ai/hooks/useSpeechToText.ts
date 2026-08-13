import { useRef, useState } from 'react';
import { read_audio } from '@huggingface/transformers';
import { loadWhisper } from 'src/services/whisper.service';

export function useSpeechToText() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [text, setText] = useState('');

  // -----------------------------------------
  // Start recording
  // -----------------------------------------

  const start = async () => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];

      const mimeType = mimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );

      if (!mimeType) {
        throw new Error(
          'No supported audio recording format found.',
        );
      }

      console.log('Selected MIME type:', mimeType);

      const recorder = new MediaRecorder(stream, {
        mimeType,
      });

      console.log(
        'Recorder MIME:',
        recorder.mimeType,
      );

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start();

      mediaRecorderRef.current = recorder;

      setIsListening(true);
      setText('');
    } catch (error) {
      console.error(
        'Microphone error:',
        error,
      );
    }
  };

  // -----------------------------------------
  // Stop recording + Whisper
  // -----------------------------------------

  const stop = async () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      return;
    }

    try {
      const blob = await new Promise<Blob>(
        (resolve) => {
          recorder.onstop = () => {
            const audioBlob = new Blob(
              chunksRef.current,
              {
                type: recorder.mimeType,
              },
            );

            resolve(audioBlob);
          };

          recorder.stop();
        },
      );

      // Stop microphone
      recorder.stream
        .getTracks()
        .forEach((track) => track.stop());

      mediaRecorderRef.current = null;

      setIsListening(false);
      setIsProcessing(true);

      console.log('Audio blob:', blob);
      console.log(
        'Audio MIME:',
        blob.type,
      );

      // -----------------------------------------
      // Optional: play recorded audio
      // -----------------------------------------

      const audioUrl =
        URL.createObjectURL(blob);

      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();

      // -----------------------------------------
      // Convert audio for Whisper
      // -----------------------------------------

      const audioData =
        await blobToAudioData(blob);

      console.log(
        'Sending audio to Whisper...',
      );

      console.log('Whisper input:', {
        type: audioData.constructor.name,
        length: audioData.length,
        sampleRate: 16000,
      });

      // -----------------------------------------
      // Load Whisper
      // -----------------------------------------

      const whisper = await loadWhisper();

      // -----------------------------------------
      // Transcription
      // -----------------------------------------

      const result = await whisper(
        audioData,
        {
          language: 'tr',
          task: 'transcribe',
          return_timestamps: false,
        },
      );

      console.log(
        'Whisper result:',
        result,
      );

      const transcript =
        result?.text?.trim() ?? '';

      setText(transcript);

      console.log(
        'Final text:',
        transcript,
      );
    } catch (error) {
      console.error(
        'Audio processing error:',
        error,
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // -----------------------------------------
  // Blob -> Float32Array 16kHz
  // -----------------------------------------

  const blobToAudioData = async (
    blob: Blob,
  ) => {
    const url =
      URL.createObjectURL(blob);

    try {
      const audio = await read_audio(
        url,
        16000,
      );

      console.log(
        'Whisper audio:',
        {
          type:
            audio.constructor.name,
          length: audio.length,
          sampleRate: 16000,
        },
      );

      let maxAmplitude = 0;
      let sum = 0;

      for (const value of audio) {
        maxAmplitude = Math.max(
          maxAmplitude,
          Math.abs(value),
        );

        sum += value * value;
      }

      const rms = Math.sqrt(
        sum / audio.length,
      );

      console.log(
        'Max amplitude:',
        maxAmplitude,
      );

      console.log(
        'RMS:',
        rms,
      );

      return audio;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return {
    start,
    stop,
    text,
    isListening,
    isProcessing,
  };
}