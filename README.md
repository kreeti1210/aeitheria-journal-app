# Aetheria — AI Journal & Reflection Companion

A production-grade, privacy-first personal journaling and cognitive reflection web application powered by **Gemini 3.7 Flash**, **Firebase Authentication**, and **Cloud Firestore**.

"A private space to think out loud."

---

## 🏛️ Architecture & Security Model

```
┌────────────────────────────────────────────────────────────────────────┐
│                    Client Browser (React 19 + Vite)                    │
│  - Firebase Auth (Google Federated Identity)                           │
│  - Cloud Firestore SDK (Direct User-Isolated Subcollections)           │
│    * /users/{uid}/journalEntries (Daily Thoughts & Reflections)        │
│    * /users/{uid}/interactions (Multi-Turn Conversational Talks)        │
│    * /users/{uid}/ventSessions (Raw Emotions & Post-Vent Decisions)    │
│    * /users/{uid}/futureLetters (Time-Locked Capsules)                 │
│    * /users/{uid}/tinyWins (Micro-Gratitude Journaling)                │
│    * /users/{uid}/cycleProfile (Cycle-Aware Support Context)           │
└───────────────────────────▲───────────────────────────▲────────────────┘
                            │                           │
                   Direct Database Reads/Writes         │ Proxied AI Calls
                   (/users/{uid}/*)                     │ (/api/ai/reflect)
                            │                           │
┌───────────────────────────▼───────────────────────────▼────────────────┐
│                   Cloud Run Full-Stack Express Server                  │
│  - Zero API Key Exposure to Browser                                    │
│  - Resilient Model Fallback Ladder:                                    │
│    gemini-3.7-flash -> gemini-3.1-flash-lite                           │
│    -> gemini-flash-latest                                              │
│  - Defensive Payload Ingestion & Undefined Sanitization                │
└───────────────────────────────────────┬────────────────────────────────┘
                                        │
                        ┌───────────────▼──────────────┐
                        │    Google Cloud Secret Mgr   │
                        │       (GEMINI_API_KEY)       │
                        │   Zero-Hardcoded Secrets     │
                        └──────────────────────────────┘
```

---

## 🛡️ Threat Model & Security Controls

| Threat Zone | Identified Scenario | Countermeasure & Implemented Control |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious injection, oversized prompt payload | Input size bounds, defensive JSON parsing, null-safe payload extraction. |
| **Planning & Reasoning**| Prompt injection via journal or vent context | Strict separation of system instructions from untrusted journal inputs; AI responses parsed safely as data. |
| **Tool & API Execution**| API rate limits or transient outages (`429`, `503`)| Automatic server-side fallback chain (`gemini-3.7-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest`). |
| **Memory & State** | Cross-tenant data leakage | Strict owner-bound Firestore security rules (`/users/{userId}/*`) + strict undefined stripping before database writes. |
| **Inter-System Secrets**| Hardcoded credentials in source code | Zero-hardcoding hygiene: Gemini API key accessed strictly server-side via environment variables / Secret Manager. |

---

## 🔒 Firestore Security Rules

Deploy the following rules to enforce user data isolation across all collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Zero insecure defaults - default deny
    match /{document=**} {
      allow read, write: if false;
    }

    // User data isolation: only the authenticated owner can access their subcollections
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /journalEntries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /ventSessions/{sessionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /futureLetters/{letterId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /tinyWins/{winId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /cycleProfile/{profileId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /patternInsights/{insightId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🚀 Step-by-Step Google Cloud Deployment Guide

### 1. Prerequisites & Enable APIs
Ensure the `gcloud` CLI is installed and authenticated to your Google Cloud project:

```bash
# Set your project ID
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export REGION="us-central1"
export SERVICE_NAME="aetheria-journal-app"

gcloud config set project $PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

---

### 2. Secret Manager Configuration (Zero-Hardcoding)

Create and store your `GEMINI_API_KEY` securely in Secret Manager:

```bash
# 1. Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add your Gemini API key value
echo -n "YOUR_GEMINI_API_KEY_HERE" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Retrieve your GCP Project Number
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# 4. Grant the Cloud Run default service account permission to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

### 3. Deploy to Cloud Run

Deploy the container application with the secret mounted as an environment variable:

```bash
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

---

### 4. Mandatory Campaign Resource Verification Labeling

Apply the mandatory challenge verification label to your Cloud Run service:

```bash
gcloud run services update $SERVICE_NAME \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

---

## 🧪 Functional Stability & Test Walkthrough Matrix

The application includes an in-app verification suite (`Test Walkthrough` modal, icon in top bar) mapping all user interactions:

1. **Authentication & Session Isolation**: Verify Google Sign-In, token resolution, and header profile rendering.
2. **Private Journaling (Write)**: Test title, moods, tagging, and real-time autosave to `/users/{uid}/journalEntries`.
3. **Vent Out Canvas**: Test ephemeral raw text entry, speech-to-text dictation, burn animation, and emotional transformation.
4. **Talk & Multi-Turn Reflections**: Test empathetic conversation modes ("Listen & Hold Space", "Socratic", "Cognitive Reframe", "Brainstorm").
5. **Growth & Reflection Suite**: Test pattern recognition analysis, Then vs. Now comparisons, future letter capsules, and tiny wins logging.
6. **Cycle-Aware Support**: Test optional and private cycle tracking that adjusts AI conversational tone.
7. **Firestore Persistence & Zero Secrets**: Verify owner-bound rules and server-side secret protection.

---

## 📄 License
Apache-2.0
