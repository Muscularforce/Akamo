import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/models/track_model.dart';
import '../../core/models/album_model.dart';
import '../../core/models/playlist_model.dart';
import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/audio_handler.dart';
import '../../services/supabase_service.dart';
import '../albums/album_detail_view.dart';
import '../albums/create_album_modal.dart';
import '../playlists/playlist_detail_view.dart';
import 'create_playlist_modal.dart';

class LibraryView extends StatefulWidget {
  const LibraryView({super.key});

  @override
  State<LibraryView> createState() => _LibraryViewState();
}

class _LibraryViewState extends State<LibraryView>
    with SingleTickerProviderStateMixin {
  final _service = SupabaseService();
  late TabController _tabController;

  List<TrackModel> _tracks = [];
  List<AlbumModel> _albums = [];
  List<PlaylistMetaModel> _playlists = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadLibrary();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadLibrary() async {
    try {
      final futures = await Future.wait([
        _service.fetchTracks(),
        _service.fetchAlbums(),
        _service.fetchPlaylists(),
      ]);
      if (mounted) {
        setState(() {
          _tracks = futures[0] as List<TrackModel>;
          _albums = futures[1] as List<AlbumModel>;
          _playlists = futures[2] as List<PlaylistMetaModel>;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('[Library] load error: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _playTrack(List<TrackModel> allTracks, int index) {
    final handler = Provider.of<AkamoAudioHandler>(context, listen: false);
    handler.loadPlaylist(allTracks, initialIndex: index);
  }

  void _showCreateMenu() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _CreateMenuSheet(
        onAlbum: () async {
          Navigator.pop(context);
          final result = await showModalBottomSheet<bool>(
            context: context,
            backgroundColor: Colors.transparent,
            isScrollControlled: true,
            builder: (_) => const CreateAlbumModal(),
          );
          if (result == true) _loadLibrary();
        },
        onPlaylist: () async {
          Navigator.pop(context);
          final result = await showModalBottomSheet<bool>(
            context: context,
            backgroundColor: Colors.transparent,
            isScrollControlled: true,
            builder: (_) => const CreatePlaylistModal(),
          );
          if (result == true) _loadLibrary();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Your Library',
                  style: TextStyle(
                    color: AkamoColors.titanium,
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                AkamoTactile(
                  onTap: _showCreateMenu,
                  scale: 0.9,
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AkamoColors.glassFillStrong,
                      border: Border.all(color: AkamoColors.glassStroke),
                    ),
                    child: const Icon(Icons.add_rounded, color: AkamoColors.acid, size: 20),
                  ),
                ),
              ],
            ),
          ),
          TabBar(
            controller: _tabController,
            isScrollable: true,
            indicatorColor: AkamoColors.acid,
            indicatorWeight: 2.5,
            labelColor: AkamoColors.titanium,
            unselectedLabelColor: AkamoColors.smoke,
            labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, letterSpacing: 0.6),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
            tabs: const [
              Tab(text: 'TRACKS'),
              Tab(text: 'ALBUMS'),
              Tab(text: 'PLAYLISTS'),
            ],
          ),
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AkamoColors.acid, strokeWidth: 2),
                  )
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildTracksList(),
                      _buildAlbumsGrid(),
                      _buildPlaylistsGrid(),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTracksList() {
    if (_tracks.isEmpty) {
      return _buildEmptyState('Your library is empty.', Icons.library_music_outlined);
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(12, 16, 12, AkamoSpacing.dockClearance),
      itemCount: _tracks.length,
      itemBuilder: (context, index) {
        final track = _tracks[index];
        return _LibraryTrackRow(
          track: track,
          onTap: () => _playTrack(_tracks, index),
        );
      },
    );
  }

  Widget _buildAlbumsGrid() {
    if (_albums.isEmpty) {
      return _buildEmptyState('No albums yet.', Icons.album_outlined);
    }
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, AkamoSpacing.dockClearance),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 14,
        mainAxisSpacing: 14,
        childAspectRatio: 0.8,
      ),
      itemCount: _albums.length,
      itemBuilder: (context, index) {
        final album = _albums[index];
        return AkamoTactile(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => AlbumDetailView(album: album)),
          ),
          scale: 0.95,
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AkamoRadii.panel),
              color: AkamoColors.glassFillStrong.withValues(alpha: 0.55),
              border: Border.all(color: AkamoColors.glassStroke),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: album.coverUrl != null && album.coverUrl!.isNotEmpty
                        ? Image.network(album.coverUrl!, fit: BoxFit.cover)
                        : Container(
                            color: AkamoColors.graphite,
                            child: const Icon(Icons.album, color: AkamoColors.smoke, size: 40),
                          ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  album.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  '${album.artist} · ${album.year}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: AkamoColors.smoke, fontSize: 12),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPlaylistsGrid() {
    if (_playlists.isEmpty) {
      return _buildEmptyState('No playlists yet.', Icons.queue_music_rounded);
    }
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, AkamoSpacing.dockClearance),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 14,
        mainAxisSpacing: 14,
        childAspectRatio: 0.8,
      ),
      itemCount: _playlists.length,
      itemBuilder: (context, index) {
        final playlist = _playlists[index];
        return AkamoTactile(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => PlaylistDetailView(playlist: playlist)),
          ),
          scale: 0.95,
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AkamoRadii.panel),
              color: AkamoColors.glassFillStrong.withValues(alpha: 0.55),
              border: Border.all(color: AkamoColors.glassStroke),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: playlist.coverUrl != null && playlist.coverUrl!.isNotEmpty
                        ? Image.network(playlist.coverUrl!, fit: BoxFit.cover)
                        : playlist.trackCovers.isNotEmpty
                            ? _MiniCollage(covers: playlist.trackCovers)
                            : Container(
                                color: AkamoColors.graphite,
                                child: const Icon(Icons.queue_music_rounded, color: AkamoColors.smoke, size: 40),
                              ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  playlist.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  '${playlist.trackCount} tracks',
                  style: const TextStyle(color: AkamoColors.smoke, fontSize: 12),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(String message, IconData icon) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 56, color: AkamoColors.smoke.withValues(alpha: 0.4)),
          const SizedBox(height: 18),
          Text(
            message,
            style: const TextStyle(color: AkamoColors.titaniumMuted, fontSize: 15),
          ),
          const SizedBox(height: 6),
          Text(
            'Tap + to create one.',
            style: TextStyle(color: AkamoColors.smoke.withValues(alpha: 0.7), fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _LibraryTrackRow extends StatelessWidget {
  const _LibraryTrackRow({required this.track, required this.onTap});
  final TrackModel track;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AkamoTactile(
      onTap: onTap,
      scale: 0.98,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(
          children: [
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
                    style: const TextStyle(color: AkamoColors.smoke, fontSize: 13),
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

class _MiniCollage extends StatelessWidget {
  const _MiniCollage({required this.covers});
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

class _CreateMenuSheet extends StatelessWidget {
  const _CreateMenuSheet({required this.onAlbum, required this.onPlaylist});
  final VoidCallback onAlbum;
  final VoidCallback onPlaylist;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
      decoration: const BoxDecoration(
        color: AkamoColors.graphite,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AkamoRadii.hero)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(2),
              color: AkamoColors.smoke,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Create New',
            style: TextStyle(
              color: AkamoColors.titanium,
              fontSize: 17,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 20),
          AkamoTactile(
            onTap: onAlbum,
            scale: 0.96,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: AkamoColors.obsidian,
                borderRadius: BorderRadius.circular(AkamoRadii.compact),
                border: Border.all(color: AkamoColors.glassStroke),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.album_rounded, color: AkamoColors.acid, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'ALBUM',
                    style: TextStyle(
                      color: AkamoColors.titanium,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          AkamoTactile(
            onTap: onPlaylist,
            scale: 0.96,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: AkamoColors.obsidian,
                borderRadius: BorderRadius.circular(AkamoRadii.compact),
                border: Border.all(color: AkamoColors.glassStroke),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.queue_music_rounded, color: AkamoColors.acid, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'PLAYLIST',
                    style: TextStyle(
                      color: AkamoColors.titanium,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
