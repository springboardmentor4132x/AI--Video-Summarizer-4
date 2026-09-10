# ClipMind AI — Database Documentation

## 1. Database Technology

ClipMind AI uses **MongoDB Atlas** as the database.

* **Database:** `clipmindAI`
* **Database type:** NoSQL Document Database
* **Deployment:** MongoDB Atlas
* **Purpose:** Store user, video, key-moment, keyword, and analytics data.

---

## 2. Database Collections

The database contains the following collections:

1. `users`
2. `videos`
3. `key_moments`
4. `keywords`
5. `analytics`

---

## 3. Users Collection

The `users` collection stores registered user information.

| Field      | Data Type | Description            |
| ---------- | --------- | ---------------------- |
| `_id`      | ObjectId  | Unique user identifier |
| `name`     | String    | User name              |
| `email`    | String    | User email             |
| `password` | String    | User password          |
| `role`     | String    | User role              |

### Supported Roles

* Learner
* Content Creator
* Educator

---

## 4. Videos Collection

The `videos` collection stores uploaded video information.

| Field         | Data Type | Description                           |
| ------------- | --------- | ------------------------------------- |
| `_id`         | ObjectId  | Unique video identifier               |
| `user_id`     | String    | ID of the user who uploaded the video |
| `filename`    | String    | Uploaded video filename               |
| `file_path`   | String    | Location of the uploaded video        |
| `status`      | String    | Video processing status               |
| `uploaded_at` | DateTime  | Upload date and time                  |

---

## 5. Key Moments Collection

The `key_moments` collection stores important moments detected from videos.

| Field        | Data Type | Description                         |
| ------------ | --------- | ----------------------------------- |
| `_id`        | ObjectId  | Unique key-moment identifier        |
| `video_id`   | String    | Related video ID                    |
| `timestamp`  | String    | Time of the important moment        |
| `segment`    | String    | Video segment information           |
| `highlight`  | String    | Description of the important moment |
| `importance` | String    | Importance/relevance of the moment  |
| `created_at` | DateTime  | Record creation time                |

---

## 6. Keywords Collection

The `keywords` collection stores important keywords extracted from videos.

| Field        | Data Type | Description               |
| ------------ | --------- | ------------------------- |
| `_id`        | ObjectId  | Unique keyword identifier |
| `video_id`   | String    | Related video ID          |
| `keyword`    | String    | Extracted keyword         |
| `relevance`  | String    | Keyword relevance         |
| `created_at` | DateTime  | Record creation time      |

---

## 7. Analytics Collection

The `analytics` collection stores video processing and content statistics.

| Field                     | Data Type | Description                   |
| ------------------------- | --------- | ----------------------------- |
| `_id`                     | ObjectId  | Unique analytics identifier   |
| `video_id`                | String    | Related video ID              |
| `duration_seconds`        | Number    | Video duration                |
| `processing_time_seconds` | Number    | Processing time               |
| `word_count`              | Number    | Number of words in transcript |
| `keyword_count`           | Number    | Number of keywords            |
| `key_moment_count`        | Number    | Number of key moments         |
| `summary_generated`       | Boolean   | Whether summary was generated |
| `created_at`              | DateTime  | Record creation time          |

---

## 8. Database Relationships

The main database relationship is:

```text
User
  |
  | uploads
  ↓
Video
  |
  ├── Keywords
  |
  ├── Key Moments
  |
  └── Analytics
```

The `user_id` connects a video to its user.

The `video_id` connects keywords, key moments, and analytics to the corresponding video.

---

## 9. Database–API Integration

FastAPI is connected to MongoDB Atlas using the MongoDB Python driver.

The backend provides APIs for:

### Users

* User registration
* User login

### Videos

* Video upload
* Video metadata storage

### Key Moments

* Create key moment
* Read key moments
* Update key moment
* Delete key moment

### Keywords

* Create keyword
* Read keywords
* Update keyword
* Delete keyword

### Analytics

* Store analytics
* Retrieve analytics
* Update analytics
* Delete analytics
* Overview statistics
* Processing statistics

---

## 10. Database Testing

The database APIs were tested using the FastAPI Swagger interface.

The following operations were tested:

* Create
* Read
* Update
* Delete
* Analytics overview
* Processing statistics
* Database connection

The MongoDB Atlas connection was successfully verified using the database ping operation.

---

## 11. Data Consistency Checks

The following relationships were verified:

```text
User → Video
Video → Keywords
Video → Key Moments
Video → Analytics
```

The `video_id` field is used to associate keywords, key moments, and analytics with the correct video.

Test data was reviewed and unnecessary test records were cleaned up while preserving actual project data.

---

## 12. Backup and Cleanup

Database cleanup was performed after API testing.

* Test records were identified and removed where applicable.
* Actual project data was preserved.
* MongoDB Atlas collections were checked after cleanup.
* Database structure was verified for consistency.

---

## 13. Module 2 Database Status

Transcript and summary storage should be integrated with the database as part of the Module 2 processing flow.

If these collections are not yet implemented by the team, they remain **pending integration** and should not be marked as completed.

Expected flow:

```text
Video
  ↓
Transcript
  ↓
Summary
  ↓
Keywords
  ↓
Key Moments
  ↓
Analytics
```

---

## 14. Conclusion

The MongoDB Atlas database layer for ClipMind AI has been structured to support user management, video storage, key-moment detection, keyword storage, and analytics.

The database has been integrated with FastAPI APIs and tested for CRUD operations and analytics queries.

The database structure is ready for further integration with the project's transcript, summary, and AI-processing modules.
