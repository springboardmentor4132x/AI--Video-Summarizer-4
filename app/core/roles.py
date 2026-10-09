"""
The four roles defined for ClipMind AI. Kept in one place so registration
validation and role-based access control always agree on the same list.
"""
CONTENT_CREATOR = "content_creator"
LEARNER = "learner"
EDUCATOR = "educator"
ADMINISTRATOR = "administrator"
VALID_ROLES = [CONTENT_CREATOR, LEARNER, EDUCATOR, ADMINISTRATOR]