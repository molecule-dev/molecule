-- Sequential integer numbers for comments, for APIs whose clients address a
-- comment by an integer id (RealWorld's `comment.id` is an integer).
-- createComment() / createNumberedComment() write this row with the comment;
-- numberComment(id) numbers a row that was inserted without them. The comment
-- keeps its UUID either way.
CREATE TABLE IF NOT EXISTS "comment_numbers" (
  "number" INTEGER PRIMARY KEY,
  "commentId" UUID NOT NULL UNIQUE REFERENCES "comments"("id") ON DELETE CASCADE
);
