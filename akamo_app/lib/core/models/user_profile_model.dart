class UserProfileModel {
  final String id;
  final String displayName;
  final String? username;
  final String? avatarUrl;
  final String role;
  final DateTime? createdAt;

  UserProfileModel({
    required this.id,
    required this.displayName,
    this.username,
    this.avatarUrl,
    required this.role,
    this.createdAt,
  });

  factory UserProfileModel.fromJson(Map<String, dynamic> json) {
    return UserProfileModel(
      id: json['id'] as String? ?? '',
      displayName: json['display_name'] as String? ?? 'User',
      username: json['username'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      role: json['role'] as String? ?? 'user',
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'display_name': displayName,
      if (username != null) 'username': username,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      'role': role,
      if (createdAt != null) 'created_at': createdAt?.toIso8601String(),
    };
  }
}
