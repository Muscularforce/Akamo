# Akamo Flutter App — Full Feature Parity with Website

The Akamo website (akamo.vercel.app) is a fully functional music streaming platform built with React + Supabase. The Flutter app currently has beautiful UI shells but most features are **static placeholders** with hardcoded data. This plan brings the app to full functional parity.

## Current State Assessment

### What the Website Has (Working)
| Feature | Status |
|---|---|
| Auth (email/password sign up & login) | ✅ Full |
| User profiles (display name, avatar, username) | ✅ Full |
| Track streaming from Supabase Storage | ✅ Full |
| Track upload (audio + cover to Supabase Storage) | ✅ Full |
| Track CRUD (edit metadata, delete) | ✅ Full |
| Album CRUD (create, edit, delete, manage tracks) | ✅ Full |
| Playlist CRUD (create, edit, delete, add/remove tracks) | ✅ Full |
| Album detail view with play all / shuffle | ✅ Full |
| Playlist detail view with play all / shuffle | ✅ Full |
| Playback context (queue, next/prev within album/playlist) | ✅ Full |
| Search (filter tracks by title/artist/album) | ✅ Full |
| Social view (leaderboard with upload stats) | ✅ Full |
| Notifications (owner-posted announcements) | ✅ Full |
| Account settings (edit profile, avatar upload) | ✅ Full |
| Song requests (users request songs) | ✅ Full |
| Admin requests dashboard (owner approves/rejects) | ✅ Full |
| Uploads dashboard (view your uploaded tracks) | ✅ Full |
| Real-time updates (Supabase realtime channels) | ✅ Full |
| Owner/founder role enforcement | ✅ Full |

