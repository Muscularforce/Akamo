import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../theme/akamo_tokens.dart';

/// Circular avatar with network image support and an in-brand initials
/// fallback. Single source of truth for every avatar in the app so the
/// loading/error treatment never drifts between screens.
class AkamoAvatar extends StatelessWidget {
  const AkamoAvatar({
    required this.displayName,
    this.avatarUrl,
    this.radius = 22,
    this.ringColor,
    super.key,
  });

  final String displayName;
  final String? avatarUrl;
  final double radius;

  /// Optional rank/accent ring drawn just outside the avatar edge.
  final Color? ringColor;

  @override
  Widget build(BuildContext context) {
    final hasUrl = avatarUrl != null && avatarUrl!.isNotEmpty;
    final avatar = Container(
      width: radius * 2,
      height: radius * 2,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AkamoColors.graphite,
        border: Border.all(
          color: hasUrl ? AkamoColors.glassStroke : AkamoColors.hairline,
        ),
      ),
      child: hasUrl
          ? CachedNetworkImage(
              imageUrl: avatarUrl!,
              fit: BoxFit.cover,
              memCacheWidth: (radius * 2 * 2).round(),
              fadeInDuration: const Duration(milliseconds: 260),
              errorWidget: (_, _, _) => _Initials(name: displayName),
            )
          : _Initials(name: displayName),
    );

    if (ringColor == null) return avatar;
    return Container(
      padding: const EdgeInsets.all(2.5),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: ringColor!, width: 1.6),
      ),
      child: avatar,
    );
  }
}

class _Initials extends StatelessWidget {
  const _Initials({required this.name});

  final String name;

  @override
  Widget build(BuildContext context) {
    final initial = name.trim().isEmpty
        ? 'U'
        : name.trim().substring(0, 1).toUpperCase();
    return ColoredBox(
      color: AkamoColors.graphite,
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            color: AkamoColors.titaniumMuted,
            fontWeight: FontWeight.w800,
            fontSize: 15,
          ),
        ),
      ),
    );
  }
}
