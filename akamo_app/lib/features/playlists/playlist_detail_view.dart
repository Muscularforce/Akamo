import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/models/playlist_model.dart';
import '../../core/models/track_model.dart';
import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/audio_handler.dart';
import '../../services/supabase_service.dart';

class PlaylistDetailView extends StatefulWidget {
  final PlaylistMetaModel playlist;
  const PlaylistDetailView({super.key, required this.playlist});

  @override
  State<PlaylistDetailView> createState() => _PlaylistDetailViewState();
}

class _PlaylistDetailViewState extends State<PlaylistDetailView> {
  final _service = SupabaseService();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  List<PlaylistTrackModel> _playlistTracks = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadTracks();
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _loadTracks() async {
    try {
      final tracks = await _service.fetchPlaylistTracks(widget.playlist.id);
      if (mounted) {
        setState(() {
          _playlistTracks = tracks;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('[PlaylistDetail] load error: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _onRefresh() async {
    try {
      final tracks = await _service.fetchPlaylistTracks(widget.playlist.id);
      if (mounted) {
        setState(() => _playlistTracks = tracks);
      }
    } catch (e) {
      debugPrint('[PlaylistDetail] refresh error: $e');
    }
  }

  List<TrackModel> get _playableTracks =>
      _playlistTracks
          .where((pt) => pt.track != null && pt.track!.audioUrl.isNotEmpty)
          .map((pt) => pt.track!)
          .toList();

  void _playAll() {
    final tracks = _playableTracks;
    if (tracks.isEmpty) return;
    final handler = Provider.of<AkamoAudioHandler>(context, listen: false);
    handler.loadPlaylist(tracks, initialIndex: 0);
  }

  void _shuffleAll() {
    final tracks = List<TrackModel>.from(_playableTracks)..shuffle();
    if (tracks.isEmpty) return;
    final handler = Provider.of<AkamoAudioHandler>(context, listen: false);
    handler.loadPlaylist(tracks, initialIndex: 0);
  }

  void _playTrackAt(int index) {
    final tracks = _playableTracks;
    if (index >= tracks.length) return;
    final handler = Provider.of<AkamoAudioHandler>(context, listen: false);
    handler.loadPlaylist(tracks, initialIndex: index);
  }

  Future<void> _removeTrack(PlaylistTrackModel pt) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AkamoColors.graphite,
        title: const Text('Remove Track?', style: TextStyle(color: AkamoColors.titanium)),
        content: Text(
          'Remove "${pt.track?.title ?? pt.trackId}" from this playlist?',
          style: const TextStyle(color: AkamoColors.titaniumMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: AkamoColors.titaniumMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Remove', style: TextStyle(color: AkamoColors.danger)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    final success = await _service.removeTrackFromPlaylist(widget.playlist.id, pt.trackId);
    if (success && mounted) {
      setState(() => _playlistTracks.remove(pt));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Track removed.'),
            backgroundColor: AkamoColors.graphite,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _deletePlaylist() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AkamoColors.graphite,
        title: const Text('Delete Playlist?', style: TextStyle(color: AkamoColors.titanium)),
        content: Text(
          'Permanently delete "${widget.playlist.title}"?',
          style: const TextStyle(color: AkamoColors.titaniumMuted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: AkamoColors.titaniumMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: AkamoColors.danger)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    final success = await _service.deletePlaylist(widget.playlist.id);
    if (success && mounted) Navigator.pop(context, true);
  }

  Future<void> _editPlaylist() async {
    _titleController.text = widget.playlist.title;
    _descController.text = widget.playlist.description;
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AkamoColors.graphite,
        title: const Text('Edit Playlist', style: TextStyle(color: AkamoColors.titanium)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _titleController,
              style: const TextStyle(color: AkamoColors.titanium),
              decoration: InputDecoration(
                hintText: 'Playlist title',
                hintStyle: TextStyle(color: AkamoColors.smoke),
                filled: true,
                fillColor: AkamoColors.obsidian,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AkamoRadii.compact),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _descController,
              style: const TextStyle(color: AkamoColors.titanium),
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Description',
                hintStyle: TextStyle(color: AkamoColors.smoke),
                filled: true,
                fillColor: AkamoColors.obsidian,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AkamoRadii.compact),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel', style: TextStyle(color: AkamoColors.titaniumMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Save', style: TextStyle(color: AkamoColors.acid)),
          ),
        ],
      ),
    );
    if (result != true) return;

    final title = _titleController.text.trim();
    if (title.isEmpty) return;

    final updated = await _service.updatePlaylist(widget.playlist.id, {
      'title': title,
      'description': _descController.text.trim(),
    });
    if (updated != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Playlist updated.'),
          backgroundColor: AkamoColors.graphite,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isOwner = _service.currentUserId == widget.playlist.ownerId;

    return Scaffold(
      backgroundColor: AkamoColors.obsidian,
      body: Stack(
        children: [
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    AkamoColors.ultraviolet.withValues(alpha: 0.12),
                    AkamoColors.obsidian,
                  ],
                  stops: const [0, 0.5],
                ),
              ),
            ),
          ),
          RefreshIndicator.adaptive(
            onRefresh: _onRefresh,
            backgroundColor: AkamoColors.graphite,
            color: AkamoColors.acid,
            edgeOffset: MediaQuery.of(context).padding.top + 14,
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
              slivers: [
                SliverToBoxAdapter(
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(8, 8, 16, 0),
                      child: Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.arrow_back_rounded, color: AkamoColors.titanium),
                            onPressed: () => Navigator.pop(context),
                          ),
                          const Spacer(),
                          if (isOwner) ...[
                            IconButton(
                              icon: const Icon(Icons.edit_outlined, color: AkamoColors.acid),
                              onPressed: _editPlaylist,
                              tooltip: 'Edit playlist',
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, color: AkamoColors.danger),
                              onPressed: _deletePlaylist,
                              tooltip: 'Delete playlist',
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),

                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Container(
                          width: 160,
                          height: 160,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(AkamoRadii.compact),
                            color: AkamoColors.graphite,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.5),
                                blurRadius: 30,
                                offset: const Offset(0, 15),
                                spreadRadius: -10,
                              ),
                            ],
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: _buildHeaderCover(),
                        ),
                        const SizedBox(width: 20),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'PLAYLIST',
                                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                      color: AkamoColors.acid,
                                    ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                widget.playlist.title,
                                style: Theme.of(context).textTheme.headlineSmall,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (widget.playlist.description.isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(
                                  widget.playlist.description,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                        color: AkamoColors.titaniumMuted,
                                      ),
                                ),
                              ],
                              const SizedBox(height: 4),
                              Text(
                                '${_playlistTracks.length} tracks',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: AkamoColors.smoke,
                                    ),
                              ),
                              if (widget.playlist.isPublic)
                                Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 8,
                                        height: 8,
                                        decoration: const BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: AkamoColors.acid,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      const Text(
                                        'Public',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: AkamoColors.smoke,
                                          letterSpacing: 0.6,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: AkamoTactile(
                            onTap: _playAll,
                            scale: 0.96,
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              decoration: BoxDecoration(
                                color: AkamoColors.acid,
                                borderRadius: BorderRadius.circular(AkamoRadii.pill),
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.play_arrow_rounded, color: AkamoColors.obsidian, size: 22),
                                  SizedBox(width: 6),
                                  Text(
                                    'PLAY ALL',
                                    style: TextStyle(
                                      color: AkamoColors.obsidian,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 13,
                                      letterSpacing: 1,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        AkamoTactile(
                          onTap: _shuffleAll,
                          scale: 0.93,
                          child: Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: AkamoColors.glassFillStrong,
                              border: Border.all(color: AkamoColors.glassStroke),
                            ),
                            child: const Icon(Icons.shuffle_rounded, color: AkamoColors.acid, size: 20),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                if (_isLoading)
                  const SliverToBoxAdapter(
                    child: SizedBox(
                      height: 200,
                      child: Center(child: CircularProgressIndicator(color: AkamoColors.acid, strokeWidth: 2)),
                    ),
                  )
                else if (_playlistTracks.isEmpty)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 48),
                      child: Column(
                        children: [
                          Icon(Icons.queue_music, size: 56, color: AkamoColors.smoke.withValues(alpha: 0.5)),
                          const SizedBox(height: 16),
                          const Text(
                            'No tracks in this playlist yet.',
                            style: TextStyle(color: AkamoColors.titaniumMuted),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            isOwner ? 'Use Browse Music to add tracks.' : 'Check back later.',
                            style: const TextStyle(color: AkamoColors.smoke, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final pt = _playlistTracks[index];
                        final track = pt.track;
                        if (track == null) return const SizedBox.shrink();
                        return _PlaylistTrackRow(
                          track: track,
                          position: pt.position,
                          onTap: () => _playTrackAt(index),
                          showRemove: isOwner,
                          onRemove: () => _removeTrack(pt),
                        );
                      },
                      childCount: _playlistTracks.length,
                    ),
                  ),

                const SliverToBoxAdapter(child: SizedBox(height: AkamoSpacing.dockClearance)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderCover() {
    if (widget.playlist.trackCovers.isNotEmpty) {
      return _PlaylistHeaderCollage(covers: widget.playlist.trackCovers);
    }
    if (widget.playlist.coverUrl != null && widget.playlist.coverUrl!.isNotEmpty) {
      return Image.network(
        widget.playlist.coverUrl!,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => const _GradientPlaceholder(),
      );
    }
    return const _GradientPlaceholder();
  }
}

class _PlaylistHeaderCollage extends StatelessWidget {
  const _PlaylistHeaderCollage({required this.covers});
  final List<String> covers;

  @override
  Widget build(BuildContext context) {
    if (covers.length >= 4) {
      return Column(
        children: [
          Expanded(
            child: Row(
              children: [
                Expanded(child: Image.network(covers[0], fit: BoxFit.cover)),
                const SizedBox(width: 1),
                Expanded(child: Image.network(covers[1], fit: BoxFit.cover)),
              ],
            ),
          ),
          const SizedBox(height: 1),
          Expanded(
            child: Row(
              children: [
                Expanded(child: Image.network(covers[2], fit: BoxFit.cover)),
                const SizedBox(width: 1),
                Expanded(child: Image.network(covers[3], fit: BoxFit.cover)),
              ],
            ),
          ),
        ],
      );
    }
    return Image.network(covers.first, fit: BoxFit.cover);
  }
}

class _GradientPlaceholder extends StatelessWidget {
  const _GradientPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AkamoColors.ultraviolet, AkamoColors.graphite],
        ),
      ),
      child: const Center(
        child: Icon(Icons.queue_music, color: AkamoColors.titaniumMuted, size: 64),
      ),
    );
  }
}

