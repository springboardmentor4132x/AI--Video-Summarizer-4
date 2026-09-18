"""
Makes app.services a proper package and re-exports the pipeline
functions so routes can do:

    from app.services import process_video, generate_summary

instead of reaching into the specific file that defines them.
"""

from app.services.process_video import process_video, generate_summary

__all__ = ["process_video", "generate_summary"]