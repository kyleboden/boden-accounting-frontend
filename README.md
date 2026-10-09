# Boden Accounting — Frontend

A personalized financial planning application for budgeting, income and investment tracking, monthly financial reviews, and long-term financial projections.

## Tech Stack

- React
- TypeScript
- Vite
- React Router
- Axios
- Supabase

## Features

- Household budgeting and income tracking
- Investment tracking
- Monthly financial reviews
- Long-term savings and investment projections
- Personalized financial planning workflows
- Authentication
- Plaid Sandbox bank connections and transaction browsing (POC)

## Plaid Sandbox POC

The **Transactions** page browses Plaid transactions by month or custom date range. It supports sorting, text/category/bank/review filters, colored categories, a lightweight review check beside each assigned category, app-side date adjustments, and categorized transaction splits. Split amounts must add up to the source transaction total. Category changes save immediately; notes save when the field loses focus or Enter is pressed. The **Settings** page connects multiple Sandbox institutions, lists connected banks, configures tracked categories and colors, and manages merchant rules. Before a rule is created, the app previews how many transactions in the available 24-month Plaid history match; confirming applies the category to those transactions, including reviewed ones, while preserving their notes and review state. Transactions are fetched from Plaid when requested and are not copied into the app database. Categories, review status, notes, date adjustments, and splits are saved separately per signed-in user and connection; notes are encrypted with AES-GCM. The backend stores each Plaid Item in its own table, scoped to the signed-in user; its access token is also encrypted before it reaches the database.

Set `PLAID_CLIENT_ID` and `PLAID_SECRET` from the Plaid Dashboard's **Sandbox** keys, plus a private 32-byte encryption key, in the backend environment. Generate the encryption key with `openssl rand -base64 32`. Do not put Plaid credentials in frontend environment variables or commit a real `.env` file. Configure the same encryption key in every backend instance that reads this database, and keep a secure backup of it; losing it makes stored access tokens unreadable.

When Plaid credentials are ready, sign in to the app, open **Settings**, choose **Connect a bank**, and use Plaid's Sandbox test credentials (`user_good` / `pass_good`) in Link. Repeat to add additional Sandbox institutions. Real bank accounts are not needed for this POC.

## Development

Built as a full-stack application with a React/TypeScript frontend and Java/Spring Boot backend.

The application was developed primarily using an agentic, spec-driven development workflow.
