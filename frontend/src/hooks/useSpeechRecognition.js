import { useState, useRef, useCallback, useEffect } from 'react'

// Web Speech API is prefixed in Chrome/Edge (webkitSpeechRecognition) and
// unavailable in some browsers (e.g. Firefox) entirely. We detect once at
// module load and expose `supported` so the UI can fall back gracefully.
const SpeechRecognitionAPI =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-IN'

    recognition.onresult = (event) => {
      let combined = ''
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0].transcript
      }
      setTranscript(combined)
    }

    recognition.onerror = (event) => {
      // Common values: 'no-speech', 'not-allowed', 'audio-capture'.
      setError(event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    setError(null)
    setTranscript('')
    setIsListening(true)
    try {
      recognitionRef.current.start()
    } catch {
      // start() throws if recognition is already running — safe to ignore.
    }
  }, [])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    recognitionRef.current.stop()
  }, [])

  return {
    supported: !!SpeechRecognitionAPI,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
  }
}
