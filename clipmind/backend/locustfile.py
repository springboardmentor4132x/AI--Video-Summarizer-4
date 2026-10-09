"""
ClipMind AI - Load Testing with Locust
----------------------------------------
Simulates multiple concurrent users hitting the backend API, to test
how it behaves under load (not just single-request response time).

SETUP:
    1. Install locust (one-time):
           pip install locust

    2. Make sure your server is running in a different terminal:
           uvicorn app.main:app --reload

    3. Update VIDEO_ID below with a real video ID that belongs to the
       PERF_EMAIL test user (from GET /api/videos/history, logged in
       as that user) - or leave blank to skip video-specific tasks.

RUN:
    locust -f locustfile.py --host http://127.0.0.1:8000

    Then open http://localhost:8089 in your browser. Enter:
        - Number of users to simulate (e.g. 10)
        - Ramp up rate (e.g. 2 per second)
    Click "Start swarming" and watch response times / failures live.

    Let it run for 1-2 minutes, then click "Stop" and screenshot the
    results table + charts for your report.
"""

from locust import HttpUser, task, between


PERF_EMAIL = "perf_test@example.com"
PERF_PASSWORD = "TestPass123"

# Optional: a real video ID owned by PERF_EMAIL. Leave as "" to skip
# video-specific load tasks and only test auth/list/analytics endpoints.
VIDEO_ID = ""


class ClipMindUser(HttpUser):
    # Each simulated user waits 1-3 seconds between actions,
    # roughly mimicking real usage instead of hammering nonstop.
    wait_time = between(1, 3)

    def on_start(self):
        """Runs once per simulated user when it starts: log in and store the token."""
        # Register (ignored if the user already exists)
        self.client.post(
            "/api/auth/register",
            json={
                "name": "Perf Test",
                "email": PERF_EMAIL,
                "password": PERF_PASSWORD,
                "role": "learner",
            },
        )

        response = self.client.post(
            "/api/auth/login",
            data={"username": PERF_EMAIL, "password": PERF_PASSWORD},
        )
        if response.status_code == 200:
            token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {token}"}
        else:
            self.headers = {}

    @task(3)
    def health_check(self):
        """Weight 3: called most often, since it's the lightest endpoint."""
        self.client.get("/")

    @task(2)
    def video_history(self):
        self.client.get("/api/videos/history", headers=self.headers)

    @task(2)
    def analytics_dashboard(self):
        self.client.get("/api/analytics/dashboard", headers=self.headers)

    @task(1)
    def login_again(self):
        """Occasionally re-test login under load, since it's the heaviest read-ish endpoint (bcrypt)."""
        self.client.post(
            "/api/auth/login",
            data={"username": PERF_EMAIL, "password": PERF_PASSWORD},
        )

    if VIDEO_ID:
        @task(1)
        def video_status(self):
            self.client.get(f"/api/videos/{VIDEO_ID}/status", headers=self.headers)

        @task(1)
        def analytics_single_video(self):
            self.client.get(f"/api/analytics/videos/{VIDEO_ID}", headers=self.headers)