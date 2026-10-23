import 'dart:async';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/models/user_profile_model.dart';
import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../core/widgets/avatar_image.dart';
import '../../services/supabase_service.dart';
import '../social/song_request_sheet.dart';
import 'admin_requests_view.dart';
import 'uploads_dashboard_view.dart';

enum _UsernameStatus { untouched, invalid, checking, available, taken }

class AccountSettingsView extends StatefulWidget {
  const AccountSettingsView({
    required this.profile,
    required this.onProfileUpdated,
    super.key,
  });

  final UserProfileModel profile;

  /// Notifies the shell so the rest of the app reflects edits immediately.
  final ValueChanged<UserProfileModel> onProfileUpdated;

  @override
  State<AccountSettingsView> createState() => _AccountSettingsViewState();
}

class _AccountSettingsViewState extends State<AccountSettingsView> {
  static final RegExp _usernamePattern = RegExp(r'^[a-z0-9_]{3,20}$');
  static const Duration _debounceDuration = Duration(milliseconds: 450);

  final _service = SupabaseService();

  late final TextEditingController _displayNameController =
      TextEditingController(text: widget.profile.displayName);
  late final TextEditingController _usernameController = TextEditingController(
    text: widget.profile.username ?? '',
  );

  // Avatar bytes are held locally and pushed to storage only on save, so a
  // cancelled edit never orphans an upload.
  Uint8List? _pendingAvatarBytes;
  String _pendingAvatarExt = 'jpg';
  bool _isUploadingAvatar = false;

  _UsernameStatus _usernameStatus = _UsernameStatus.untouched;
  Timer? _usernameDebounce;
  bool _isSaving = false;
  bool _isSigningOut = false;

  String get _originalUsername => widget.profile.username ?? '';
  bool get _usernameChanged =>
      _usernameController.text.trim() != _originalUsername;
  bool get _displayNameChanged =>
      _displayNameController.text.trim() != widget.profile.displayName;
  bool get _hasChanges =>
      _displayNameChanged || _usernameChanged || _pendingAvatarBytes != null;

  @override
  void initState() {
    super.initState();
    _usernameController.addListener(_onUsernameChanged);
  }

  @override
  void dispose() {
    _usernameDebounce?.cancel();
    _displayNameController.dispose();
    _usernameController.dispose();
    super.dispose();
  }

  // ─── Username availability ────────────────────────────────────────────

  void _onUsernameChanged() {
    // Force lowercase handle-style input as the user types.
    final sanitized = _usernameController.text.toLowerCase().replaceAll(
      RegExp(r'[^a-z0-9_]'),
      '',
    );
    if (sanitized != _usernameController.text) {
      _usernameController.value = TextEditingValue(
        text: sanitized,
        selection: TextSelection.collapsed(offset: sanitized.length),
      );
      return; // listener re-fires after the programmatic change
    }

    _usernameDebounce?.cancel();
    final value = sanitized.trim();

    if (value == _originalUsername) {
      setState(() => _usernameStatus = _UsernameStatus.untouched);
      return;
    }
    if (!_usernamePattern.hasMatch(value)) {
      setState(() => _usernameStatus = _UsernameStatus.invalid);
      return;
    }

    _usernameDebounce = Timer(_debounceDuration, () => _checkUsername(value));
  }

  Future<void> _checkUsername(String value) async {
    setState(() => _usernameStatus = _UsernameStatus.checking);
    try {
      final available = await _service
          .checkUsernameAvailability(value)
          .timeout(const Duration(seconds: 12));
      if (!mounted) return;
      // The field may have moved on while we waited.
      if (_usernameController.text.trim() != value) return;
      setState(
        () => _usernameStatus = available
            ? _UsernameStatus.available
            : _UsernameStatus.taken,
      );
    } on TimeoutException {
      debugPrint('[Account] username check timed out');
      if (mounted && _usernameController.text.trim() == value) {
        setState(() => _usernameStatus = _UsernameStatus.invalid);
      }
    } catch (e) {
      debugPrint('[Account] username check error: $e');
      if (mounted && _usernameController.text.trim() == value) {
        setState(() => _usernameStatus = _UsernameStatus.invalid);
      }
    }
  }

