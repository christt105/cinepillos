/*
  Sign-ins before the Google provider stopped mapping `picture` stored the
  Google profile photo in "User"."image", which /privacy says we never keep.
  `avatarUrl` already ignores those values, so they only render as the default
  avatar; a TMDB poster path ("/abc.jpg") and a TheTVDB character URL are the
  only values the avatar picker can produce, and both are kept.
*/
UPDATE "User"
SET "image" = NULL
WHERE "image" IS NOT NULL
  AND "image" NOT LIKE '/%'
  AND "image" NOT LIKE 'https://artworks.thetvdb.com/%'
  AND "image" NOT LIKE 'http://artworks.thetvdb.com/%';
