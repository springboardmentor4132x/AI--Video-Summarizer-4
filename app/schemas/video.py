from datetime import datetime
from pydantic import BaseModel
class VideoOut(BaseModel):
    id: str
    filename: str
    status: str
    uploaded_at: datetime
    class Config:
        from_attributes = True