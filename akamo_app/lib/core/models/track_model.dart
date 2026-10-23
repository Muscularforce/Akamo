class TrackModel {
  final String id;
  final String title;
  final String artist;
  final String album;
  final String coverUrl;
  final String audioUrl;
  final String? audioPath;
  final String? coverPath;
  final int duration;
  final String type;
  final int uploadedAt;
  final String? ownerId;
  final String? ownerEmail;
  final String? localId;
  final String? albumId;

  TrackModel({
    required this.id,
    required this.title,
    required this.artist,
    required this.album,
    required this.coverUrl,
    required this.audioUrl,
    this.audioPath,
    this.coverPath,
    required this.duration,
    required this.type,
    required this.uploadedAt,
    this.ownerId,
    this.ownerEmail,
    this.localId,
    this.albumId,
  });

  factory TrackModel.fromJson(Map<String, dynamic> json) {
    return TrackModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Unknown Title',
      artist: json['artist'] as String? ?? 'Unknown Artist',
      album: json['album'] as String? ?? 'Unknown Album',
      coverUrl: json['coverUrl'] as String? ?? '',
      audioUrl: json['audioUrl'] as String? ?? '',
      audioPath: json['audioPath'] as String?,
      coverPath: json['coverPath'] as String?,
      duration: (json['duration'] as num?)?.toInt() ?? 0,
      type: json['type'] as String? ?? 'audio',
      uploadedAt: (json['uploadedAt'] as num?)?.toInt() ?? 0,
      ownerId: json['ownerId'] as String?,
      ownerEmail: json['ownerEmail'] as String?,
      localId: json['localId'] as String?,
      albumId: json['albumId'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'artist': artist,
      'album': album,
      'coverUrl': coverUrl,
      'audioUrl': audioUrl,
      if (audioPath != null) 'audioPath': audioPath,
      if (coverPath != null) 'coverPath': coverPath,
      'duration': duration,
      'type': type,
      'uploadedAt': uploadedAt,
      if (ownerId != null) 'ownerId': ownerId,
      if (ownerEmail != null) 'ownerEmail': ownerEmail,
      if (localId != null) 'localId': localId,
      if (albumId != null) 'albumId': albumId,
    };
  }
}
