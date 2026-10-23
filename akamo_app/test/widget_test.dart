import 'package:flutter_test/flutter_test.dart';
import 'package:akamo_app/core/models/album_model.dart';
import 'package:akamo_app/core/models/album_track_model.dart';
import 'package:akamo_app/core/models/playlist_model.dart';
import 'package:akamo_app/core/models/song_request_model.dart';
import 'package:akamo_app/core/models/track_model.dart';
import 'package:akamo_app/core/models/user_profile_model.dart';
import 'package:akamo_app/core/models/user_stat_model.dart';

void main() {
  group('TrackModel', () {
    test('parses full Supabase row (camelCase columns)', () {
      final track = TrackModel.fromJson(<String, dynamic>{
        'id': 't1',
        'title': 'Neon Drift',
        'artist': 'Aurora',
        'album': 'Midnight Signal',
        'coverUrl': 'https://example.com/c.jpg',
        'audioUrl': 'https://example.com/a.mp3',
        'audioPath': 'audio/u1-123.mp3',
        'coverPath': 'covers/u1-123.jpg',
        'duration': 187,
        'type': 'audio',
        'uploadedAt': 1724000000000,
        'ownerId': 'u1',
        'ownerEmail': 'a@b.co',
      });

      expect(track.id, 't1');
      expect(track.title, 'Neon Drift');
      expect(track.audioPath, 'audio/u1-123.mp3');
      expect(track.duration, 187);
      expect(track.albumId, isNull);
    });

    test('survives null / missing fields without throwing', () {
      final track = TrackModel.fromJson(<String, dynamic>{});

      expect(track.id, '');
      expect(track.title, 'Unknown Title');
      expect(track.artist, 'Unknown Artist');
      expect(track.duration, 0);
    });
  });

  group('AlbumModel', () {
    test('parses row and round-trips through toJson', () {
      final album = AlbumModel.fromJson(<String, dynamic>{
        'id': 'al1',
        'title': 'Midnight Signal',
        'artist': 'Aurora',
        'year': 2026,
        'genre': 'Synthwave',
        'coverUrl': 'https://example.com/c.jpg',
        'createdAt': '2026-01-15T10:00:00.000Z',
      });

      expect(album.year, 2026);
      expect(album.genre, 'Synthwave');

      final json = album.toJson()..remove('id');
      expect(json['title'], 'Midnight Signal');
    });
  });

  group('AlbumTrackModel', () {
    test('flattens joined track under "track" alias', () {
      final at = AlbumTrackModel.fromJson(<String, dynamic>{
        'id': 'at1',
        'albumId': 'al1',
        'trackId': 't1',
        'trackNumber': 3,
        'track': <String, dynamic>{
          'id': 't1',
          'title': 'Neon Drift',
          'artist': 'Aurora',
        },
      });

      expect(at.trackNumber, 3);
      expect(at.track?.title, 'Neon Drift');
    });
  });

  group('PlaylistMetaModel', () {
    test('extracts trackCount and cover collage from join payload', () {
      final pl = PlaylistMetaModel.fromJson(<String, dynamic>{
        'id': 'p1',
        'title': 'Night Drive',
        'description': '',
        'isPublic': true,
        'ownerId': 'u1',
        'createdAt': '2026-01-15T10:00:00.000Z',
        'updatedAt': '2026-01-16T10:00:00.000Z',
        'playlist_tracks': <dynamic>[
          <String, dynamic>{
            'tracks': <String, dynamic>{
              'coverUrl': 'https://example.com/1.jpg'
            }
          },
          <String, dynamic>{'tracks': <String, dynamic>{}},
        ],
      });

      expect(pl.trackCount, 2);
      expect(pl.trackCovers, ['https://example.com/1.jpg']);
      expect(pl.isPublic, isTrue);
    });

    test('defaults to empty collage when not joined', () {
      final pl = PlaylistMetaModel.fromJson(<String, dynamic>{
        'id': 'p2',
        'title': 'Solo',
        'ownerId': 'u1',
      });

      expect(pl.trackCount, 0);
      expect(pl.trackCovers, isEmpty);
    });
  });

  group('SongRequestModel', () {
    test('parses snake_case request row', () {
      final req = SongRequestModel.fromJson(<String, dynamic>{
        'id': 'r1',
        'title': 'Believer',
        'user_name': 'Jovan',
        'status': 'pending',
        'created_at': '2026-08-01T12:30:00.000Z',
      });

      expect(req.userName, 'Jovan');
      expect(req.status, 'pending');
      expect(req.createdAt.year, 2026);
    });

    test('falls back to pending status on bad data', () {
      final req = SongRequestModel.fromJson(<String, dynamic>{});
      expect(req.status, 'pending');
    });
  });

  group('UserStatModel', () {
    test('parses user_stats view row for leaderboard', () {
      final stat = UserStatModel.fromJson(<String, dynamic>{
        'user_id': 'u9',
        'display_name': 'Founder',
        'avatar_url': 'https://example.com/f.webp',
        'role': 'owner',
        'upload_count': 42,
      });

      expect(stat.uploadCount, 42);
      expect(stat.role, 'owner');
    });
  });

  group('UserProfileModel', () {
    test('parses profile with username and role', () {
      final p = UserProfileModel.fromJson(<String, dynamic>{
        'id': 'u1',
        'display_name': 'Jovan',
        'username': 'jovanf',
        'role': 'user',
      });

      expect(p.username, 'jovanf');
      expect(p.role, 'user');
    });

    test('upsert payload keeps snake_case contract', () {
      final p = UserProfileModel(
        id: 'u1',
        displayName: 'Jovan',
        username: 'jovanf',
        avatarUrl: 'https://example.com/x.png?t=1',
        role: 'user',
      );

      final json = p.toJson();
      expect(json['display_name'], 'Jovan');
      expect(json['avatar_url'], contains('?t='));
      expect(json.containsKey('role'), isTrue);
    });
  });
}
