export enum CallLogStatus {
    PENDING = 'pending',
    ANSWERED = 'answered',
    VOICEMAIL = 'voicemaill left',
    SMS = 'SMS sent',
    FAILED = 'failed'
}

export enum AudioPresets {
    PROMPT = 'prompt.mp3',
    FALLBACK = 'text-fallback.mp3',
    NEGATIVE = 'negative.mp3',
    POSITIVE = 'positive.mp3',
    ERROR = 'error.mp3',
}