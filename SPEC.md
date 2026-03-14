# Technical Specification: Lokalmatador - Firefighter Local Knowledge App

## Project Overview
Lokalmatador is a web application designed to help firefighters in Bassersdorf (Switzerland) improve their local knowledge of street names. The app leverages OpenStreetMap (OSM) data to provide interactive learning and competitive testing modes. **The entire infrastructure is hosted on Amazon Web Services (AWS), focusing on minimal operating costs through serverless technologies.**

## Technical Stack (AWS-Optimized & Cost-Efficient)
- **Frontend**: React (TypeScript) with **Vite**. Hosted as a static website on **Amazon S3** and distributed via **Amazon CloudFront** (CDN).
- **Internationalization**: **i18next** and **react-i18next** (Supports German and English).
- **Maps**: **Leaflet.js** with `react-leaflet`.
    - **Layers**: OpenStreetMap (Standard), CartoDB (No Labels for competition), and Esri World Imagery (Satellite).
    - **Advanced Zoom**: Support up to level 22 with overzooming (maxNativeZoom).
- **Backend**: **AWS Lambda** with **API Gateway** (Serverless, pay-per-execution).
- **Database**: **Amazon DynamoDB** (NoSQL, on-demand mode for high scores and profiles).
- **Authentication**: **Amazon Cognito** (JWT-based, large free tier for user management).
- **OSM Data**: Queried via **Overpass API**. Data is processed to group segments and handle complex relations (e.g., ensuring branches like "Obstgartenstrasse" are complete).

## Local Development & Deployment (IaC)
The project uses **Infrastructure as Code (IaC)** to bridge the gap between local development and cloud deployment.

### 1. Tooling: SST (Serverless Stack) or AWS CDK
- **Recommendation**: Use **SST** for its "Live Lambda Development" capability.
- **Advantage**: Allows testing against real cloud resources (DynamoDB, Cognito) locally with minimal latency and no need for constant redeployments.

### 2. Workflow
- **Local**: 
    - Frontend runs via Vite dev server (`npm run dev`).
    - Backend/Infrastructure is emulated or connected via `sst dev`.
    - Local storage (localStorage) is used as a mock for the leaderboard and login during the initial prototype phase.
- **Deployment**:
    - A single command (`npx sst deploy --stage prod`) automates the creation of S3, CloudFront, Lambda, and DynamoDB.

## Features
### 1. User Management
- **Login**: Simple username-based session (currently mocked via localStorage).
- **Language Selection**: Dropdown menu to switch between German and English at any time.

### 2. Learn Mode (Lernmodus)
- **Interactive Map**: Full-screen exploration of Bassersdorf.
- **Street Highlighting**: Streets are marked in blue. Clicking a street highlights it in red and shows its name via tooltip.
- **Satellite View**: Toggle between map and high-resolution satellite imagery.

### 3. Competition Mode (Wettkampfmodus)
- **Visual Challenge**: The map zooms into a specific street segment and highlights it in red.
- **"Mute" Map**: Labels/street names are hidden on the map to prevent cheating.
- **Multiple Choice**: Users select the correct name from four options.
- **Scoring**: Instant feedback. 1 point per correct answer. Results are saved to the leaderboard after 10 rounds.

### 4. Leaderboard
- **Rankings**: Displays top users based on scores.
- **Timestamps**: Shows date and time of the achievement.

### 5. Release Notes
- **Changelog**: A dedicated page listing all implemented features and updates.

## Implementation Status (Roadmap)
1.  [x] **Infrastructure**: React/Vite/TS Setup.
2.  [x] **OSM Integration**: Robust fetching and grouping of Bassersdorf street data.
3.  [x] **Map Engine**: Leaflet integration with custom layers, responsive resizing, and high-zoom support.
4.  [x] **UI/UX**: Responsive design, multi-language support (DE/EN), and Firefighter-themed styling.
5.  [x] **Game Logic**: Full Learn and Competition modes with scoring.
6.  [x] **Documentation**: SPEC.md, Release Notes, and .gitignore.
7.  [ ] **AWS Backend**: Transition from localStorage to Lambda/DynamoDB.
8.  [ ] **Authentication**: Integration with Amazon Cognito.
9.  [ ] **Cloud Deployment**: Production deployment via SST/CDK.

## Design Philosophy
- **Clarity & Focus**: Minimalist UI that keeps the map central.
- **High Contrast**: Colors (Firefighter Red) and high-contrast map styles for visibility in all lighting conditions.
- **Performance**: Optimized GeoJSON processing and client-side caching to ensure a smooth experience.
