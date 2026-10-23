import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/models/album_model.dart';
import '../core/models/album_track_model.dart';
import '../core/models/notification_model.dart';
import '../core/models/playlist_model.dart';
import '../core/models/song_request_model.dart';
import '../core/models/track_model.dart';
import '../core/models/user_profile_model.dart';
import '../core/models/user_stat_model.dart';

/// Central Supabase data service — mirrors every helper in the website's
/// `src/lib/supabase.ts` so the Flutter app reaches full feature parity.
class SupabaseService {
  final SupabaseClient _client = Supabase.instance.client;

  // ─── Auth convenience ─────────────────────────────────────────────────

  User? get currentUser => _client.auth.currentUser;
  String? get currentUserId => _client.auth.currentUser?.id;

  // ─── Profiles ─────────────────────────────────────────────────────────

  Future<UserProfileModel?> fetchProfile(String userId) async {
    try {
      final response =
          await _client.from('profiles').select().eq('id', userId).maybeSingle();
      if (response != null) return UserProfileModel.fromJson(response);
    } catch (e) {
      debugPrint('[Akamo] fetchProfile error: $e');
    }
    return null;
  }

  Future<List<UserProfileModel>> fetchAllProfiles() async {
    try {
      final response =
          await _client.from('profiles').select().order('display_name');
      return (response as List)
          .map((p) => UserProfileModel.fromJson(p))
          .toList();
    } catch (e) {
      debugPrint('[Akamo] fetchAllProfiles error: $e');
      return [];
    }
  }

  Future<UserProfileModel?> upsertProfile(
    String userId,
    Map<String, dynamic> updates,
  ) async {
    try {
      final response = await _client
          .from('profiles')
          .upsert({'id': userId, ...updates}, onConflict: 'id')
          .select()
          .single();
      return UserProfileModel.fromJson(response);
    } catch (e) {
      debugPrint('[Akamo] upsertProfile error: $e');
      return null;
    }
  }

  Future<bool> checkUsernameAvailability(String username) async {
    try {
      final data = await _client
          .from('profiles')
          .select('id')
          .eq('username', username)
          .maybeSingle();
      return data == null; // null → available
    } catch (_) {
      return false;
    }
  }

