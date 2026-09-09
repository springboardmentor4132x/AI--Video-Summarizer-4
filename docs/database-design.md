# ClipMind AI - Initial Database Design

## 1. User Collection

| Field | Description |
|---|---|
| id | Unique user ID |
| name | User's name |
| email | User's email address |
| password | Hashed user password |
| role | User role, such as user or admin |
| created_at | Account creation date and time |

## 2. Video Collection

| Field | Description |
|---|---|
| id | Unique video ID |
| user_id | ID of the user who uploaded the video |
| filename | Original video filename |
| file_path | Location of the uploaded video |
| status | Current processing status |
| uploaded_at | Video upload date and time |

## 3. Relationship

One user can upload many videos.

Each video belongs to one user.

The `user_id` field in the Video collection connects each video with its owner.

```text
User
 |
 | uploads
 |
Many Videos