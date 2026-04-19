# Changelog

All notable changes to GuerillaGenics will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial v2 repository scaffold
- 10-formula prediction engine (GG-ELO, NIR, SSC, IIS, MDI, PDS, EAF, MID, MCS, CFS)
- FastAPI backend wired to Supabase
- React + Vite + Tailwind frontend
- Google Cloud Run deployment pipeline
- Cloudflare Pages frontend deployment
- Nightly ingest orchestrator (6am ET cron)
- NEEDLE market inefficiency detector
- Monte Carlo bracket simulator (100,000 runs)
- Kelly Criterion bet sizing calculator
- Watchlist with localStorage + optional Supabase sync
- Player award futures (MVP, Cy Young, DPOY, ROTY)

## [2.0.0] - 2026-04-19

### Changed
- Complete rewrite from v1 monolith to modular FastAPI + React architecture
- Migrated from manual deploys to full GitHub Actions CI/CD
- Database migrated to Supabase from local SQLite
- Added Workload Identity Federation for GCP auth (no JSON key files)

### Removed
- v1 Flask backend
- Manual deployment scripts

## [1.5.2] - 2025-12-01

### Fixed
- NBA ELO regression on back-to-back road games

## [1.5.0] - 2025-09-15

### Added
- MLB postseason probability model
- World Series futures leaderboard

## [1.0.0] - 2025-04-01

### Added
- Initial NBA futures prediction engine
- Basic GG-ELO implementation
- Command Center UI (v1)
