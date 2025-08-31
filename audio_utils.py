"""
Utilities files to stream, speed up, and transcribe audio (speech-to-text) and vice verse
"""

from pydub import AudioSegment ## ffpmeg
from openai import OpenAI

from io import BytesIO

client = OpenAI()

def webm_bytes_to_wav(webm_bytes, output_path="output.wav"):
    audio = AudioSegment.from_file(BytesIO(webm_bytes), format="webm")
    audio.export(output_path, format="wav")


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

