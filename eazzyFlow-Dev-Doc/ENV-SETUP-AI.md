# 🔑 Environment Variables Setup - Dual-Engine AI

## Required Environment Variables

Add these to your `.env` file:

```properties
# DeepSeek API (Left Brain - Logic)
VITE_DEEPSEEK_API_KEY=sk-xxxx
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com

# Fal.ai (Right Brain - Vision)
VITE_FAL_KEY_ID=xxxx-xxxx
```

## How to Get API Keys

### 1. DeepSeek API Key

1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)
6. Add to `.env` as `VITE_DEEPSEEK_API_KEY`

**Note**: 
- Base URL is typically `https://api.deepseek.com`
- Model options: `deepseek-chat` (default) or `deepseek-reasoner` (for complex reasoning)

### 2. Fal.ai Key ID

1. Visit [Fal.ai Dashboard](https://fal.ai/dashboard)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the Key ID
6. Add to `.env` as `VITE_FAL_KEY_ID`

**Note**: 
- Fal.ai uses Key ID format: `xxxx-xxxx-xxxx-xxxx`
- Used for Flux.1 image generation

## Verification

After adding the keys, restart your development server:

```bash
npm run dev
```

Check the browser console for any API key errors. You should see:
- ✅ "DeepSeek client initialized" (if keys are valid)
- ✅ "Fal.ai configured" (if Fal key is valid)

## Troubleshooting

### Error: "DeepSeek API Key not configured"
- Check that `VITE_DEEPSEEK_API_KEY` is in `.env`
- Ensure the key starts with `sk-`
- Restart the dev server after adding the key

### Error: "Fal.ai Key ID is missing"
- Check that `VITE_FAL_KEY_ID` is in `.env`
- Ensure the key format is correct
- Restart the dev server after adding the key

### Image Generation Not Working
- Verify Fal.ai key is valid
- Check browser console for Fal.ai API errors
- Ensure you have credits in your Fal.ai account

