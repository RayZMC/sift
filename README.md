# Sift

Sift is a news aggregator where you can browse categories, search and filter articles, and save bookmarks in your browser.

**Live site:** https://sift-news.onrender.com

## Run locally

You need Node.js and PostgreSQL installed.

1. In `server/`, install dependencies with `npm install`.
2. Copy `server/.env.example` to `server/.env` and enter your local PostgreSQL details.
3. In `server/`, run `npm run db:migrate` and `npm run news:import`.
4. Start the API with `npm run dev`.
5. In a second terminal, go to `client/`, run `npm install`, then `npm run dev`.
6. Open the address printed by Vite, usually http://localhost:5173.

## Built with

React, Express, PostgreSQL, and RSS feeds. Hosted on Render and Neon; GitHub Actions imports news hourly.
