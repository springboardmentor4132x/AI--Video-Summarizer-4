"""
Makes app.services a proper package and re-exports the pipeline
functions so routes can do:

    from app.services import process_video, generate_summary

instead of reaching into the specific file that defines them.

generate_summary here is the LOCAL (Hugging Face BART) implementation —
see process_video.py, which in turn delegates the actual model work to
summary_service.py. There is no OpenAI dependency in this import path.
"""

from app.services.process_video import process_video, generate_summary

__all__ = ["process_video", "generate_summary"]
