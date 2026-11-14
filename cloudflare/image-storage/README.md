# Cloudflare R2 image storage

The app keeps Supabase Auth and all database tables/columns. This Worker handles
only image upload and deletion; image URLs continue to be saved in
`product_images.image_url` and `profiles.avatar_url`.

## One-time Cloudflare setup

1. Use the existing R2 bucket named `ica-shop` (or update `bucket_name` in
   `wrangler.toml` to match your bucket).
2. Connect a custom domain to the bucket (for example, `images.example.com`)
   and make sure it serves public object reads. The app uses that domain for
   product and avatar image URLs.
3. In `wrangler.toml`, replace the Supabase URL, public image domain, and
   allowed origins with your actual values. Include the production storefront
   origin and `http://localhost:5173` for local development.
4. From this directory, set the Supabase anon key as a Worker secret and deploy:

   ```powershell
   npx wrangler secret put SUPABASE_ANON_KEY
   npx wrangler deploy
   ```

   Use the same Supabase anon/public key as the frontend. Never set the
   Supabase service-role key or R2 credentials in the frontend.
5. Add `VITE_IMAGE_API_URL` to the frontend environment (local `.env` and
   production hosting settings), using the deployed Worker origin, for example
   `https://ica-image-storage.<your-subdomain>.workers.dev`. Rebuild/redeploy
   the frontend after setting it.

The Worker confirms each Supabase session. It allows users to upload/delete
only their own avatars and checks the `profiles.role` database value before
product image operations. R2 write credentials are provided by the bucket
binding and never exposed to the browser.
