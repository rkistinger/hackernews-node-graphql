DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE TABLE "public"."User" (
  id SERIAL PRIMARY KEY NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL
);

CREATE TABLE "public"."Link" (
  id SERIAL PRIMARY KEY NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  description VARCHAR(255) NOT NULL,
  url VARCHAR(255) NOT NULL,
  "postedBy" INTEGER,
  FOREIGN KEY ("postedBy") REFERENCES "public"."User"(id)
);

CREATE TABLE "public"."Vote" (
  id SERIAL PRIMARY KEY NOT NULL,
  "userId" INTEGER NOT NULL,
  "linkId" INTEGER NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "public"."User"(id),
  FOREIGN KEY ("linkId") REFERENCES "public"."Link"(id)
);