  Future<String?> uploadAvatar(String userId, Uint8List bytes, String ext) async {
    try {
      final path = 'avatars/$userId.$ext';
      await _client.storage.from('songs').uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(upsert: true, contentType: 'image/$ext'),
          );
      final url = _client.storage.from('songs').getPublicUrl(path);
      return '$url?t=${DateTime.now().millisecondsSinceEpoch}';
    } catch (e) {
      debugPrint('[Akamo] uploadAvatar error: $e');
      return null;
    }
  }

  // ─── Tracks ───────────────────────────────────────────────────────────

  Future<List<TrackModel>> fetchTracks() async {
    try {
      final response = await _client
          .from('tracks')
          .select()
          .order('uploadedAt', ascending: false);
      return (response as List).map((t) => TrackModel.fromJson(t)).toList();
    } catch (e) {
      debugPrint('[Akamo] fetchTracks error: $e');
      return [];
    }
  }

  Future<List<TrackModel>> fetchUserTracks(String userId) async {
    try {
      final response = await _client
          .from('tracks')
          .select()
          .eq('ownerId', userId)
          .order('uploadedAt', ascending: false);
      return (response as List).map((t) => TrackModel.fromJson(t)).toList();
    } catch (e) {
      debugPrint('[Akamo] fetchUserTracks error: $e');
      return [];
    }
  }

  Future<List<TrackModel>> fetchTracksByAlbum(String albumId) async {
    try {
      final response = await _client
          .from('tracks')
          .select()
          .eq('albumId', albumId)
          .order('uploadedAt', ascending: false);
      return (response as List).map((t) => TrackModel.fromJson(t)).toList();
    } catch (e) {
      debugPrint('[Akamo] fetchTracksByAlbum error: $e');
      return [];
    }
  }

  Future<bool> deleteTrack(TrackModel track) async {
    try {
      // Remove storage files
      final paths = <String>[];
      if (track.audioPath != null && track.audioPath!.isNotEmpty) {
        paths.add(track.audioPath!);
      }
      if (track.coverPath != null && track.coverPath!.isNotEmpty) {
        paths.add(track.coverPath!);
      }
      if (paths.isNotEmpty) {
        await _client.storage.from('songs').remove(paths);
      }
      // Delete DB record
      await _client.from('tracks').delete().eq('id', track.id);
      return true;
    } catch (e) {
      debugPrint('[Akamo] deleteTrack error: $e');
      return false;
    }
  }

  Future<bool> updateTrack(String trackId, Map<String, dynamic> updates) async {
    try {
      await _client.from('tracks').update(updates).eq('id', trackId);
      return true;
    } catch (e) {
      debugPrint('[Akamo] updateTrack error: $e');
      return false;
    }
  }

  /// Upload audio bytes to Supabase Storage and return {path, url}.
  Future<Map<String, String>?> uploadAudio(
    String userId,
    int timestamp,
    Uint8List bytes,
    String ext,
  ) async {
    try {
      final path = 'audio/$userId-$timestamp.$ext';
      await _client.storage.from('songs').uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(upsert: true, contentType: 'audio/$ext'),
          );
      final url = _client.storage.from('songs').getPublicUrl(path);
      return {'path': path, 'url': url};
    } catch (e) {
      debugPrint('[Akamo] uploadAudio error: $e');
      return null;
    }
  }

  /// Upload cover image bytes to Supabase Storage and return {path, url}.
  Future<Map<String, String>?> uploadCover(
    String userId,
    int timestamp,
    Uint8List bytes,
    String ext,
  ) async {
    try {
      final path = 'covers/$userId-$timestamp.$ext';
      await _client.storage.from('songs').uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(upsert: true, contentType: 'image/$ext'),
          );
      final url = _client.storage.from('songs').getPublicUrl(path);
      return {'path': path, 'url': url};
    } catch (e) {
      debugPrint('[Akamo] uploadCover error: $e');
      return null;
    }
  }

  /// Insert a new track record. Returns the created TrackModel.
  Future<TrackModel?> insertTrack(Map<String, dynamic> trackData) async {
    try {
      final response =
          await _client.from('tracks').insert(trackData).select().single();
      return TrackModel.fromJson(response);
    } catch (e) {
      debugPrint('[Akamo] insertTrack error: $e');
      return null;
    }
  }

  // ─── Albums ───────────────────────────────────────────────────────────

  Future<List<AlbumModel>> fetchAlbums() async {
    try {
      final response = await _client
          .from('albums')
          .select()
          .order('createdAt', ascending: false);
      return (response as List).map((a) => AlbumModel.fromJson(a)).toList();
    } catch (e) {
      debugPrint('[Akamo] fetchAlbums error: $e');
      return [];
    }
  }

  Future<AlbumModel?> fetchAlbum(String albumId) async {
    try {
      final response =
          await _client.from('albums').select().eq('id', albumId).single();
      return AlbumModel.fromJson(response);
    } catch (e) {
      debugPrint('[Akamo] fetchAlbum error: $e');
      return null;
    }
  }

  /// Fetch album tracks via the join table, ordered by trackNumber.
  Future<List<AlbumTrackModel>> fetchAlbumTracks(String albumId) async {
    try {
      final response = await _client
          .from('album_tracks')
          .select('*, track:tracks(*)')
          .eq('albumId', albumId)
          .order('trackNumber', ascending: true);
      return (response as List)
          .map((row) => AlbumTrackModel.fromJson(row))
          .toList();
    } catch (e) {
      debugPrint('[Akamo] fetchAlbumTracks error: $e');
      return [];
    }
  }

  Future<AlbumModel?> createAlbum(Map<String, dynamic> albumData) async {
    try {
      final response =
          await _client.from('albums').insert(albumData).select().single();
      return AlbumModel.fromJson(response);
    } catch (e) {
      debugPrint('[Akamo] createAlbum error: $e');
      return null;
    }
  }

  Future<bool> deleteAlbum(String albumId) async {
    try {
      await _client.from('albums').delete().eq('id', albumId);
      return true;
    } catch (e) {
      debugPrint('[Akamo] deleteAlbum error: $e');
      return false;
    }
  }

  Future<AlbumModel?> updateAlbum(
      String albumId, Map<String, dynamic> updates) async {
    try {
      final response = await _client
          .from('albums')
          .update(updates)
          .eq('id', albumId)
          .select()
          .single();
      return AlbumModel.fromJson(response);
    } catch (e) {
      debugPrint('[Akamo] updateAlbum error: $e');
      return null;
    }
  }

  Future<bool> addTrackToAlbum(String albumId, String trackId) async {
    try {
      // Find next track number
      final existing = await _client
          .from('album_tracks')
          .select('trackNumber')
          .eq('albumId', albumId)
          .order('trackNumber', ascending: false)
          .limit(1);
      final nextNumber =
          (existing.isNotEmpty) ? ((existing[0]['trackNumber'] as num).toInt() + 1) : 1;

      await _client.from('album_tracks').insert({
        'albumId': albumId,
        'trackId': trackId,
        'trackNumber': nextNumber,
      });

      // Also set albumId FK on the track itself
      await _client
          .from('tracks')
          .update({'albumId': albumId}).eq('id', trackId);
      return true;
    } catch (e) {
      // Duplicate is OK
      if (e.toString().contains('23505')) return true;
      debugPrint('[Akamo] addTrackToAlbum error: $e');
      return false;
    }
  }

  Future<bool> removeTrackFromAlbum(String albumId, String trackId) async {
    try {
      await _client
          .from('album_tracks')
          .delete()
          .eq('albumId', albumId)
          .eq('trackId', trackId);
      await _client
          .from('tracks')
          .update({'albumId': null}).eq('id', trackId);
      return true;
    } catch (e) {
      debugPrint('[Akamo] removeTrackFromAlbum error: $e');
      return false;
    }
  }

  Future<bool> syncAlbumTracks(String albumId, List<String> trackIds) async {
    try {
      // 1. Delete existing
      await _client.from('album_tracks').delete().eq('albumId', albumId);
      await _client
          .from('tracks')
          .update({'albumId': null}).eq('albumId', albumId);

      if (trackIds.isEmpty) return true;

      // 2. Insert new with order
      final rows = trackIds.asMap().entries.map((e) => {
            'albumId': albumId,
            'trackId': e.value,
            'trackNumber': e.key + 1,
          }).toList();
      await _client.from('album_tracks').insert(rows);

      // 3. Set the albumId FK on the tracks (parallel, mirrors Promise.all)
      await Future.wait(<Future<void>>[
        for (final trackId in trackIds) _setTrackAlbum(trackId, albumId),
      ]);
      return true;
    } catch (e) {
      debugPrint('[Akamo] syncAlbumTracks error: $e');
      return false;
    }
  }

  Future<void> _setTrackAlbum(String trackId, String? albumId) async {
    await _client.from('tracks').update({'albumId': albumId}).eq('id', trackId);
  }

  // ─── Playlists ────────────────────────────────────────────────────────

  Future<List<PlaylistMetaModel>> fetchPlaylists() async {
    try {
      final userId = currentUserId;
      final query =
          _client.from('playlists').select('*, playlist_tracks(*, tracks(*))');

      final response = userId != null
          ? await query
              .or('ownerId.eq.$userId,isPublic.eq.true')
              .order('updatedAt', ascending: false)
          : await query
              .eq('isPublic', true)
              .order('updatedAt', ascending: false);

      return (response as List)
          .map((p) => PlaylistMetaModel.fromJson(p))
          .toList();
    } catch (e) {
      debugPrint('[Akamo] fetchPlaylists error: $e');
      try {
        final simple = await _client
            .from('playlists')
            .select()
            .order('updatedAt', ascending: false);
        return (simple as List)
            .map((p) => PlaylistMetaModel.fromJson(p))
            .toList();
      } catch (_) {
        return [];
      }
    }
  }

  Future<List<PlaylistMetaModel>> fetchUserPlaylists(String userId) async {
    try {
      final response = await _client
          .from('playlists')
          .select('*, playlist_tracks(*, tracks(*))')
          .eq('ownerId', userId)
          .order('updatedAt', ascending: false);
      return (response as List)
          .map((p) => PlaylistMetaModel.fromJson(p))
          .toList();
    } catch (e) {
      debugPrint('[Akamo] fetchUserPlaylists error: $e');
      return [];
    }
  }

  Future<PlaylistMetaModel?> fetchPlaylist(String playlistId) async {
    try {
      final response = await _client
          .from('playlists')
          .select()
          .eq('id', playlistId)
          .single();
      return PlaylistMetaModel.fromJson(response);
    } catch (e) {
      debugPrint('[Akamo] fetchPlaylist error: $e');
      return null;
    }
  }

  Future<List<PlaylistTrackModel>> fetchPlaylistTracks(
      String playlistId) async {
    try {
      final response = await _client
          .from('playlist_tracks')
          .select('*, track:tracks(*)')
          .eq('playlistId', playlistId)
          .order('position', ascending: true);
      return (response as List)
          .map((pt) => PlaylistTrackModel.fromJson(pt))
          .toList();
    } catch (e) {
      debugPrint('[Akamo] fetchPlaylistTracks error: $e');
      return [];
    }
  }

  Future<PlaylistMetaModel?> createPlaylist(
    String title,
    String description,
    bool isPublic,
  ) async {
    final userId = currentUserId;
    if (userId == null) return null;

    try {
      final response = await _client.from('playlists').insert({
        'title': title,
        'description': description,
        'isPublic': isPublic,
        'ownerId': userId,
      }).select().single();
      return PlaylistMetaModel.fromJson(response);
    } catch (e) {
      debugPrint('[Akamo] createPlaylist error: $e');
      return null;
    }
  }

  Future<PlaylistMetaModel?> updatePlaylist(
      String playlistId, Map<String, dynamic> updates) async {
    try {
      final response = await _client
          .from('playlists')
          .update({...updates, 'updatedAt': DateTime.now().toIso8601String()})
          .eq('id', playlistId)
          .select()
          .single();
      return PlaylistMetaModel.fromJson(response);
    } catch (e) {
      debugPrint('[Akamo] updatePlaylist error: $e');
      return null;
    }
  }

  Future<bool> deletePlaylist(String playlistId) async {
    try {
      await _client.from('playlists').delete().eq('id', playlistId);
      return true;
    } catch (e) {
      debugPrint('[Akamo] deletePlaylist error: $e');
      return false;
    }
  }

  Future<bool> addTrackToPlaylist(String trackId, String playlistId) async {
    try {
      final userId = currentUserId;
      final currentTracks = await fetchPlaylistTracks(playlistId);
      final maxPos = currentTracks.isEmpty
          ? 0
          : currentTracks
              .map((pt) => pt.position)
              .reduce((a, b) => a > b ? a : b);

      await _client.from('playlist_tracks').insert({
        'playlistId': playlistId,
        'trackId': trackId,
        'position': maxPos + 1,
        'addedBy': ?userId,
      });

      await _client.from('playlists').update({
        'updatedAt': DateTime.now().toIso8601String(),
      }).eq('id', playlistId);
      return true;
    } catch (e) {
      if (e.toString().contains('23505')) return true; // duplicate OK
      debugPrint('[Akamo] addTrackToPlaylist error: $e');
      return false;
    }
  }

  Future<bool> removeTrackFromPlaylist(
      String playlistId, String trackId) async {
    try {
      await _client
          .from('playlist_tracks')
          .delete()
          .eq('playlistId', playlistId)
          .eq('trackId', trackId);

      await _client.from('playlists').update({
        'updatedAt': DateTime.now().toIso8601String(),
      }).eq('id', playlistId);
      return true;
    } catch (e) {
      debugPrint('[Akamo] removeTrackFromPlaylist error: $e');
      return false;
    }
  }

  Future<bool> reorderPlaylistTracks(
      String playlistId, List<String> orderedTrackIds) async {
    try {
      // Parallel position updates — one round-trip set instead of serial.
      await Future.wait(<Future<void>>[
        for (var i = 0; i < orderedTrackIds.length; i++)
          _setPlaylistTrackPosition(playlistId, orderedTrackIds[i], i),
      ]);
      return true;
    } catch (e) {
      debugPrint('[Akamo] reorderPlaylistTracks error: $e');
      return false;
    }
  }

  Future<void> _setPlaylistTrackPosition(
      String playlistId, String trackId, int position) async {
    await _client
        .from('playlist_tracks')
        .update({'position': position})
        .eq('playlistId', playlistId)
        .eq('trackId', trackId);
  }

  // ─── Notifications ────────────────────────────────────────────────────

  Future<List<NotificationModel>> fetchNotifications() async {
    try {
      final response = await _client
          .from('notifications')
          .select()
          .order('created_at', ascending: false)
          .limit(20);
      return (response as List)
          .map((n) => NotificationModel.fromJson(n))
          .toList();
    } catch (e) {
      debugPrint('[Akamo] fetchNotifications error: $e');
      return [];
    }
  }

  Future<bool> createNotification(String content, String authorId) async {
    try {
      await _client
          .from('notifications')
          .insert({'content': content, 'author_id': authorId});
      return true;
    } catch (e) {
      debugPrint('[Akamo] createNotification error: $e');
      return false;
    }
  }

  // ─── Social ───────────────────────────────────────────────────────────

  Future<List<UserStatModel>> fetchUserStats() async {
    try {
      final response = await _client
          .from('user_stats')
          .select()
          .order('upload_count', ascending: false);
      return (response as List)
          .map((s) => UserStatModel.fromJson(s))
          .toList();
    } catch (e) {
      debugPrint('[Akamo] fetchUserStats error: $e');
      return [];
    }
  }

  // ─── Song Requests ────────────────────────────────────────────────────

  Future<bool> createSongRequest(List<String> titles, {String? userName}) async {
    try {
      final insertData = titles
          .map((title) => {
                'title': title,
                'user_name': userName ?? 'Anonymous',
                'status': 'pending',
              })
          .toList();
      await _client.from('song_requests').insert(insertData);
      return true;
    } catch (e) {
      debugPrint('[Akamo] createSongRequest error: $e');
      return false;
    }
  }

  Future<List<SongRequestModel>> fetchSongRequests() async {
    try {
      final response = await _client
          .from('song_requests')
          .select()
          .order('created_at', ascending: false);
      return (response as List)
          .map((r) => SongRequestModel.fromJson(r))
          .toList();
    } catch (e) {
      debugPrint('[Akamo] fetchSongRequests error: $e');
      return [];
    }
  }

  Future<bool> updateSongRequestStatus(String id, String status) async {
    try {
      await _client
          .from('song_requests')
          .update({'status': status}).eq('id', id);
      return true;
    } catch (e) {
      debugPrint('[Akamo] updateSongRequestStatus error: $e');
      return false;
    }
  }
}
