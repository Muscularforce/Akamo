import 'track_model.dart';

class AlbumTrackModel {
  final String id;
  final String albumId;
  final String trackId;
  final int trackNumber;
  final TrackModel? track;

  AlbumTrackModel({
    required this.id,
    required this.albumId,
    required this.trackId,
    required this.trackNumber,
    this.track,
  });

  factory AlbumTrackModel.fromJson(Map<String, dynamic> json) {
    final trackData = json['track'] ?? json['tracks'];
    return AlbumTrackModel(
      id: json['id'] as String? ?? '',
      albumId: json['albumId'] as String? ?? '',
      trackId: json['trackId'] as String? ?? '',
      trackNumber: (json['trackNumber'] as num?)?.toInt() ?? 0,
      track: trackData != null
          ? TrackModel.fromJson(trackData as Map<String, dynamic>)
          : null,
    );
  }
}
