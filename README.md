# 🧠 ClipMind AI

### AI-Powered Video Summarization and Intelligent Key Moment Detection Platform

## 📌 Project Overview

ClipMind AI is an AI-powered platform designed to simplify video learning and content understanding. It helps users understand long videos by organizing important information into summaries, key moments, highlights, and keywords.

The platform aims to save time and make video content easier to review and understand.

## 🎯 Objectives

* Generate summaries of video content.
* Identify important moments with timestamps.
* Extract highlights and keywords.
* Display video analytics and content insights.
* Provide a visual representation of video structure using Video DNA.

## ✨ Key Features

* **User Authentication:** Register and login functionality.
* **Video Upload:** Upload videos for processing.
* **Video History:** Access previously uploaded videos.
* **Transcript and Summary:** Display transcript and summary information.
* **Key Moment Detection:** Identify important sections with timestamps.
* **Highlights and Keywords:** Present important information from video content.
* **Analytics Dashboard:** Display available video and content statistics.
* **Content Insights:** Present insights derived from video analysis.
* **Usage Reports:** Display available usage information.
* **ClipMind Video DNA:** Visualize video structure, topic distribution, information density, and important-moment density.

## 🛠️ Technology Stack

| Component       | Technologies                                                  |
| --------------- | ------------------------------------------------------------- |
| Frontend        | React.js, Vite, JavaScript                                    |
| Backend         | Python, FastAPI                                               |
| Database        | MongoDB                                                       |
| AI and NLP      | Whisper, NLP and embedding-based techniques, where integrated |
| Version Control | Git and GitHub                                                |

## 🔄 How It Works

1. The user registers or logs in.
2. The user uploads a video.
3. The backend handles the video and its available processing tasks.
4. The platform displays the available transcript, summary, key moments, highlights, and keywords.
5. The dashboard presents available analytics and content insights.
6. Video DNA provides a visual overview of the video's structure when the required processing data is available.

## 📁 Project Structure

```text
AI--Video-Summarizer-4/
├── backend/
│   └── app/
├── frontend/
│   └── src/
├── docs/
│   ├── database-design.md
│   ├── database-documentation.md
│   ├── frontend-documentation.md
│   └── ClipMind-AI-Frontend-Documentation.pdf
├── .gitignore
└── README.md
```

## 🚀 Getting Started

### Prerequisites

* Node.js and npm
* Python
* MongoDB connection configured for the backend
* Git

### Run the Frontend

Open a terminal in the `frontend` directory and run:

```bash
npm install
npm run dev
```

### Run the Backend

Open another terminal in the `backend` directory, activate your Python virtual environment, install the project's required dependencies, and run:

```bash
uvicorn app.main:app --reload
```

The backend normally runs at `http://127.0.0.1:8000`. The actual startup configuration may vary depending on the project setup.

## 👩‍💻 My Contribution

My primary responsibility was Frontend Development and Analytics Dashboard. My work included:

* Developing React.js frontend pages and UI components.
* Working on Login, Register, Upload, History, and Results interfaces.
* Implementing the Key Moments, Highlights, and Keywords UI.
* Developing the Analytics Dashboard, Content Insights, and Usage Statistics interfaces.
* Integrating frontend components with backend APIs.
* Improving responsive design and user experience.
* Implementing the ClipMind Video DNA frontend and clickable timestamps.
* Preparing frontend documentation and testing the interface.

## 📚 Documentation

* [Frontend Documentation](docs/frontend-documentation.md)
* [Frontend Documentation PDF](docs/ClipMind-AI-Frontend-Documentation.pdf)
* [Database Design](docs/database-design.md)
* [Database Documentation](docs/database-documentation.md)

## 🔧 Current Status

The project includes frontend interfaces for video analysis, analytics, and Video DNA. Further validation with real processed videos and verification of the complete end-to-end AI pipeline remain important where processing or integration is not yet complete.

## 🔮 Future Improvements

* Improve real-time video processing and validation.
* Enhance video chapter generation.
* Add export options for summaries.
* Improve timestamp-based video navigation.
* Expand AI-powered learning and content analysis features.

## 🤝 Team Project

ClipMind AI is developed collaboratively as part of the Infosys Springboard Virtual Internship 7.0.

## 📝 Conclusion

ClipMind AI aims to make video learning more efficient by organizing video content into summaries, important moments, keywords, analytics, and visual insights. The project provides practical experience in frontend development, backend integration, database connectivity, and AI-powered application development.
