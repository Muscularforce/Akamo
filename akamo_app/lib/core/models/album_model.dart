class AlbumModel {
  final String id;
  final String title;
  final String artist;
  final int year;
  final String? genre;
  final String? coverUrl;
  final String? coverPath;
  final String? ownerId;
  final DateTime? createdAt;

  AlbumModel({
    required this.id,
    required this.title,
    required this.artist,
    required this.year,
    this.genre,
    this.coverUrl,
    this.coverPath,
    this.ownerId,
    this.createdAt,
  });

  factory AlbumModel.fromJson(Map<String, dynamic> json) {
    return AlbumModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? 'Unknown Title',
      artist: json['artist'] as String? ?? 'Unknown Artist',
      year: (json['year'] as num?)?.toInt() ?? DateTime.now().year,
      genre: json['genre'] as String?,
      coverUrl: json['coverUrl'] as String?,
      coverPath: json['coverPath'] as String?,
      ownerId: json['ownerId'] as String?,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'artist': artist,
      'year': year,
      if (genre != null) 'genre': genre,
      if (coverUrl != null) 'coverUrl': coverUrl,
      if (coverPath != null) 'coverPath': coverPath,
      if (ownerId != null) 'ownerId': ownerId,
      if (createdAt != null) 'createdAt': createdAt?.toIso8601String(),
    };
  }
}
