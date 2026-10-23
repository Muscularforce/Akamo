import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/models/notification_model.dart';
import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/supabase_service.dart';

/// Announcements broadcast by the owner — rendered as an in-brand glass
/// bottom sheet.
class NotificationsSheet extends StatefulWidget {
  const NotificationsSheet({super.key});

  @override
  State<NotificationsSheet> createState() => _NotificationsSheetState();
}

class _NotificationsSheetState extends State<NotificationsSheet> {
  final _service = SupabaseService();
  List<NotificationModel> _notifications = [];
  bool _isLoading = true;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _hasError = false);
    try {
      final items = await _service.fetchNotifications().timeout(
        const Duration(seconds: 15),
      );
      if (mounted) {
        setState(() {
          _notifications = items;
          _isLoading = false;
        });
      }
    } on TimeoutException {
      debugPrint('[Notifications] fetch timed out');
      if (mounted) setState(() => _hasError = true);
    } catch (e) {
      debugPrint('[Notifications] error: $e');
      if (mounted) setState(() => _hasError = true);
    }
  }

  String _relativeTime(DateTime createdAt) {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${createdAt.day}/${createdAt.month}/${createdAt.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AkamoColors.graphite,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AkamoRadii.hero),
        ),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: MediaQuery.of(context).size.height * 0.62,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 20, 12, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'ANNOUNCEMENTS',
                            style: Theme.of(context).textTheme.labelMedium
                                ?.copyWith(color: AkamoColors.acid),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'What\u2019s new',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(
                        Icons.close_rounded,
                        color: AkamoColors.smoke,
                      ),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Expanded(child: _buildBody()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(
          color: AkamoColors.acid,
          strokeWidth: 2,
        ),
      );
    }
    if (_hasError) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.wifi_off_rounded,
              color: AkamoColors.smoke,
              size: 40,
            ),
            const SizedBox(height: 12),
            Text(
              'Could not load announcements.',
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(color: AkamoColors.titaniumMuted),
            ),
            const SizedBox(height: 14),
            AkamoTactile(
              onTap: _load,
              scale: 0.95,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 22,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: AkamoColors.obsidian,
                  borderRadius: BorderRadius.circular(AkamoRadii.pill),
                  border: Border.all(color: AkamoColors.glassStroke),
                ),
                child: const Text(
                  'RETRY',
                  style: TextStyle(
                    color: AkamoColors.acid,
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                    letterSpacing: 1.1,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }
    if (_notifications.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AkamoColors.obsidian,
                border: Border.all(color: AkamoColors.glassStroke),
              ),
              child: const Icon(
                Icons.campaign_outlined,
                color: AkamoColors.smoke,
                size: 28,
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'No announcements yet.',
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(color: AkamoColors.titaniumMuted),
            ),
          ],
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      itemCount: _notifications.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final n = _notifications[index];
        return AkamoGlass(
          radius: AkamoRadii.compact,
          tint: AkamoColors.glassFillStrong,
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AkamoColors.acid.withValues(alpha: 0.13),
                  border: Border.all(
                    color: AkamoColors.acid.withValues(alpha: 0.3),
                  ),
                ),
                child: const Icon(
                  Icons.campaign_rounded,
                  color: AkamoColors.acid,
                  size: 17,
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      n.content,
                      style: Theme.of(context).textTheme.bodyLarge
                          ?.copyWith(color: AkamoColors.titanium, height: 1.35),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      _relativeTime(n.createdAt).toUpperCase(),
                      style: Theme.of(context).textTheme.labelMedium
                          ?.copyWith(fontSize: 9),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Convenience opener so every entry point shows the sheet identically.
Future<void> showNotificationsSheet(BuildContext context) {
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (_) => const NotificationsSheet(),
  );
}
