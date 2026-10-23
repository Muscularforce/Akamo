import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/models/user_profile_model.dart';
import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../core/widgets/avatar_image.dart';
import '../social/notifications_sheet.dart';
import '../social/social_view.dart';
import '../social/song_request_sheet.dart';
import 'account_settings_view.dart';
import 'admin_requests_view.dart';
import 'uploads_dashboard_view.dart';

/// Fourth dock tab. Public sign-in prompt when logged out; identity hub with
/// every account surface when logged in.
class AccountView extends StatefulWidget {
  const AccountView({
    required this.user,
    required this.userProfile,
    required this.onLoginRequested,
    required this.onProfileUpdated,
    super.key,
  });

  final User? user;
  final UserProfileModel? userProfile;
  final VoidCallback onLoginRequested;

  /// Shell hook so profile edits propagate app-wide (header avatar, etc).
  final ValueChanged<UserProfileModel> onProfileUpdated;

  @override
  State<AccountView> createState() => _AccountViewState();
}

class _AccountViewState extends State<AccountView> {
  bool _isSigningOut = false;

  Future<void> _confirmSignOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AkamoColors.graphite,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AkamoRadii.compact),
        ),
        title: const Text('Sign Out?'),
        content: const Text(
          'Your uploads and playlists stay online — you\u2019ll just need to log back in to manage them.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text(
              'Cancel',
              style: TextStyle(color: AkamoColors.titaniumMuted),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Sign Out',
              style: TextStyle(color: AkamoColors.danger),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _isSigningOut = true);
    try {
      await Supabase.instance.client.auth.signOut().timeout(
        const Duration(seconds: 12),
      );
    } catch (e) {
      debugPrint('[Account] signOut error: $e');
    }
    if (mounted) setState(() => _isSigningOut = false);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.user == null) {
      return _SignedOutPrompt(onLoginRequested: widget.onLoginRequested);
    }
    final profile = widget.userProfile;

    return SafeArea(
      bottom: false,
      child: ListView(
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        padding: EdgeInsets.zero,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'YOUR SPACE',
                  style: Theme.of(context).textTheme.labelMedium
                      ?.copyWith(color: AkamoColors.acid),
                ),
                const SizedBox(height: 8),
                Text(
                  'Account',
                  style: Theme.of(context).textTheme.displayMedium,
                ),
              ],
            ),
          ),

          // Identity card
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 22, 20, 0),
            child: AkamoGlass(
              radius: AkamoRadii.hero,
              tint: AkamoColors.glassFillStrong,
              padding: const EdgeInsets.all(22),
              child: Row(
                children: [
                  AkamoTactile(
                    onTap: () => _openSettings(profile),
                    scale: 0.94,
                    borderRadius: AkamoRadii.pill,
                    child: AkamoAvatar(
                      displayName: profile?.displayName ?? 'User',
                      avatarUrl: profile?.avatarUrl,
                      radius: 34,
                      ringColor: AkamoColors.acid.withValues(alpha: 0.4),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                profile?.displayName ?? 'User',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.headlineSmall
                                    ?.copyWith(fontSize: 19),
                              ),
                            ),
                            if (profile?.role == 'owner') ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 7,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: AkamoColors.acid.withValues(
                                    alpha: 0.15,
                                  ),
                                  borderRadius: BorderRadius.circular(
                                    AkamoRadii.pill,
                                  ),
                                  border: Border.all(
                                    color: AkamoColors.acid.withValues(
                                      alpha: 0.4,
                                    ),
                                  ),
                                ),
                                child: const Text(
                                  'AURORA',
                                  style: TextStyle(
                                    color: AkamoColors.acid,
                                    fontSize: 8,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        if (profile?.username != null &&
                            profile!.username!.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(
                            '@${profile.username}',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: AkamoColors.acid),
                          ),
                        ],
                        if (widget.user?.email != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            widget.user!.email!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: AkamoColors.smoke),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 26),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              'MANAGE',
              style: Theme.of(context).textTheme.labelMedium
                  ?.copyWith(fontSize: 9),
            ),
          ),
          const SizedBox(height: 10),
          _ActionRow(
            icon: Icons.tune_rounded,
            title: 'Edit Profile',
            subtitle: 'Name, username, and avatar',
            onTap: () => _openSettings(profile),
          ),
          _ActionRow(
            icon: Icons.library_music_outlined,
            title: 'My Uploads',
            subtitle: 'Edit metadata or remove tracks you uploaded',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute<void>(
                builder: (_) => const UploadsDashboardView(),
              ),
            ),
          ),
          _ActionRow(
            icon: Icons.queue_music_rounded,
            title: 'Request a Song',
            subtitle: 'Pitch tracks for the next rotation',
            onTap: () => showSongRequestSheet(context),
          ),
          _ActionRow(
            icon: Icons.campaign_outlined,
            title: 'Announcements',
            subtitle: 'What\u2019s new around the station',
            onTap: () => showNotificationsSheet(context),
          ),
          _ActionRow(
            icon: Icons.emoji_events_outlined,
            title: 'Community Leaderboard',
            subtitle: 'Top contributors this station has ever heard',
            accent: AkamoColors.cyan,
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute<void>(builder: (_) => const SocialView()),
            ),
          ),
          if (profile?.role == 'owner')
            _ActionRow(
              icon: Icons.admin_panel_settings_outlined,
              title: 'Song Requests Dashboard',
              subtitle: 'Approve or reject listener requests',
              accent: AkamoColors.ultraviolet,
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => const AdminRequestsView(),
                ),
              ),
            ),

          const SizedBox(height: 26),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: AkamoTactile(
              onTap: _isSigningOut ? null : _confirmSignOut,
              scale: 0.97,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: AkamoColors.danger.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AkamoRadii.compact),
                  border: Border.all(
                    color: AkamoColors.danger.withValues(alpha: 0.3),
                  ),
                ),
                child: Center(
                  child: _isSigningOut
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            color: AkamoColors.danger,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'SIGN OUT',
                          style: TextStyle(
                            color: AkamoColors.danger,
                            fontWeight: FontWeight.w800,
                            fontSize: 13,
                            letterSpacing: 1.1,
                          ),
                        ),
                ),
              ),
            ),
          ),
          const SizedBox(height: AkamoSpacing.dockClearance),
        ],
      ),
    );
  }

  void _openSettings(UserProfileModel? profile) {
    if (profile == null) return;
    Navigator.push(
      context,
      MaterialPageRoute<void>(
        builder: (_) => AccountSettingsView(
          profile: profile,
          onProfileUpdated: widget.onProfileUpdated,
        ),
      ),
    );
  }
}

