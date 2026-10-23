import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/models/album_model.dart';
import '../../core/models/album_track_model.dart';
import '../../core/models/track_model.dart';
import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/audio_handler.dart';
import '../../services/supabase_service.dart';

class AlbumDetailView extends StatefulWidget {
  final AlbumModel album;

  const AlbumDetailView({super.key, required this.album});

  @override
  State<AlbumDetailView> createState() => _AlbumDetailViewState();
}

class _AlbumDetailViewState extends State<AlbumDetailView> {
  final _service = SupabaseService();
  List<AlbumTrackModel> _albumTracks = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadTracks();
  }

  Future<void> _loadTracks() async {
    final tracks = await _service.fetchAlbumTracks(widget.album.id);
    if (mounted) {
      setState(() {
        _albumTracks = tracks;
        _isLoading = false;
      });
    }
  }

  List<TrackModel> get _playableTracks =>
      _albumTracks.where((at) => at.track != null).map((at) => at.track!).toList();

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

  Future<void> _deleteAlbum() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AkamoColors.graphite,
        title: const Text('Delete Album?'),
        content: Text('This will delete "${widget.album.title}". Tracks will remain in your library.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete', style: TextStyle(color: AkamoColors.danger)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _service.deleteAlbum(widget.album.id);
      if (mounted) Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isOwner = _service.currentUserId == widget.album.ownerId;

    return Scaffold(
      backgroundColor: AkamoColors.obsidian,
      body: Stack(
        children: [
          // Background gradient from album art
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    AkamoColors.ultraviolet.withValues(alpha: 0.15),
                    AkamoColors.obsidian,
                  ],
                  stops: const [0, 0.5],
                ),
              ),
            ),
          ),
          CustomScrollView(
            physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
            slivers: [
              // App bar with back button
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
                        if (isOwner)
                          IconButton(
                            icon: const Icon(Icons.delete_outline_rounded, color: AkamoColors.danger),
                            onPressed: _deleteAlbum,
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              // Album header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      // Album art
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
                        child: widget.album.coverUrl != null && widget.album.coverUrl!.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: widget.album.coverUrl!,
                                fit: BoxFit.cover,
                                fadeInDuration: const Duration(milliseconds: 260),
                                errorWidget: (_, _, _) => const _AlbumGradientPlaceholder(),
                              )
                            : const _AlbumGradientPlaceholder(),
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('ALBUM', style: Theme.of(context).textTheme.labelMedium?.copyWith(color: AkamoColors.acid)),
                            const SizedBox(height: 6),
                            Text(
                              widget.album.title,
                              style: Theme.of(context).textTheme.headlineSmall,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              widget.album.artist,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AkamoColors.titaniumMuted),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${widget.album.year} • ${_albumTracks.length} tracks',
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AkamoColors.smoke),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Play / Shuffle buttons
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

              // Track list
              if (_isLoading)
                const SliverToBoxAdapter(
                  child: SizedBox(
                    height: 200,
                    child: Center(child: CircularProgressIndicator(color: AkamoColors.acid, strokeWidth: 2)),
                  ),
                )
              else if (_albumTracks.isEmpty)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.only(top: 40),
                    child: Center(child: Text('No tracks in this album yet.', style: TextStyle(color: AkamoColors.titaniumMuted))),
                  ),
                )
              else
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final at = _albumTracks[index];
                      final track = at.track;
                      if (track == null) return const SizedBox.shrink();
                      return _AlbumTrackRow(
                        track: track,
                        trackNumber: at.trackNumber,
                        onTap: () => _playTrackAt(index),
                      );
                    },
                    childCount: _albumTracks.length,
                  ),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: AkamoSpacing.dockClearance)),
            ],
          ),
        ],
      ),
    );
  }
}

class _AlbumTrackRow extends StatelessWidget {
  const _AlbumTrackRow({
    required this.track,
    required this.trackNumber,
    required this.onTap,
  });

  final TrackModel track;
  final int trackNumber;
  final VoidCallback onTap;

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
                '$trackNumber',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AkamoColors.titaniumMuted,
                      fontWeight: FontWeight.w600,
                    ),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(width: 14),
            // Cover
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Container(
                width: 44,
                height: 44,
                color: AkamoColors.glassFillStrong,
                child: track.coverUrl.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: track.coverUrl,
                        fit: BoxFit.cover,
                        fadeInDuration: const Duration(milliseconds: 260),
                        errorWidget: (_, _, _) => const Icon(
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
            const Icon(Icons.play_arrow_rounded, color: AkamoColors.acid, size: 22),
          ],
        ),
      ),
    );
  }
}

class _AlbumGradientPlaceholder extends StatelessWidget {
  const _AlbumGradientPlaceholder();

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
        child: Icon(Icons.album_rounded, color: AkamoColors.titaniumMuted, size: 64),
      ),
    );
  }
}
