ALTER TABLE articles ADD COLUMN is_top BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX articles_top_published_idx
  ON articles (published_at DESC NULLS LAST, id DESC) WHERE is_top;
