CREATE TABLE articles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  url TEXT NOT NULL UNIQUE CHECK (url ~* '^https?://'),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  source TEXT NOT NULL CHECK (length(trim(source)) > 0),
  category TEXT NOT NULL CHECK (length(trim(category)) > 0),
  description TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX articles_published_at_idx
  ON articles (published_at DESC NULLS LAST, id DESC);
