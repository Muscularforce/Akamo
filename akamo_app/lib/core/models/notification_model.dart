class NotificationModel {
  final String id;
  final DateTime createdAt;
  final String content;
  final String authorId;

  NotificationModel({
    required this.id,
    required this.createdAt,
    required this.content,
    required this.authorId,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'] as String? ?? '',
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ?? DateTime.now(),
      content: json['content'] as String? ?? '',
      authorId: json['author_id'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'created_at': createdAt.toIso8601String(),
      'content': content,
      'author_id': authorId,
    };
  }
}
