-- Sequential integer numbers for comments, for APIs whose clients address a
-- comment by an integer id (RealWorld's `comment.id` is an integer). Opt-in:
-- written by numberComment() / createNumberedComment(); comments without a
-- number keep working by their UUID.
CREATE TABLE IF NOT EXISTS "comment_numbers" (
  "number" INTEGER PRIMARY KEY,
  "commentId" UUID NOT NULL UNIQUE REFERENCES "comments"("id") ON DELETE CASCADE
);
