class SongRequestModel {
  final String id;
  final String title;
  final String? userName;
  final String status; // 'pending' | 'approved' | 'rejected'
  final DateTime createdAt;

  SongRequestModel({
    required this.id,
    required this.title,
    this.userName,
    required this.status,
    required this.createdAt,
  });

  factory SongRequestModel.fromJson(Map<String, dynamic> json) {
    return SongRequestModel(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      userName: json['user_name'] as String?,
      status: json['status'] as String? ?? 'pending',
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
    );
  }
}