  bool get _canSaveUsername => switch (_usernameStatus) {
    _UsernameStatus.available => true,
    _UsernameStatus.untouched => true,
    _ => false,
  };

  // ─── Avatar ───────────────────────────────────────────────────────────

  static String _extOf(String fileName, String fallback) {
    final dot = fileName.lastIndexOf('.');
    if (dot < 0 || dot == fileName.length - 1) return fallback;
    return fileName.substring(dot + 1).toLowerCase();
  }

  Future<void> _pickAvatar() async {
    try {
      final file = await FilePicker.pickFile(type: FileType.image);
      if (!mounted || file == null) return;
      final ext = _extOf(file.name, 'jpg');
      if (!{'jpg', 'jpeg', 'png', 'webp'}.contains(ext)) {
        _showSnack(
          'Avatar must be JPG, PNG, or WEBP.',
          accent: AkamoColors.danger,
        );
        return;
      }
      final bytes = await file.readAsBytes().timeout(
        const Duration(seconds: 30),
      );
      if (!mounted) return;
      setState(() {
        _pendingAvatarBytes = bytes;
        _pendingAvatarExt = ext == 'jpeg' ? 'jpg' : ext;
      });
    } on TimeoutException {
      debugPrint('[Account] avatar read timed out');
    } catch (e) {
      debugPrint('[Account] avatar pick error: $e');
      if (mounted) {
        _showSnack('Could not read that image.', accent: AkamoColors.danger);
      }
    }
  }

  void _clearPendingAvatar() {
    setState(() => _pendingAvatarBytes = null);
  }

  // ─── Save / sign out ─────────────────────────────────────────────────