class _PlaylistTrackRow extends StatelessWidget {
  const _PlaylistTrackRow({
    required this.track,
    required this.position,
    required this.onTap,
    required this.showRemove,
    required this.onRemove,
  });

  final TrackModel track;
  final int position;
  final VoidCallback onTap;
  final bool showRemove;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return AkamoTactile(
      onTap: onTap,
      scale: 0.98,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
        child: Row(
          children: [
            SizedBox(
              width: 28,
              child: Text(
                '$position',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AkamoColors.titaniumMuted,
                      fontWeight: FontWeight.w600,
                    ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(width: 14),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Container(
                width: 44,
                height: 44,
                color: AkamoColors.glassFillStrong,
                child: track.coverUrl.isNotEmpty
                    ? Image.network(
                        track.coverUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => const Icon(
                          Icons.music_note_rounded,
                          color: AkamoColors.titaniumMuted,
                          size: 18,
                        ),
                      )
                    : const Icon(Icons.music_note_rounded, color: AkamoColors.titaniumMuted, size: 18),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    track.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    track.artist,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AkamoColors.titaniumMuted),
                  ),
                ],
              ),
            ),
            if (showRemove)
              IconButton(
                icon: const Icon(Icons.close_rounded, color: AkamoColors.smoke, size: 18),
                onPressed: onRemove,
                padding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
                tooltip: 'Remove from playlist',
              )
            else
              const Icon(Icons.play_arrow_rounded, color: AkamoColors.acid, size: 22),
          ],
        ),
      ),
    );
  }
}
