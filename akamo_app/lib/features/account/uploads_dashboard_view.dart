import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../core/models/track_model.dart';
import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/supabase_service.dart';

/// Every track the signed-in user has uploaded, with inline metadata editing
/// and full delete (DB row + storage cleanup via [SupabaseService.deleteTrack]).
class UploadsDashboardView extends StatefulWidget {
  const UploadsDashboardView({super.key});

  @override
  State<UploadsDashboardView> createState() => _UploadsDashboardViewState();
}

class _UploadsDashboardViewState extends State<UploadsDashboardView> {
  final _service = SupabaseService();
  List<TrackModel> _tracks = [];
  bool _isLoading = true;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    _loadTracks();
  }

  Future<void> _loadTracks() async {
    final userId = _service.currentUserId;
    if (userId == null) {
      setState(() {
        _isLoading = false;
        _loadError = 'You need to be signed in.';
      });
      return;
    }
    setState(() => _loadError = null);
    try {
      final tracks = await _service
          .fetchUserTracks(userId)
          .timeout(const Duration(seconds: 15));
      if (mounted) {
        setState(() {
          _tracks = tracks;
          _isLoading = false;
        });
      }
    } on TimeoutException {
      debugPrint('[UploadsDashboard] fetch timed out');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadError = 'Connection timed out.';
        });
      }
    } catch (e) {
      debugPrint('[UploadsDashboard] error: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _loadError = 'Could not load your uploads.';
        });
      }
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

  Future<void> _editTrack(TrackModel track) async {
    final edits =
        await showModalBottomSheet<
          ({String title, String artist, String album})
        >(
          context: context,
          backgroundColor: Colors.transparent,
          isScrollControlled: true,
          builder: (_) => _TrackEditSheet(track: track),
        );
    if (edits == null) return;

    try {
      final ok = await _service
          .updateTrack(track.id, {
            'title': edits.title,
            'artist': edits.artist,
            'album': edits.album,
          })
          .timeout(const Duration(seconds: 15));

      if (!mounted) return;
      if (ok) {
        final index = _tracks.indexWhere((t) => t.id == track.id);
        if (index != -1) {
          setState(() {
            _tracks[index] = TrackModel(
              id: track.id,
              title: edits.title,
              artist: edits.artist,
              album: edits.album,
              coverUrl: track.coverUrl,
              audioUrl: track.audioUrl,
              audioPath: track.audioPath,
              coverPath: track.coverPath,
              duration: track.duration,
              type: track.type,
              uploadedAt: track.uploadedAt,
              ownerId: track.ownerId,
              ownerEmail: track.ownerEmail,
              localId: track.localId,
              albumId: track.albumId,
            );
          });
        }
        _showSnack('Metadata updated.');
      } else {
        _showSnack('Could not save changes.', accent: AkamoColors.danger);
      }
    } on TimeoutException {
      debugPrint('[UploadsDashboard] update timed out');
      if (mounted) {
        _showSnack('Connection timed out.', accent: AkamoColors.danger);
      }
    } catch (e) {
      debugPrint('[UploadsDashboard] update error: $e');
      if (mounted) {
        _showSnack('Something went wrong.', accent: AkamoColors.danger);
      }
    }
  }

  Future<void> _deleteTrack(TrackModel track) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AkamoColors.graphite,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AkamoRadii.compact),
        ),
        title: const Text('Delete Track?'),
        content: Text(
          '"${track.title}" will be permanently removed, including its audio and cover files.',
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
              'Delete',
              style: TextStyle(color: AkamoColors.danger),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      final ok = await _service
          .deleteTrack(track)
          .timeout(const Duration(seconds: 30));
      if (!mounted) return;
      if (ok) {
        setState(() => _tracks.removeWhere((t) => t.id == track.id));
        _showSnack('"${track.title}" deleted.');
      } else {
        _showSnack('Could not delete that track.', accent: AkamoColors.danger);
      }
    } on TimeoutException {
      debugPrint('[UploadsDashboard] delete timed out');
      if (mounted) {
        _showSnack(
          'Delete timed out — check your connection.',
          accent: AkamoColors.danger,
        );
      }
    } catch (e) {
      debugPrint('[UploadsDashboard] delete error: $e');
      if (mounted) {
        _showSnack('Something went wrong.', accent: AkamoColors.danger);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AkamoColors.obsidian,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
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
                        'MY UPLOADS',
                        style: Theme.of(context).textTheme.labelMedium
                            ?.copyWith(color: AkamoColors.acid),
                      ),
                      Text(
                        '${_tracks.length} ${_tracks.length == 1 ? 'track' : 'tracks'}',
                        style: Theme.of(context).textTheme.bodySmall
                            ?.copyWith(color: AkamoColors.smoke),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: RefreshIndicator.adaptive(
        color: AkamoColors.obsidian,
        backgroundColor: AkamoColors.acid,
        onRefresh: _loadTracks,
        child: _buildBody(),
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
    if (_loadError != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.wifi_off_rounded,
                    color: AkamoColors.smoke,
                    size: 44,
                  ),
                  const SizedBox(height: 14),
                  Text(
                    _loadError!,
                    style: Theme.of(context).textTheme.bodyMedium
                        ?.copyWith(color: AkamoColors.titaniumMuted),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }
    if (_tracks.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AkamoColors.glassFillStrong,
                      border: Border.all(color: AkamoColors.glassStroke),
                    ),
                    child: const Icon(
                      Icons.cloud_upload_outlined,
                      color: AkamoColors.smoke,
                      size: 32,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No uploads yet.',
                    style: Theme.of(context).textTheme.titleMedium
                        ?.copyWith(color: AkamoColors.titanium),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Tracks you upload from Home will live here.',
                    style: Theme.of(context).textTheme.bodySmall
                        ?.copyWith(color: AkamoColors.smoke),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }
    return ListView.separated(
      physics: const BouncingScrollPhysics(
        parent: AlwaysScrollableScrollPhysics(),
      ),
      padding: const EdgeInsets.fromLTRB(
        20,
        12,
        20,
        AkamoSpacing.dockClearance,
      ),
      itemCount: _tracks.length,
      separatorBuilder: (_, _) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final track = _tracks[index];
        return _UploadRow(
          track: track,
          onEdit: () => _editTrack(track),
          onDelete: () => _deleteTrack(track),
        );
      },
    );
  }
}

