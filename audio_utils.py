"""
Utilities files to stream, speed up, and transcribe audio (speech-to-text) and vice verse
"""

from pydub import AudioSegment
from openai import OpenAI
import websockets 
import asyncio
from io import BytesIO

client = OpenAI()


async def transcribe_audio_from_bytes(stream_data): 
    audio_file = BytesIO(stream_data)
    audio_file.name = "audio.wav"
    audio_file.seek(0)
    
    with open(audio_file.name) as f: 
        transcription = client.audio.transcriptions.create(
            model="gpt-4o-transcribe",
            file=f,
            response_format="text",
        )
    return transcription.text


def transcribe_audio(file_path, topic): 
    """Transcribe audio. Takes in file path and the current topic to transcribe the audio. """
    with open(file_path, "rb") as audio_file: 
        audio = AudioSegment.from_wav(audio_file) 
        timelimit_audio = audio[:150000]

        timelimit_audio.export("file/...", format="mp3")

        transcription = client.audio.transcriptions.create(
            model="gpt-4o-transcribe", 
            file=audio_file,
            stream=True,
            response_format='text',
            prompt=f'This is a testimony from an advocate regarding a bill on {topic}.'
        )
        
        return transcription.text

