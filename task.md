# Akamo Flutter — Implementation Tasks

## Phase 1: Wire Supabase Init + Auth into Main App
- [ ] Call `dotenv.load()` + `Supabase.initialize()` in `main()`
- [ ] Initialize `AkamoAudioHandler` via `initAudioService()`
- [ ] Wrap app with `Provider<AkamoAudioHandler>`
- [ ] Add auth state listener at shell level
- [ ] Replace `_SprintPreview` placeholders with real views
- [ ] Wire onboarding/auth flow

## Phase 2: Complete SupabaseService — Full CRUD
- [ ] Profile methods (upsert, username check, avatar upload)
- [ ] Track methods (fetchUserTracks, delete, update, insert)
- [ ] Album methods (create, delete, update, fetchAlbumTracks, add/remove/sync tracks)
- [ ] Playlist methods (delete, update, removeTrack, reorder)
- [ ] Upload methods (uploadAudio, uploadCover)
- [ ] Social & notifications (fetchUserStats, songRequests, etc.)
- [ ] New models (SongRequestModel, UserStatModel)

## Phase 3: Home View — Live Data
- [ ] Remove hardcoded data, fetch real tracks/albums/playlists
- [ ] Wire play actions to AkamoAudioHandler
- [ ] Wire album/playlist card taps to navigation

## Phase 4: Upload — Real Supabase Storage
- [ ] Rework upload modal with title/artist/cover fields
- [ ] Upload audio + cover to Supabase Storage
- [ ] Insert track record

## Phase 5: Album & Playlist Detail Views
- [ ] Album detail: fetch tracks, play all, shuffle, owner actions
- [ ] Playlist detail: fetch tracks, play all, shuffle, owner actions
- [ ] Wire create album/playlist modals

## Phase 6: Social, Account, Admin
- [ ] Social leaderboard view
- [ ] Account settings (profile editing, avatar, sign out)
- [ ] Admin requests view (owner only)
- [ ] Uploads dashboard

## Phase 7: Search, Realtime, Polish
- [ ] Search bar + filtering
- [ ] Realtime subscriptions
- [ ] Library view actions (add to playlist, create buttons)
