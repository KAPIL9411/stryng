# 🔍 How to Get Edge Config Credentials

## Step-by-Step Guide to Find All Edge Config Values

### Step 1: Create Edge Config in Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Log in to your account

2. **Select Your Project**
   - Click on your project name (e.g., "stryng")
   - You'll see the project overview

3. **Navigate to Storage**
   - Click on the **"Storage"** tab in the top menu
   - You'll see options for different storage types

4. **Create Edge Config**
   - Click **"Create Database"** button
   - Select **"Edge Config"** from the options
   - Give it a name: `stryng-banners`
   - Click **"Create"**

### Step 2: Get EDGE_CONFIG Connection String

After creating the Edge Config, you'll see a screen with connection details:

1. **Look for "Connection String"**
   - You'll see a section labeled "Connection String" or "EDGE_CONFIG"
   - It looks like this:
   ```
   https://edge-config.vercel.com/ecfg_xxxxxxxxxxxxx?token=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

2. **Copy the entire URL**
   - Click the **"Copy"** button next to it
   - This is your `EDGE_CONFIG` value

3. **Paste in .env**
   ```env
   EDGE_CONFIG=https://edge-config.vercel.com/ecfg_xxxxxxxxxxxxx?token=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

### Step 3: Get EDGE_CONFIG_ID

The Edge Config ID is part of the connection string:

1. **Extract from Connection String**
   - From: `https://edge-config.vercel.com/ecfg_xxxxxxxxxxxxx?token=...`
   - The ID is: `ecfg_xxxxxxxxxxxxx`

2. **Or find it in the UI**
   - On the Edge Config page, look for "Edge Config ID"
   - It's usually displayed at the top

3. **Paste in .env**
   ```env
   EDGE_CONFIG_ID=ecfg_xxxxxxxxxxxxx
   ```

### Step 4: Get VERCEL_TOKEN (API Token)

1. **Go to Account Settings**
   - Click your profile picture (top right)
   - Select **"Settings"**
   - Or visit: https://vercel.com/account/tokens

2. **Navigate to Tokens**
   - Click **"Tokens"** in the left sidebar
   - You'll see a list of existing tokens (if any)

3. **Create New Token**
   - Click **"Create Token"** button
   - Fill in the form:
     - **Name**: `Edge Config Sync` (or any name you prefer)
     - **Scope**: Select your project from dropdown
     - **Expiration**: Choose "No Expiration" or set a date
   - Click **"Create"**

4. **Copy the Token**
   - ⚠️ **IMPORTANT**: Copy it immediately!
   - The token is shown only once
   - It looks like: `vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - If you miss it, you'll need to create a new token

5. **Paste in .env**
   ```env
   VERCEL_TOKEN=vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## Complete .env Example

After following all steps, your .env should look like:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://gztnpezilwunmjocjglk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=dqj59es9e
VITE_CLOUDINARY_UPLOAD_PRESET=stryng_products

# Admin Emails
VITE_ADMIN_EMAILS=kurmikapil154@gmail.com,admin@stryng.com

# Vercel Edge Config
EDGE_CONFIG_ID=ecfg_abc123def456ghi789
VERCEL_TOKEN=vercel_1234567890abcdefghijklmnopqrstuvwxyz
EDGE_CONFIG=https://edge-config.vercel.com/ecfg_abc123def456ghi789?token=12345678-1234-1234-1234-123456789abc
```

## Visual Guide

### Where to Find Each Value:

```
┌─────────────────────────────────────────────────────────┐
│ Vercel Dashboard → Storage → Edge Config                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Edge Config: stryng-banners                            │
│  ┌────────────────────────────────────────────────┐    │
│  │ Connection String (EDGE_CONFIG)                │    │
│  │ https://edge-config.vercel.com/ecfg_...       │    │
│  │ [Copy Button]                                  │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Edge Config ID (EDGE_CONFIG_ID)                │    │
│  │ ecfg_xxxxxxxxxxxxx                             │    │
│  │ [Copy Button]                                  │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Vercel Dashboard → Settings → Tokens                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Create Token Button]                                  │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Token Name: Edge Config Sync                   │    │
│  │ Scope: stryng (your project)                   │    │
│  │ Expiration: No Expiration                      │    │
│  │                                                 │    │
│  │ [Create Button]                                │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ⚠️ Copy this token now (VERCEL_TOKEN)                  │
│  vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                │
│  [Copy Button]                                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Quick Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Storage (Edge Config)**: https://vercel.com/dashboard/stores
- **Account Tokens**: https://vercel.com/account/tokens
- **Project Settings**: https://vercel.com/[your-username]/[project-name]/settings

## Verification

After adding all values to .env, verify they're correct:

```bash
# Check if values are set
echo $EDGE_CONFIG_ID
echo $VERCEL_TOKEN
echo $EDGE_CONFIG
```

All three should output their respective values (not empty).

## Add to Vercel Environment Variables

Don't forget to add these to Vercel as well:

1. Go to: Project Settings → Environment Variables
2. Add each variable:
   - `EDGE_CONFIG_ID`
   - `VERCEL_TOKEN`
   - `EDGE_CONFIG`
3. Select all environments: Production, Preview, Development
4. Click "Save"

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env` to git
- Keep tokens secret
- Rotate tokens periodically
- Use different tokens for different projects
- Don't share tokens in screenshots or logs

## Troubleshooting

### Can't find Edge Config option?

**Solution**: Edge Config might not be available in your plan. Check:
- Vercel Pro plan or higher required
- Or use Hobby plan with Edge Config enabled

### Token not working?

**Solution**:
1. Verify token is copied correctly (no extra spaces)
2. Check token hasn't expired
3. Ensure token has correct scope (project access)
4. Create a new token if needed

### Connection string not working?

**Solution**:
1. Verify the entire URL is copied (including `?token=...`)
2. Check for line breaks or spaces
3. Ensure Edge Config is created and active

## Next Steps

After getting all credentials:

1. ✅ Update `.env` file
2. ✅ Add to Vercel environment variables
3. ✅ Run initial sync: `npm run sync:banners`
4. ✅ Deploy to Vercel
5. ✅ Test banner loading speed

---

**Need Help?** 
- Vercel Docs: https://vercel.com/docs/storage/edge-config
- Support: https://vercel.com/support