### What the Flutter App Has (Current)
| Feature | Status |
|---|---|
| Beautiful glassmorphism UI shell | ✅ Done |
| Navigation dock (Home, Explore, Library, Saved) | ✅ Done |
| Home view with **hardcoded** album/track cards | ⚠️ Static UI only |
| Supabase SDK initialized (`supabase_flutter`) | ✅ Done |
| `SupabaseService` with basic fetch methods | ⚠️ Partial (read-only) |
| Data models (`TrackModel`, `AlbumModel`, `PlaylistMetaModel`, etc.) | ✅ Done |
| `AkamoAudioHandler` (just_audio + audio_service) | ✅ Done |
| `ExploreView` with live track charts | ✅ Functional |
| `LibraryView` with tabs (Tracks/Albums/Playlists) | ⚠️ Fetches data but no actions |
| `PlayerView` (mini player bar) | ✅ Functional |
| `UploadModal` | ⚠️ Mock upload (doesn't actually upload to Supabase) |
| `AccountSettingsView` | ⚠️ Shell only (shows email, no profile editing) |
| `SocialView` | ⚠️ "Coming Soon" placeholder |
| Onboarding / Auth flow | ⚠️ UI exists but not wired to main flow |
| Album detail view | ⚠️ Shell (no play, no manage) |
| Playlist detail view | ⚠️ Shell (no play, no manage) |
| Search | ❌ Not implemented |
| Track delete/edit | ❌ Not implemented |
| Real-time subscriptions | ❌ Not implemented |

## Proposed Changes

The work is split into 7 phases, ordered by dependency.

---

### Phase 1: Wire Supabase Init + Auth into Main App

The app has `supabase_flutter` and `.env` but `main.dart` never calls `Supabase.initialize()` or `dotenv.load()`. The home view uses hardcoded data instead of live data.

#### [MODIFY] [main.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/main.dart)
- Call `await dotenv.load()` and `await Supabase.initialize(url:..., anonKey:...)` in `main()`
- Initialize `AkamoAudioHandler` via `initAudioService()`
- Wrap app with `Provider<AkamoAudioHandler>` so all views can access it
- Add auth state listener — track `User?` and `UserProfileModel?` at shell level
- Replace the hardcoded `_SprintPreview` placeholders for Explore/Library/Saved tabs with the real views
- Wire the onboarding/auth flow: show `OnboardingView` if user is not authenticated, `AkamoShell` if authenticated

---

### Phase 2: Complete SupabaseService — Full CRUD Parity

The current service only has `fetch` methods. The website has full CRUD for tracks, albums, playlists, profiles, notifications, song requests, and storage uploads.

#### [MODIFY] [supabase_service.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/services/supabase_service.dart)
Add all missing methods to match [supabase.ts](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/src/lib/supabase.ts):

**Profile methods:**
- `upsertProfile()`, `checkUsernameAvailability()`, `fetchAllProfiles()`, `uploadAvatar()`

**Track methods:**
- `fetchUserTracks()`, `deleteTrack()` (delete from DB + storage), `updateTrack()`

**Album methods:**
- `createAlbum()`, `deleteAlbum()`, `updateAlbum()`, `fetchAlbumTracks()` (joined query), `addTrackToAlbum()`, `removeTrackFromAlbum()`, `syncAlbumTracks()`

**Playlist methods:**
- `createPlaylist()`, `deletePlaylist()`, `updatePlaylist()`, `addTrackToPlaylist()`, `removeTrackFromPlaylist()`, `reorderPlaylistTracks()`

**Upload methods:**
- `uploadAudio()` — upload audio file to Supabase storage `songs` bucket
- `uploadCover()` — upload cover image to Supabase storage `songs` bucket
- `insertTrack()` — insert track record into `tracks` table

**Social & notifications:**
- `fetchUserStats()`, `createNotification()`, `createSongRequest()`, `fetchSongRequests()`, `updateSongRequestStatus()`

#### [NEW] [song_request_model.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/core/models/song_request_model.dart)
- Model for song requests with `id`, `title`, `user_name`, `status`, `created_at`

#### [NEW] [user_stat_model.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/core/models/user_stat_model.dart)
- Model for user stats leaderboard data

---

### Phase 3: Home View — Live Data from Supabase

The home view is currently 100% hardcoded with `_AlbumSpec` and `_TrackSpec`. It needs to display real albums, tracks, and public playlists from Supabase.

#### [MODIFY] [home_view.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/features/home/home_view.dart)
- Remove hardcoded `_albums` and `_tracks` lists
- Fetch real data in `initState`: `fetchTracks()`, `fetchAlbums()`, `fetchPlaylists()` (public)
- Display real album covers (network images) in the Albums horizontal scroll
- Display real tracks in the Focus tracks section
- Display public playlists section (matching website's home page)
- Wire "Play" button on Signal Console to actually play the selected track
- Wire album card taps to navigate to album detail
- Wire track card taps to play the track via `AkamoAudioHandler`

---

### Phase 4: Upload — Real Supabase Storage Upload

The current upload modal is a mock. The website uploads audio to `songs/audio/` and covers to `songs/covers/` in Supabase Storage, then inserts a track record.

#### [MODIFY] [upload_modal.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/features/upload/upload_modal.dart)
- Add fields for title, artist, album name (text inputs)
- Add cover image picker (using `file_picker` for images)
- Upload audio file to Supabase Storage `songs` bucket at `audio/{userId}-{timestamp}.ext`
- Upload cover image to Supabase Storage `songs` bucket at `covers/{userId}-{timestamp}.ext`
- Get public URLs for both
- Insert track record into `tracks` table via `SupabaseService.insertTrack()`
- Show upload progress indicator
- Require auth (check `currentUser` before showing)

---

### Phase 5: Album & Playlist Detail Views — Full Functionality

#### [MODIFY] [album_detail_view.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/features/albums/album_detail_view.dart)
- Fetch album tracks via `fetchAlbumTracks()` (joined query, ordered by trackNumber)
- "Play All" button → load all tracks into `AkamoAudioHandler.loadPlaylist()`
- "Shuffle All" button → shuffle + load
- Individual track tap → play from context (queue = album tracks, start at tapped index)
- Owner actions: edit album, delete album, remove track from album
- Back navigation

#### [MODIFY] [playlist_detail_view.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/features/playlists/playlist_detail_view.dart)
- Fetch playlist tracks via `fetchPlaylistTracks()` (joined, ordered by position)
- "Play All" / "Shuffle All" buttons
- Individual track tap → play from playlist context
- Owner actions: edit playlist metadata, delete playlist, remove track
- "Browse Music" button → navigate to Library to add tracks

#### [MODIFY] [create_album_modal.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/features/albums/create_album_modal.dart)
- Wire form submission to `SupabaseService.createAlbum()`
- Add track selection (pick from existing tracks)
- Cover image upload

#### [MODIFY] [create_playlist_modal.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/features/library/create_playlist_modal.dart)
- Wire form submission to `SupabaseService.createPlaylist()`
- Add public/private toggle

---

### Phase 6: Social View, Account Settings, Notifications

#### [MODIFY] [social_view.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/features/social/social_view.dart)
- Replace "Coming Soon" with a real leaderboard view
- Fetch `user_stats` view from Supabase
- Display ranked list with trophy/medal icons for top 3
- Show total uploads count, user avatars, display names
- Match website's `SocialView.tsx` functionality

#### [MODIFY] [account_settings_view.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/features/account/account_settings_view.dart)
- Display and edit: display name, username, avatar
- Avatar upload via `SupabaseService.uploadAvatar()`
- Username availability check
- Sign out button
- Song request form (submit song requests)
- Link to admin requests (if owner role)

#### [NEW] [admin_requests_view.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/features/account/admin_requests_view.dart)
- Fetch pending song requests
- Approve / reject actions (owner only)

#### [NEW] [uploads_dashboard_view.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/features/account/uploads_dashboard_view.dart)
- Show all tracks uploaded by the current user
- Edit / delete actions on each track

---

### Phase 7: Search, Real-time, and Polish

#### [MODIFY] [main.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/main.dart) (or home_view.dart)
- Add search bar in the top bar (currently just a non-functional icon)
- Filter tracks by title, artist, album (matching website's `searchQuery` logic)
- Display search results in a grid

#### [MODIFY] [supabase_service.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/services/supabase_service.dart)
- Add Supabase realtime channel subscriptions for `tracks`, `albums`, `playlists` tables
- Expose streams that the UI can listen to for live updates

#### [MODIFY] [library_view.dart](file:///c:/Users/Jovan%20Fernandes/OneDrive/Documents/akamo/akamo_app/lib/features/library/library_view.dart)
- Add "Add to Playlist" action on track long-press
- Add "Create Album" / "Create Playlist" FAB buttons
- Wire album/playlist card taps to navigate to detail views

---

## Open Questions

> [!IMPORTANT]
> **Navigation approach**: The Flutter app currently uses an `IndexedStack` with 4 tabs. The website has many more views (album detail, playlist detail, account, uploads, admin, social, auth). Should I:
> - **(A)** Keep the 4-tab dock and push detail views as full-screen pages via `Navigator.push()`
> - **(B)** Expand the dock to include more tabs (like the website sidebar)
> 
> I recommend **(A)** — it's the standard mobile pattern.

> [!IMPORTANT]
> **Auth gate**: Should the app require login before showing any content (like Spotify), or allow browsing tracks/albums without auth and only require login for uploads/playlists (like the website)?

> [!IMPORTANT]
> **Saved tab**: The website doesn't have a distinct "Saved/Favorites" feature — it reuses the Library view. Should I keep the 4th tab as "Saved" with a placeholder, or replace it with something else (e.g., "Profile/Account")?

---

## Verification Plan

### Automated Tests
```bash
cd akamo_app && flutter analyze
cd akamo_app && flutter build apk --debug
```

### Manual Verification
- Run `flutter run -d windows` or `-d chrome` and verify:
  - Home shows real albums, tracks, and playlists from Supabase
  - Tapping a track plays audio via the player bar
  - Next/Previous works within album/playlist context
  - Upload flow: pick file → upload to Supabase → track appears in library
  - Album/Playlist detail views show tracks, play all works
  - Social leaderboard shows real user stats
  - Account settings allow profile editing
  - Search filters tracks in real-time
