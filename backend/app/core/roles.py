"""
The four roles defined for ClipMind AI. Kept in one place so registration
validation and role-based access control always agree on the same list.
"""
CONTENT_CREATOR = "content_creator"
LEARNER = "learner"
EDUCATOR = "educator"
ADMINISTRATOR = "administrator"
VALID_ROLES = [CONTENT_CREATOR, LEARNER, EDUCATOR, ADMINISTRATOR]

# Roles a person may pick when they sign up. ADMINISTRATOR is deliberately NOT
# here: before this list existed, anyone could register as an administrator.
# Admin accounts are created with `python -m app.scripts.create_admin` or
# promoted by an existing administrator from the Admin dashboard.
SELF_REGISTRATION_ROLES = [CONTENT_CREATOR, LEARNER, EDUCATOR]