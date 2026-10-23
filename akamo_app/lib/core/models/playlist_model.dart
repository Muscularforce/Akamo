import 'track_model.dart';

class PlaylistMetaModel {
  final String id;
  final String title;
  final String description;
  final String? coverUrl;
  final String? coverPath;
  final String ownerId;
  final bool isPublic;
  final DateTime createdAt;
  final DateTime updatedAt;
  
  // Extra fields for UI displaying joined data
  final int trackCount;
  final List<String> trackCovers;

  PlaylistMetaModel({
    required this.id,
    required this.title,
    required this.description,
    this.coverUrl,
    this.coverPath,
    required this.ownerId,
    required this.isPublic,
    required this.createdAt,
    required this.updatedAt,
    this.trackCount = 0,
    this.trackCovers = const [],
  });

  factory PlaylistMetaModel.fromJson(Map<String, dynamic> json) {
    int count = 0;
    List<String> covers = [];
    if (json['playlist_tracks'] != null && json['playlist_tracks'] is List) {
      final List tracks = json['playlist_tracks'];
      count = tracks.length;
      for (var pt in tracks) {
        final trackData = pt['tracks'] ?? pt['track'];
        if (trackData != null && trackData['coverUrl'] != null) {
          covers.add(trackData['coverUrl'].toString());
        }
      }
      covers = covers.take(4).toList();
    }

    return PlaylistMetaModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Untitled Playlist',
      description: json['description'] as String? ?? '',
      coverUrl: json['coverUrl'] as String?,
      coverPath: json['coverPath'] as String?,
      ownerId: json['ownerId'] as String? ?? '',
      isPublic: json['isPublic'] as bool? ?? false,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] as String? ?? '') ?? DateTime.now(),
      trackCount: count,
      trackCovers: covers,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      if (coverUrl != null) 'coverUrl': coverUrl,
      if (coverPath != null) 'coverPath': coverPath,
      'ownerId': ownerId,
      'isPublic': isPublic,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}

class PlaylistTrackModel {
  final String id;
  final String playlistId;
  final String trackId;
  final int position;
  final DateTime addedAt;
  final String? addedBy;
  final TrackModel? track;

  PlaylistTrackModel({
    required this.id,
    required this.playlistId,
    required this.trackId,
    required this.position,
    required this.addedAt,
    this.addedBy,
    this.track,
  });

  factory PlaylistTrackModel.fromJson(Map<String, dynamic> json) {
    final trackData = json['tracks'] ?? json['track'];
    return PlaylistTrackModel(
      id: json['id'] as String? ?? '',
      playlistId: json['playlistId'] as String? ?? '',
      trackId: json['trackId'] as String? ?? '',
      position: (json['position'] as num?)?.toInt() ?? 0,
      addedAt: DateTime.tryParse(json['addedAt'] as String? ?? '') ?? DateTime.now(),
      addedBy: json['addedBy'] as String?,
      track: trackData != null ? TrackModel.fromJson(trackData as Map<String, dynamic>) : null,
    );
  }
}
