class UserStatModel {
  final String userId;
  final String displayName;
  final String? avatarUrl;
  final String role;
  final int uploadCount;

  UserStatModel({
    required this.userId,
    required this.displayName,
    this.avatarUrl,
    required this.role,
    required this.uploadCount,
  });

  factory UserStatModel.fromJson(Map<String, dynamic> json) {
    return UserStatModel(
      userId: json['user_id'] as String? ?? '',
      displayName: json['display_name'] as String? ?? 'User',
      avatarUrl: json['avatar_url'] as String?,
      role: json['role'] as String? ?? 'user',
      uploadCount: (json['upload_count'] as num?)?.toInt() ?? 0,
    );
  }
}