  Future<void> _save() async {
    final userId = _service.currentUserId;
    if (userId == null) return;
    if (!_displayNameChanged &&
        !_usernameChanged &&
        _pendingAvatarBytes == null) {
      return;
    }
    if (!_canSaveUsername) {
      _showSnack(switch (_usernameStatus) {
        _UsernameStatus.taken =>
          '@${_usernameController.text.trim()} is already taken.',
        _ => 'Usernames use 3–20 letters, numbers, or underscores.',
      }, accent: AkamoColors.danger);
      return;
    }

    setState(() => _isSaving = true);

    try {
      // 1/2 Push avatar bytes (only when a new image was picked).
      String? avatarUrl;
      final pendingBytes = _pendingAvatarBytes;
      if (pendingBytes != null) {
        setState(() => _isUploadingAvatar = true);
        avatarUrl = await _service
            .uploadAvatar(userId, pendingBytes, _pendingAvatarExt)
            .timeout(const Duration(seconds: 90));
        if (!mounted) return;
        if (avatarUrl == null) {
          setState(() {
            _isUploadingAvatar = false;
            _isSaving = false;
          });
          _showSnack(
            'Avatar upload failed — nothing was saved.',
            accent: AkamoColors.danger,
          );
          return;
        }
        setState(() => _isUploadingAvatar = false);
      }

      // 2/2 Persist the profile row.
      final updates = <String, dynamic>{
        if (_displayNameChanged)
          'displayName': _displayNameController.text.trim(),
        if (_usernameChanged) 'username': _usernameController.text.trim(),
        'avatarUrl': ?avatarUrl,
      };
      final updated = await _service
          .upsertProfile(userId, updates)
          .timeout(const Duration(seconds: 15));

      if (!mounted) return;
      if (updated == null) {
        setState(() => _isSaving = false);
        _showSnack('Could not save your profile.', accent: AkamoColors.danger);
        return;
      }

      setState(() {
        _pendingAvatarBytes = null;
        _isSaving = false;
      });
      widget.onProfileUpdated(updated);
      _showSnack('Profile saved.');
    } on TimeoutException {
      debugPrint('[Account] save timed out');
      if (mounted) {
        setState(() {
          _isUploadingAvatar = false;
          _isSaving = false;
        });
        _showSnack('Connection timed out.', accent: AkamoColors.danger);
      }
    } catch (e) {
      debugPrint('[Account] save error: $e');
      if (mounted) {
        setState(() {
          _isUploadingAvatar = false;
          _isSaving = false;
        });
        _showSnack('Something went wrong.', accent: AkamoColors.danger);
      }
    }
  }

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
    if (mounted && Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  void _showSnack(String message, {Color accent = AkamoColors.acid}) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: AkamoColors.graphite,
          elevation: 0,
          shape: RoundedRectangleBorder(
            side: BorderSide(color: accent.withValues(alpha: 0.25)),
            borderRadius: BorderRadius.circular(AkamoRadii.compact),
          ),
          content: Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium
                ?.copyWith(color: AkamoColors.titanium),
          ),
        ),
      );
  }

  // ─── UI ───────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_isSaving && !_isSigningOut,
      child: Scaffold(
        backgroundColor: AkamoColors.obsidian,
        body: ListView(
          physics: const BouncingScrollPhysics(
            parent: AlwaysScrollableScrollPhysics(),
          ),
          padding: EdgeInsets.zero,
          children: [
            SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 12, 20, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(
                        Icons.arrow_back_rounded,
                        color: AkamoColors.titanium,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'ACCOUNT',
                            style: Theme.of(context).textTheme.labelMedium
                                ?.copyWith(color: AkamoColors.acid),
                          ),
                          Text(
                            'Settings',
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 22),

            // Avatar
            Center(
              child: Stack(
                children: [
                  _PendingAvatarPreview(
                    profile: widget.profile,
                    pendingBytes: _pendingAvatarBytes,
                    isBusy: _isUploadingAvatar,
                    onTap: _isSaving ? null : _pickAvatar,
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AkamoColors.acid,
                        border: Border.all(
                          color: AkamoColors.obsidian,
                          width: 3,
                        ),
                      ),
                      child: const Icon(
                        Icons.photo_camera_rounded,
                        color: AkamoColors.obsidian,
                        size: 14,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (_pendingAvatarBytes != null)
              Center(
                child: Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: AkamoTactile(
                    onTap: _isSaving ? null : _clearPendingAvatar,
                    scale: 0.94,
                    child: Text(
                      'UNDO PHOTO',
                      style: Theme.of(context).textTheme.labelMedium
                          ?.copyWith(color: AkamoColors.smoke),
                    ),
                  ),
                ),
              ),

            const SizedBox(height: 26),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SettingsField(
                    controller: _displayNameController,
                    label: 'Display Name',
                    enabled: !_isSaving,
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 14),
                  _SettingsField(
                    controller: _usernameController,
                    label: 'Username',
                    prefixText: '@',
                    enabled: !_isSaving,
                    onChanged: (_) => setState(() {}),
                  ),
                  const SizedBox(height: 8),
                  _UsernameStatusRow(status: _usernameStatus),
                  if (_email != null) ...[
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Icon(
                          Icons.alternate_email_rounded,
                          color: AkamoColors.smoke,
                          size: 15,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _email!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: AkamoColors.smoke),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 24),
                  _SaveButton(
                    enabled: _hasChanges && _canSaveUsername && !_isSaving,
                    isSaving: _isSaving,
                    label: _isUploadingAvatar ? 'UPLOADING…' : 'SAVE PROFILE',
                    onTap: _save,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 34),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'STATION',
                style: Theme.of(context).textTheme.labelMedium
                    ?.copyWith(fontSize: 9),
              ),
            ),
            const SizedBox(height: 10),
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
            if (widget.profile.role == 'owner')
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

            const SizedBox(height: 34),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: AkamoTactile(
                onTap: _isSigningOut ? null : _confirmSignOut,
                scale: 0.97,
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 15),
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
      ),
    );
  }

  String? get _email => _service.currentUser?.email;
}

// ─── Subwidgets ──────────────────────────────────────────────────────────────

class _PendingAvatarPreview extends StatelessWidget {
  const _PendingAvatarPreview({
    required this.profile,
    required this.pendingBytes,
    required this.isBusy,
    required this.onTap,
  });

