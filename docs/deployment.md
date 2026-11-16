# Deploying a Live Link

GitHub Pages **cannot** run this project: it only hosts static files, and the predictions need the Python
backend. Instead, a free host builds the repository's `Dockerfile` and gives you a public URL. The container
serves both the API and the website, exactly like `run.bat` does locally.

The raw datasets are **not** needed online. The trained models in `ml/artifacts/` are committed to the repository.

---

## Option A: Render (recommended; redeploys automatically on every push)

1. **Push the project to GitHub** (once):
   ```bat
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. Go to **https://render.com** and sign up with your GitHub account. The free plan works without a card.
3. Click **New → Blueprint**, select your repository and click **Apply**.
   Render reads `render.yaml`, which creates a free Docker web service called `statline`.
   - Alternative: **New → Web Service** → your repo → Language **Docker** → Instance type **Free** → **Deploy**.
4. Wait for the first build (about 5–10 minutes). When the log shows `Application startup complete`, your link is live:
   **`https://statline-xxxx.onrender.com`** (shown at the top of the service page).
5. Every later `git push` redeploys automatically.

**Free-tier behaviour to know before a demo**
- The service **sleeps after 15 minutes without visitors**. The first visit after that takes about 30–60 seconds
  to wake up. Open the link a minute before you present.
- Prediction **history resets** whenever the service restarts or redeploys (free instances have no permanent
  disk). Models and analytics are unaffected.
- Memory limit: 512 MB. The app uses about 310 MB, measured locally after many predictions.

## Option B: Hugging Face Spaces (no sleep for 48 h, 16 GB RAM)

1. Sign up at **https://huggingface.co**, then go to **New Space** → SDK **Docker** → *Blank* → Public → Create.
2. Add this block to the **top of `README.md`** (Spaces reads it):
   ```yaml
   ---
   title: Statline
   sdk: docker
   app_port: 8000
   ---
   ```
3. Push the repository to the Space (use an access token as the password):
   ```bat
   git remote add space https://huggingface.co/spaces/<hf-username>/statline
   git push space main
   ```
   The `.png` screenshots and `.pptx` files may need Git LFS on Hugging Face. If the push is rejected, run
   `git lfs install`, then `git lfs track "*.png" "*.pptx" "*.ico" "*.joblib" "*.parquet"`, commit and push again.
4. The link is `https://huggingface.co/spaces/<hf-username>/statline`.

## After deploying

- Put the link at the top of `README.md` (the "Live demo" line) and in the presentation.
- Check `https://<your-link>/api/health`: all four games should say `"ready"`.
- The API docs are at `https://<your-link>/docs`.

## Notes

- `requirements-deploy.txt` pins the **exact** library versions used for training. Keep them in sync if you
  retrain with newer versions.
- The CS:GO dataset is CC BY-NC-SA 4.0, so a public demo is fine for this academic, non-commercial project.
- The Docker image was written for these hosts but could not be test-built on the development laptop (Docker
  isn't installed there). Render's build log is the first real build. If it fails, the log shows which step.