class _UploadRow extends StatelessWidget {
  const _UploadRow({
    required this.track,
    required this.onEdit,
    required this.onDelete,
  });

  final TrackModel track;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return AkamoGlass(
      radius: AkamoRadii.compact,
      tint: AkamoColors.glassFillStrong,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AkamoRadii.micro),
            child: Container(
              width: 48,
              height: 48,
              color: AkamoColors.obsidian,
              child: track.coverUrl.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: track.coverUrl,
                      fit: BoxFit.cover,
                      memCacheWidth: 120,
                      fadeInDuration: const Duration(milliseconds: 260),
                      errorWidget: (_, _, _) => const Icon(
                        Icons.music_note_rounded,
                        color: AkamoColors.titaniumMuted,
                        size: 18,
                      ),
                    )
                  : const Icon(
                      Icons.music_note_rounded,
                      color: AkamoColors.titaniumMuted,
                      size: 18,
                    ),
            ),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  track.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyLarge
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  '${track.artist} · ${track.album}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall
                      ?.copyWith(color: AkamoColors.titaniumMuted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          _RoundAction(
            icon: Icons.edit_outlined,
            semanticLabel: 'Edit ${track.title}',
            onTap: onEdit,
          ),
          const SizedBox(width: 6),
          _RoundAction(
            icon: Icons.delete_outline_rounded,
            semanticLabel: 'Delete ${track.title}',
            tint: AkamoColors.danger,
            onTap: onDelete,
          ),
        ],
      ),
    );
  }
}

class _RoundAction extends StatelessWidget {
  const _RoundAction({
    required this.icon,
    required this.semanticLabel,
    required this.onTap,
    this.tint = AkamoColors.titaniumMuted,
  });

  final IconData icon;
  final String semanticLabel;
  final VoidCallback onTap;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      child: AkamoTactile(
        onTap: onTap,
        scale: 0.88,
        borderRadius: AkamoRadii.pill,
        child: Container(
          width: 38,
          height: 38,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AkamoColors.obsidian,
            border: Border.all(color: AkamoColors.glassStroke),
          ),
          child: Icon(icon, size: 17, color: tint),
        ),
      ),
    );
  }
}

/// Glass editor for a single track's text metadata. Pops with a record of
/// sanitized values, or null when dismissed.
class _TrackEditSheet extends StatefulWidget {
  const _TrackEditSheet({required this.track});

  final TrackModel track;

  @override
  State<_TrackEditSheet> createState() => _TrackEditSheetState();
}

class _TrackEditSheetState extends State<_TrackEditSheet> {
  late final TextEditingController _titleController = TextEditingController(
    text: widget.track.title,
  );
  late final TextEditingController _artistController = TextEditingController(
    text: widget.track.artist,
  );
  late final TextEditingController _albumController = TextEditingController(
    text: widget.track.album,
  );

  bool get _titleValid => _titleController.text.trim().isNotEmpty;

  @override
  void dispose() {
    _titleController.dispose();
    _artistController.dispose();
    _albumController.dispose();
    super.dispose();
  }

  void _save() {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;
    Navigator.of(context).pop((
      title: title,
      artist: _artistController.text.trim(),
      album: _albumController.text.trim(),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: AkamoColors.graphite,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AkamoRadii.hero),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Edit Metadata',
                      style: Theme.of(context).textTheme.headlineSmall,
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
              const SizedBox(height: 18),
              _SheetField(
                controller: _titleController,
                label: 'Title',
                autofocus: true,
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              _SheetField(controller: _artistController, label: 'Artist'),
              const SizedBox(height: 12),
              _SheetField(controller: _albumController, label: 'Album'),
              const SizedBox(height: 22),
              AkamoTactile(
                onTap: _titleValid ? _save : null,
                scale: 0.96,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  decoration: BoxDecoration(
                    color: _titleValid
                        ? AkamoColors.acid
                        : AkamoColors.glassFillStrong,
                    borderRadius: BorderRadius.circular(AkamoRadii.pill),
                  ),
                  child: Center(
                    child: Text(
                      'SAVE CHANGES',
                      style: TextStyle(
                        color: _titleValid
                            ? AkamoColors.obsidian
                            : AkamoColors.smoke,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SheetField extends StatelessWidget {
  const _SheetField({
    required this.controller,
    required this.label,
    this.autofocus = false,
    this.onChanged,
  });

  final TextEditingController controller;
  final String label;
  final bool autofocus;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      autofocus: autofocus,
      onChanged: onChanged,
      style: const TextStyle(color: AkamoColors.titanium),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(
          color: AkamoColors.titaniumMuted,
          fontSize: 13,
        ),
        filled: true,
        fillColor: AkamoColors.obsidian,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AkamoRadii.compact),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AkamoRadii.compact),
          borderSide: const BorderSide(color: AkamoColors.acid, width: 1),
        ),
      ),
    );
  }
}
