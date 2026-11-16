# Chapter 23 — Live accounts and private admin dashboard

## What's included
This is your **existing approved Chapter 23 magazine website**, with the 48 existing cover photos, hero photo, logo, styling and Volumes preserved. The login and enquiry buttons now connect to Supabase after configuration. There is a private admin dashboard for orders, registered customers and recent recorded sign-ins.

## Connect it
1. Create a Supabase project at https://supabase.com/ (a free tier may be available, subject to current limits).
2. Open Supabase → SQL Editor, paste and run `supabase-setup.sql`.
3. Open Project Settings → API / Connect and copy the **project URL** and **publishable (or anon) key** into `chapter23-config.js`. Never paste the secret/service_role key into a website.
4. In Supabase Authentication → Providers, enable email authentication. Set your production Site URL and redirect URLs in Authentication → URL Configuration. Confirm email delivery and settings before launch.
5. Upload **all three website files** (`index.html`, `chapter23-config.js`, `chapter23-live.js`) together to a static HTTPS host such as Netlify, Cloudflare Pages or GitHub Pages. Opening the file locally is only for preview; the real flow should be tested on HTTPS.
6. On the hosted site, use Account → Create account with your own email. Confirm the email if prompted, then sign in.
7. In Supabase SQL Editor, grant your account admin rights:
   `insert into public.admin_users(user_id) select id from auth.users where email='YOUR_EMAIL' on conflict do nothing;`
8. Refresh the website and sign in. **Admin ↗** appears in the header for your account only. Open it to see customers, order requests, sign-ins and to update order/payment statuses.
9. Place a test order with a separate customer account and confirm that it appears in your admin dashboard. Verify that a customer cannot see another customer's orders.

## Important limitations
- This is a **working frontend + database integration after setup**, not an already deployed live service. Nothing will be saved until Supabase is configured and the site is hosted.
- **Payment is manual**: the admin can mark paid only after independently verifying a UPI/bank transaction. The website does not accept payments or verify transactions.
- **Email alerts are not enabled** by these files. Configure a Supabase Database Webhook / Edge Function plus an email provider such as Resend to notify yourself of new order inserts; protect webhook credentials server-side. Until then, check the admin dashboard.
- Sign-in events are recorded for successful sign-ins **through this website**; these are not a complete audit of every Supabase authentication event.
- The admin customer counter shows up to 100 recent profiles (not an all-time total if you grow beyond 100). Pagination and exports should be added for production.
- Website photos and fonts remain online resources and need internet access. Use only photographs you have rights to use commercially.
- Before public launch, add your privacy policy, refund policy, shipping/fulfilment terms and contact details. Do not collect unnecessary sensitive personal information.
