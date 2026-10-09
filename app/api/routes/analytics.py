from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.models.user import User
from app.models.video import Video
from app.schemas.analytics import VideoAnalyticsOut, DashboardAnalyticsOut
from app.schemas.usage import UsageReportOut
from app.schemas.content_insights import ContentInsightsOut
from app.services.analytics_service import compute_video_analytics, compute_dashboard_analytics
from app.services.usage_service import compute_usage_report
from app.services.content_insights_service import compute_content_insights

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/videos/{video_id}", response_model=VideoAnalyticsOut)
async def get_video_analytics(video_id: str, current_user: User = Depends(get_current_user)):
    try:
        object_id = PydanticObjectId(video_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Video not found.")
    video = await Video.get(object_id)
    if not video or video.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Video not found.")
    return VideoAnalyticsOut(**compute_video_analytics(video))


@router.get("/dashboard", response_model=DashboardAnalyticsOut)
async def get_dashboard_analytics(current_user: User = Depends(get_current_user)):
    videos = await Video.find(Video.user_id == str(current_user.id)).to_list()
    return DashboardAnalyticsOut(**compute_dashboard_analytics(videos))


@router.get("/usage-report", response_model=UsageReportOut)
async def get_usage_report(current_user: User = Depends(get_current_user)):
    """
    Usage statistics for the current user: uploads over time,
    success/failure rate, and storage used (Module 6).
    """
    videos = await Video.find(Video.user_id == str(current_user.id)).to_list()
    return UsageReportOut(**compute_usage_report(videos))


@router.get("/content-insights", response_model=ContentInsightsOut)
async def get_content_insights(current_user: User = Depends(get_current_user)):
    """
    Content-level insights for the current user: top topics, key-moment
    density, keyword density, and length distribution (Module 6).
    """
    videos = await Video.find(Video.user_id == str(current_user.id)).to_list()
    return ContentInsightsOut(**compute_content_insights(videos))