// ─── Signed-out state ────────────────────────────────────────────────────────

class _SignedOutPrompt extends StatelessWidget {
  const _SignedOutPrompt({required this.onLoginRequested});

  final VoidCallback onLoginRequested;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 40),
          child: AkamoGlass(
            padding: const EdgeInsets.all(28),
            tint: AkamoColors.glassFillStrong,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AkamoColors.acid.withValues(alpha: 0.15),
                    border: Border.all(
                      color: AkamoColors.acid.withValues(alpha: 0.32),
                    ),
                  ),
                  child: const Icon(
                    Icons.person_rounded,
                    color: AkamoColors.acid,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Sign In',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  'Log in to upload music, request songs, and climb the leaderboard.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 20),
                AkamoTactile(
                  onTap: onLoginRequested,
                  scale: 0.95,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 32,
                      vertical: 14,
                    ),
                    decoration: BoxDecoration(
                      color: AkamoColors.acid,
                      borderRadius: BorderRadius.circular(AkamoRadii.pill),
                    ),
                    child: const Text(
                      'SIGN IN',
                      style: TextStyle(
                        color: AkamoColors.obsidian,
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.accent = AkamoColors.acid,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
      child: AkamoTactile(
        onTap: onTap,
        scale: 0.98,
        child: AkamoGlass(
          radius: AkamoRadii.compact,
          tint: AkamoColors.glassFillStrong,
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: accent.withValues(alpha: 0.13),
                  border: Border.all(color: accent.withValues(alpha: 0.28)),
                ),
                child: Icon(icon, color: accent, size: 19),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodySmall
                          ?.copyWith(color: AkamoColors.smoke),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                color: AkamoColors.smoke,
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
