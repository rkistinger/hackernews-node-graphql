CREATE TABLE "public"."Links" (
  id SERIAL PRIMARY KEY NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  description VARCHAR(255) NOT NULL,
  url VARCHAR(255) NOT NULL
);