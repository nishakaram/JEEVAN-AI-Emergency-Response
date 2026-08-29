import { useEffect } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

// "SPEAK YOUR EMERGENCY" control. Streams live transcript up to the
// parent via onTranscript as speech is recognized, so the parent's
// textarea updates in real time and stays editable afterwards. Falls
// back to a plain note (no button) when the browser doesn't support the
// Web Speech API at all — text input keeps working either way.
function VoiceInput({ onTranscript }) {
  const { supported, isListening, transcript, error, startListening, stopListening } =
    useSpeechRecognition()

  useEffect(() => {
    if (transcript) {
      onTranscript(transcript)
    }
  }, [transcript, onTranscript])

  if (!supported) {
    return (
      <p className="text-xs text-slate-400">
        Voice input isn't supported in this browser — please type your emergency below.
      </p>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
          isListening
            ? 'bg-red-600 text-white border-red-600 animate-pulse'
            : 'bg-white text-slate-700 border-slate-300 hover:border-emergency'
        }`}
      >
        🎤 {isListening ? 'Listening… tap to stop' : 'Speak your emergency'}
      </button>
      {error && <span className="text-xs text-red-500">Mic error: {error}. You can type instead.</span>}
    </div>
  )
}

export default VoiceInput