  final UserProfileModel profile;
  final Uint8List? pendingBytes;
  final bool isBusy;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return AkamoTactile(
      onTap: onTap,
      scale: 0.95,
      borderRadius: AkamoRadii.pill,
      child: Container(
        width: 104,
        height: 104,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: AkamoColors.acid.withValues(alpha: 0.35),
            width: 2,
          ),
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (pendingBytes != null)
              Image.memory(pendingBytes!, fit: BoxFit.cover)
            else
              AkamoAvatar(
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                radius: 52,
              ),
            if (isBusy)
              const ColoredBox(
                color: Color(0xB308090C),
                child: Center(
                  child: SizedBox(
                    width: 26,
                    height: 26,
                    child: CircularProgressIndicator(
                      color: AkamoColors.acid,
                      strokeWidth: 2,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _UsernameStatusRow extends StatelessWidget {
  const _UsernameStatusRow({required this.status});

  final _UsernameStatus status;

  @override
  Widget build(BuildContext context) {
    final (icon, text, color) = switch (status) {
      _UsernameStatus.untouched => (
        Icons.info_outline_rounded,
        '3–20 letters, numbers, or underscores',
        AkamoColors.smoke,
      ),
      _UsernameStatus.checking => (
        Icons.sync_rounded,
        'Checking availability…',
        AkamoColors.titaniumMuted,
      ),
      _UsernameStatus.available => (
        Icons.check_circle_outline_rounded,
        'Available',
        AkamoColors.acid,
      ),
      _UsernameStatus.taken => (
        Icons.error_outline_rounded,
        'Already taken',
        AkamoColors.danger,
      ),
      _UsernameStatus.invalid => (
        Icons.error_outline_rounded,
        'Use 3–20 letters, numbers, or underscores',
        AkamoColors.danger,
      ),
    };

    return AnimatedSwitcher(
      duration: AkamoMotion.quick,
      child: Row(
        key: ValueKey(status),
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 6),
          Text(
            text,
            style: Theme.of(context).textTheme.bodySmall
                ?.copyWith(color: color, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _SaveButton extends StatelessWidget {
  const _SaveButton({
    required this.enabled,
    required this.isSaving,
    required this.label,
    required this.onTap,
  });

  final bool enabled;
  final bool isSaving;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AkamoTactile(
      onTap: enabled ? onTap : null,
      scale: 0.96,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 15),
        decoration: BoxDecoration(
          color: enabled ? AkamoColors.acid : AkamoColors.glassFillStrong,
          borderRadius: BorderRadius.circular(AkamoRadii.pill),
        ),
        child: Center(
          child: isSaving
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    color: AkamoColors.acid,
                    strokeWidth: 2,
                  ),
                )
              : Text(
                  label,
                  style: TextStyle(
                    color: enabled ? AkamoColors.obsidian : AkamoColors.smoke,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    letterSpacing: 1.1,
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

class _SettingsField extends StatelessWidget {
  const _SettingsField({
    required this.controller,
    required this.label,
    required this.enabled,
    required this.onChanged,
    this.prefixText,
  });

  final TextEditingController controller;
  final String label;
  final bool enabled;
  final ValueChanged<String> onChanged;
  final String? prefixText;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      enabled: enabled,
      onChanged: onChanged,
      style: const TextStyle(color: AkamoColors.titanium),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(
          color: AkamoColors.titaniumMuted,
          fontSize: 13,
        ),
        prefixText: prefixText,
        prefixStyle: const TextStyle(color: AkamoColors.smoke),
        filled: true,
        fillColor: AkamoColors.glassFillStrong,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AkamoRadii.micro),
          borderSide: BorderSide(color: AkamoColors.glassStroke),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AkamoRadii.micro),
          borderSide: BorderSide(color: AkamoColors.glassStroke),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AkamoRadii.micro),
          borderSide: BorderSide(
            color: AkamoColors.acid.withValues(alpha: 0.6),
          ),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AkamoRadii.micro),
          borderSide: BorderSide(color: AkamoColors.hairline),
        ),
      ),
    );
  }
}
