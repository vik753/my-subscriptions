# Google OAuth: publishing and verification

How to take the app's Google sign-in from _Testing_ to _In production_, and, when needed, through
Google's verification. Only users who turn on Google Calendar or Drive for a hobby are affected;
the local-only app needs none of this.

| Mode                      | Who can sign in                                | Catch                                                |
| ------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Testing                   | Only the ≤ 100 "Test users" you add by hand    | Google revokes access every 7 days                   |
| In production, unverified | Any Google account, **100 users lifetime** cap | "Google hasn't verified this app" warning at sign-in |
| In production, verified   | Anyone, no cap                                 | —                                                    |

The app requests `calendar.app.created` (probably classified as _sensitive_ — the console shows the
class next to each scope) and `drive.appdata` (non-sensitive), plus `openid email profile`. There
are no _restricted_ scopes, so verification needs **no paid security assessment**.

## Pages already in place

| What           | URL                                                    |
| -------------- | ------------------------------------------------------ |
| App homepage   | https://vik753.github.io/my-subscriptions/home.html    |
| Privacy policy | https://vik753.github.io/my-subscriptions/privacy.html |
| App            | https://vik753.github.io/my-subscriptions/             |
| Logo (120×120) | `docs/oauth-logo-120.png` in this repo                 |

The privacy policy contains the required **Limited Use** statement and explains every scope.

## Step 1 — Publish (needed even for family)

Google Cloud Console → **APIs & Services → OAuth consent screen** (in the new UI: **Google Auth
Platform → Audience**) → **Publish app** → confirm. Users then see the "unverified app" warning;
they tap **Advanced → Go to My Subscriptions**. Up to 100 users can sign in this way.

## Step 2 — Prove you own the domain

Google needs the homepage domain verified in **Google Search Console** under the same Google
account that owns the Cloud project.

1. https://search.google.com/search-console → **Add property** → **URL prefix** →
   `https://vik753.github.io/my-subscriptions/`.
2. Choose **HTML file**, download the file (`google….html`) and send it to Claude (or put it in
   `public/` yourself) — it must be served at
   `https://vik753.github.io/my-subscriptions/google….html`. Merge the PR so Pages deploys it.
3. Click **Verify** in Search Console.

(`github.io` is on the Public Suffix List, so `vik753.github.io` counts as your own domain.)

## Step 3 — Fill in the consent screen (Branding)

| Field                        | Value                                                  |
| ---------------------------- | ------------------------------------------------------ |
| App name                     | My Subscriptions                                       |
| User support email           | vik753@gmail.com                                       |
| App logo                     | `docs/oauth-logo-120.png`                              |
| Application home page        | https://vik753.github.io/my-subscriptions/home.html    |
| Application privacy policy   | https://vik753.github.io/my-subscriptions/privacy.html |
| Application terms of service | (optional — leave empty)                               |
| Authorized domains           | `vik753.github.io`                                     |
| Developer contact email      | vik753@gmail.com                                       |

**Data access (scopes):** `openid`, `…/auth/userinfo.email`, `…/auth/userinfo.profile`,
`…/auth/calendar.app.created`, `…/auth/drive.appdata`. Nothing else.

## Step 4 — Justifications (paste into the form)

**calendar.app.created**

> My Subscriptions tracks prepaid class passes (gym, lessons). When the user turns on "Add to
> Google Calendar" for a hobby, the app creates one secondary calendar named "My Subscriptions"
> and writes one event per session (date, time, duration, paid/unpaid status), updating or
> deleting events when the user marks, moves or cancels sessions. Optionally the user adds guests
> (e.g. a partner) as attendees so the sessions appear in their calendar. The app never reads or
> changes the user's other calendars; this narrow scope is the least access that allows creating
> and maintaining its own calendar. All requests go directly from the user's browser to Google;
> there is no server.

**drive.appdata**

> When the user turns on "Back up to Google Drive" for a hobby, the app stores one JSON file
> (state.json) with those hobbies and the app settings in its hidden application data folder, to
> restore data and keep the user's devices in sync. The app cannot see any other Drive files.

## Step 5 — Demo video

Google asks for an unlisted YouTube video (2–4 minutes, English UI) showing the OAuth flow and how
each scope is used. Script:

1. Open https://vik753.github.io/my-subscriptions/ — the app works locally, no sign-in.
2. Create a hobby; switch on **Add to Google Calendar** and **Back up to Google Drive** → Create.
3. The Google consent screen appears: show the **browser address bar with the client ID** and the
   two permissions; allow.
4. Back in the app: the hobby shows "Synced with Google Calendar".
5. Open Google Calendar: the "My Subscriptions" calendar with the sessions (paid in color).
6. In the app, mark a session or cancel one → show the event change in Google Calendar.
7. Settings → **Delete data… → Delete only from Google** → the calendar disappears.
8. Mention that Drive holds one hidden `state.json` (not visible in the Drive UI) used for backup.

## Step 6 — Submit

Consent screen → **Verification Center** → **Prepare for verification** → submit. Google replies
by email (usually days to a couple of weeks), sometimes with questions — answer from the same
account. Until approval, the app keeps working in "unverified" mode (Step 1).
