import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/models/track_model.dart';
import '../../core/models/album_model.dart';
import '../../core/models/playlist_model.dart';
import '../../core/models/user_profile_model.dart';
import '../../core/theme/akamo_tokens.dart';
import '../../core/widgets/akamo_glass.dart';
import '../../services/audio_handler.dart';
import '../albums/album_detail_view.dart';
import '../playlists/playlist_detail_view.dart';
import '../search/search_overlay.dart';
import '../upload/upload_modal.dart';

class HomeView extends StatefulWidget {
  final List<TrackModel> tracks;
  final List<AlbumModel> albums;
  final List<PlaylistMetaModel> playlists;
  final bool isLoading;
  final User? user;
  final UserProfileModel? userProfile;
  final String searchQuery;
  final ValueChanged<String> onSearch;
  final VoidCallback onLoginRequested;
  final VoidCallback onRefresh;

  const HomeView({
    super.key,
    required this.tracks,
    required this.albums,
    required this.playlists,
    required this.isLoading,
    required this.user,
    required this.userProfile,
    required this.searchQuery,
    required this.onSearch,
    required this.onLoginRequested,
    required this.onRefresh,
  });

  @override
  State<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<HomeView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _revealController;

  @override
  void initState() {
    super.initState();
    _revealController = AnimationController(
      vsync: this,
      duration: AkamoMotion.deliberate,
    )..forward();
  }

  @override
  void dispose() {
    _revealController.dispose();
    super.dispose();
  }

  void _playTrack(TrackModel track, List<TrackModel> queue, int index) {
    final handler = Provider.of<AkamoAudioHandler>(context, listen: false);
    handler.loadPlaylist(queue, initialIndex: index);
  }

  List<TrackModel> get _homeTracks {
    // Limit album tracks to max 2 per album, cap at 12 total
    final albumCountMap = <String, int>{};
    final filtered = widget.tracks.where((track) {
      if (track.albumId == null || track.albumId!.isEmpty) return true;
      final count = albumCountMap[track.albumId!] ?? 0;
      if (count < 2) {
        albumCountMap[track.albumId!] = count + 1;
        return true;
      }
      return false;
    }).toList();
    return filtered.take(12).toList();
  }

  List<TrackModel> get _filteredTracks {
    if (widget.searchQuery.isEmpty) return widget.tracks;
    final q = widget.searchQuery.toLowerCase();
    return widget.tracks
        .where(
          (t) =>
              t.title.toLowerCase().contains(q) ||
              t.artist.toLowerCase().contains(q) ||
              t.album.toLowerCase().contains(q),
        )
        .toList();
  }

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.paddingOf(context).top;
    final tracks = _homeTracks;
    final isSearching = widget.searchQuery.isNotEmpty;
    final searchResults = isSearching ? _filteredTracks : <TrackModel>[];

    return FadeTransition(
      opacity: CurvedAnimation(
        parent: _revealController,
        curve: const Interval(0, 0.72, curve: AkamoMotion.reveal),
      ),
      child: SlideTransition(
        position: Tween<Offset>(begin: const Offset(0, 0.028), end: Offset.zero)
            .animate(
              CurvedAnimation(
                parent: _revealController,
                curve: AkamoMotion.reveal,
              ),
            ),
        child: RefreshIndicator.adaptive(
          edgeOffset: topPadding + 14,
          color: AkamoColors.obsidian,
          backgroundColor: AkamoColors.acid,
          onRefresh: () async => widget.onRefresh(),
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(
              parent: AlwaysScrollableScrollPhysics(),
            ),
            slivers: <Widget>[
              // Top Bar
              SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.fromLTRB(
                    AkamoSpacing.page,
                    topPadding + 14,
                    AkamoSpacing.page,
                    0,
                  ),
                  child: _HomeTopBar(
                    onSearch: () {
                      showSearchOverlay(context, widget.tracks);
                    },
                    userProfile: widget.userProfile,
                    onLoginRequested: widget.onLoginRequested,
                    onRefresh: widget.onRefresh,
                  ),
                ),
              ),

              // Greeting masthead
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AkamoSpacing.page,
                    29,
                    AkamoSpacing.page,
                    0,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Row(
                        children: <Widget>[
                          const _PulseDot(),
                          const SizedBox(width: 7),
                          Text(
                            'TRANSMISSION LIVE',
                            style: Theme.of(context).textTheme.labelMedium
                                ?.copyWith(color: AkamoColors.acid),
                          ),
                        ],
                      ),
                      const SizedBox(height: 15),
                      Text(
                        _greeting,
                        style: Theme.of(context).textTheme.displayMedium,
                      ),
                      Text(
                        'tune inward.',
                        style: Theme.of(context).textTheme.displayLarge
                            ?.copyWith(color: AkamoColors.titaniumMuted),
                      ),
                    ],
                  ),
                ),
              ),

              // Signal Console — now playing bar
              if (tracks.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AkamoSpacing.page,
                      24,
                      AkamoSpacing.page,
                      0,
                    ),
                    child: _SignalConsole(
                      track: tracks.first,
                      onPlay: () => _playTrack(tracks.first, tracks, 0),
                    ),
                  ),
                ),
              ],

              const SliverToBoxAdapter(
                child: SizedBox(height: AkamoSpacing.section),
              ),

              // Albums Section (if any)
              if (!isSearching && widget.albums.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: _SectionHeading(
                    eyebrow: 'CURATED FOR THIS MOMENT',
                    title: 'Albums',
                    action: 'VIEW ALL',
                    onAction: () =>
                        _showSignalToast('Swipe to see all albums.'),
                  ),
                ),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 220,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(
                        AkamoSpacing.page,
                        14,
                        AkamoSpacing.page,
                        0,
                      ),
                      itemCount: widget.albums.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 14),
                      itemBuilder: (context, index) => _LiveAlbumCard(
                        album: widget.albums[index],
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) =>
                                AlbumDetailView(album: widget.albums[index]),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 22)),
              ],

              // Search results or Focus tracks
              if (isSearching) ...[
                SliverToBoxAdapter(
                  child: _SectionHeading(
                    eyebrow: 'SEARCH RESULTS',
                    title: 'Found ${searchResults.length} tracks',
                    action: 'CLEAR',
                    onAction: () => widget.onSearch(''),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AkamoSpacing.page,
                    ),
                    child: searchResults.isEmpty
                        ? const Padding(
                            padding: EdgeInsets.only(top: 40),
                            child: Center(
                              child: Text(
                                'No tracks match your search.',
                                style: TextStyle(
                                  color: AkamoColors.titaniumMuted,
                                ),
                              ),
                            ),
                          )
                        : Column(
                            children: searchResults
                                .asMap()
                                .entries
                                .map(
                                  (e) => _TrackListTile(
                                    track: e.value,
                                    index: e.key,
                                    onTap: () => _playTrack(
                                      e.value,
                                      searchResults,
                                      e.key,
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                  ),
                ),
              ] else ...[
                // Focus tracks
                SliverToBoxAdapter(
                  child: _SectionHeading(
                    eyebrow: 'A SOFTER LANDING',
                    title: 'Focus',
                    action: 'PLAY ALL',
                    onAction: () {
                      if (tracks.isNotEmpty) {
                        _playTrack(tracks.first, tracks, 0);
                      }
                    },
                  ),
                ),
                if (widget.isLoading)
                  const SliverToBoxAdapter(
                    child: SizedBox(
                      height: 180,
                      child: Center(
                        child: CircularProgressIndicator(
                          color: AkamoColors.acid,
                          strokeWidth: 2,
                        ),
                      ),
                    ),
                  )
                else if (tracks.isEmpty)
                  const SliverToBoxAdapter(
                    child: SizedBox(
                      height: 120,
                      child: Center(
                        child: Text(
                          'No tracks yet. Be the first to upload!',
                          style: TextStyle(color: AkamoColors.titaniumMuted),
                        ),
                      ),
                    ),
                  )
                else
                  SliverToBoxAdapter(
                    child: SizedBox(
                      height: 180,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(
                          AkamoSpacing.page,
                          14,
                          AkamoSpacing.page,
                          0,
                        ),
                        itemCount: tracks.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 14),
                        itemBuilder: (context, index) => _LiveTrackCard(
                          track: tracks[index],
                          onTap: () => _playTrack(tracks[index], tracks, index),
                        ),
                      ),
                    ),
                  ),
              ],

              // Public Playlists Section
              if (!isSearching && widget.playlists.isNotEmpty) ...[
                const SliverToBoxAdapter(child: SizedBox(height: 22)),
                SliverToBoxAdapter(
                  child: _SectionHeading(
                    eyebrow: 'SHARED FREQUENCIES',
                    title: 'Playlists',
                    action: 'VIEW ALL',
                    onAction: () => _showSignalToast(
                      'View playlists from the Library tab.',
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 200,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(
                        AkamoSpacing.page,
                        14,
                        AkamoSpacing.page,
                        0,
                      ),
                      itemCount: widget.playlists.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 14),
                      itemBuilder: (context, index) => _LivePlaylistCard(
                        playlist: widget.playlists[index],
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => PlaylistDetailView(playlist: widget.playlists[index]),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],

              // End
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AkamoSpacing.page,
                    23,
                    AkamoSpacing.page,
                    AkamoSpacing.dockClearance,
                  ),
                  child: const _EndOfFrequency(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSignalToast(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          behavior: SnackBarBehavior.floating,
          backgroundColor: AkamoColors.graphite,
          elevation: 0,
          shape: RoundedRectangleBorder(
            side: BorderSide(color: AkamoColors.acid.withValues(alpha: 0.24)),
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
}

// ─── Subwidgets ─────────────────────────────────────────────────────────────

class _HomeTopBar extends StatelessWidget {
  const _HomeTopBar({
    required this.onSearch,
    required this.userProfile,
    required this.onLoginRequested,
    required this.onRefresh,
  });

  final VoidCallback onSearch;
  final UserProfileModel? userProfile;
  final VoidCallback onLoginRequested;
  final VoidCallback onRefresh;

  void _openUpload(BuildContext context) {
    // Auth gate: uploads require an account, matching the website.
    if (Supabase.instance.client.auth.currentUser == null) {
      onLoginRequested();
      return;
    }
    showDialog<void>(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.55),
      builder: (_) => UploadModal(onSuccess: onRefresh),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        const _AkamoMark(),
        const Spacer(),
        _RoundControl(
          icon: Icons.search_rounded,
          onTap: onSearch,
          semanticLabel: 'Search',
        ),
        const SizedBox(width: 10),
        _RoundControl(
          icon: Icons.add_rounded,
          onTap: () => _openUpload(context),
          semanticLabel: 'Upload track',
        ),
        const SizedBox(width: 10),
        AkamoTactile(
          onTap: userProfile != null ? () {} : onLoginRequested,
          scale: 0.91,
          child: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              image: userProfile?.avatarUrl != null
                  ? DecorationImage(
                      image: NetworkImage(userProfile!.avatarUrl!),
                      fit: BoxFit.cover,
                    )
                  : null,
              gradient: userProfile?.avatarUrl == null
                  ? const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: <Color>[
                        AkamoColors.titanium,
                        AkamoColors.titaniumMuted,
                      ],
                    )
                  : null,
              border: Border.all(
                color: AkamoColors.glassHighlight.withValues(alpha: 0.5),
              ),
              boxShadow: const <BoxShadow>[
                BoxShadow(
                  color: Color(0x9A000000),
                  blurRadius: 12,
                  offset: Offset(0, 7),
                  spreadRadius: -4,
                ),
              ],
            ),
            child: userProfile?.avatarUrl == null
                ? Center(
                    child: Text(
                      (userProfile?.displayName ?? 'U')[0].toUpperCase(),
                      style: const TextStyle(
                        color: AkamoColors.obsidian,
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                        letterSpacing: -0.4,
                      ),
                    ),
                  )
                : null,
          ),
        ),
      ],
    );
  }
}

class _AkamoMark extends StatelessWidget {
  const _AkamoMark();

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Container(
          width: 30,
          height: 30,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AkamoColors.acid,
            boxShadow: <BoxShadow>[
              BoxShadow(
                color: AkamoColors.acid.withValues(alpha: 0.3),
                blurRadius: 16,
                spreadRadius: -2,
              ),
            ],
          ),
          child: const Center(
            child: Icon(
              Icons.graphic_eq_rounded,
              color: AkamoColors.obsidian,
              size: 18,
            ),
          ),
        ),
        const SizedBox(width: 9),
        Text(
          'AKAMO',
          style: Theme.of(context).textTheme.titleLarge
              ?.copyWith(letterSpacing: 2.8, fontSize: 16),
        ),
      ],
    );
  }
}

class _RoundControl extends StatelessWidget {
  const _RoundControl({
    required this.icon,
    required this.onTap,
    required this.semanticLabel,
  });

  final IconData icon;
  final VoidCallback onTap;
  final String semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      child: AkamoTactile(
        onTap: onTap,
        scale: 0.9,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AkamoColors.glassFillStrong,
            border: Border.all(color: AkamoColors.glassStroke),
          ),
          child: Icon(icon, size: 20, color: AkamoColors.titanium),
        ),
      ),
    );
  }
}

class _PulseDot extends StatefulWidget {
  const _PulseDot();

  @override
  State<_PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<_PulseDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1650),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => Container(
        width: 7,
        height: 7,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AkamoColors.acid,
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: AkamoColors.acid.withValues(
                alpha: 0.22 + (_controller.value * 0.35),
              ),
              blurRadius: 5 + (_controller.value * 7),
              spreadRadius: _controller.value * 2,
            ),
          ],
        ),
      ),
    );
  }
}

class _SignalConsole extends StatelessWidget {
  const _SignalConsole({required this.track, required this.onPlay});

  final TrackModel track;
  final VoidCallback onPlay;

  @override
  Widget build(BuildContext context) {
    return AkamoGlass(
      radius: AkamoRadii.hero,
      blur: 16,
      tint: const Color(0x3A1A1E25),
      borderColor: AkamoColors.glassHighlight.withValues(alpha: 0.27),
      padding: const EdgeInsets.fromLTRB(18, 17, 17, 17),
      child: Row(
        children: <Widget>[
          // Album art thumbnail
          Container(
            width: 66,
            height: 66,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AkamoRadii.compact),
              color: AkamoColors.obsidian,
              border: Border.all(color: AkamoColors.glassStroke),
            ),
            child: track.coverUrl.isNotEmpty
                ? _GlassCoverImage(
                    url: track.coverUrl,
                    seedTitle: track.title,
                    memCacheWidth: 160,
                  )
                : const Icon(
                    Icons.music_note_rounded,
                    color: AkamoColors.titaniumMuted,
                    size: 28,
                  ),
          ),
          const SizedBox(width: 15),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'NOW IN ROTATION',
                  style: Theme.of(context).textTheme.labelMedium
                      ?.copyWith(color: AkamoColors.acid),
                ),
                const SizedBox(height: 7),
                Text(
                  track.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 4),
                Text(
                  track.artist,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelMedium,
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          AkamoTactile(
            onTap: onPlay,
            scale: 0.88,
            child: Container(
              width: 49,
              height: 49,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AkamoColors.acid,
                boxShadow: <BoxShadow>[
                  BoxShadow(
                    color: AkamoColors.acid.withValues(alpha: 0.33),
                    blurRadius: 19,
                    spreadRadius: -3,
                  ),
                  const BoxShadow(
                    color: Color(0x79000000),
                    blurRadius: 8,
                    offset: Offset(0, 5),
                    spreadRadius: -4,
                  ),
                ],
              ),
              child: const Icon(
                Icons.play_arrow_rounded,
                color: AkamoColors.obsidian,
                size: 28,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({
    required this.eyebrow,
    required this.title,
    required this.action,
    required this.onAction,
  });

  final String eyebrow;
  final String title;
  final String action;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AkamoSpacing.page),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(eyebrow, style: Theme.of(context).textTheme.labelMedium),
                const SizedBox(height: 6),
                Text(title, style: Theme.of(context).textTheme.headlineSmall),
              ],
            ),
          ),
          AkamoTactile(
            onTap: onAction,
            scale: 0.92,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 9, 0, 9),
              child: Row(
                children: <Widget>[
                  Text(
                    action,
                    style: Theme.of(context).textTheme.labelMedium
                        ?.copyWith(color: AkamoColors.acid),
                  ),
                  const SizedBox(width: 3),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: AkamoColors.acid,
                    size: 17,
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

/// Album card showing real network cover art
class _LiveAlbumCard extends StatelessWidget {
  const _LiveAlbumCard({required this.album, required this.onTap});

  final AlbumModel album;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 166,
      child: AkamoTactile(
        onTap: onTap,
        scale: 0.955,
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AkamoRadii.panel),
            color: AkamoColors.glassFillStrong.withValues(alpha: 0.62),
            border: Border.all(color: AkamoColors.glassStroke),
            boxShadow: const <BoxShadow>[
              BoxShadow(
                color: Color(0x4D000000),
                blurRadius: 20,
                offset: Offset(0, 14),
                spreadRadius: -13,
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(17),
                  child: album.coverUrl != null && album.coverUrl!.isNotEmpty
                      ? _GlassCoverImage(
                          url: album.coverUrl!,
                          seedTitle: album.title,
                        )
                      : _GradientPlaceholder(seed: album.title.hashCode),
                ),
              ),
              const SizedBox(height: 11),
              Text(
                album.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 3),
              Text(
                album.artist,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelMedium,
              ),
              const SizedBox(height: 2),
            ],
          ),
        ),
      ),
    );
  }
}

/// Track card showing real cover art
class _LiveTrackCard extends StatelessWidget {
  const _LiveTrackCard({required this.track, required this.onTap});

  final TrackModel track;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 146,
      child: AkamoTactile(
        onTap: onTap,
        scale: 0.96,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AkamoRadii.compact),
                child: track.coverUrl.isNotEmpty
                    ? _GlassCoverImage(
                        url: track.coverUrl,
                        seedTitle: track.title,
                      )
                    : Container(
                        decoration: BoxDecoration(
                          color: AkamoColors.glassFillStrong,
                          border: Border.all(color: AkamoColors.glassStroke),
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.music_note_rounded,
                            color: AkamoColors.titaniumMuted,
                            size: 32,
                          ),
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              track.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 2),
            Text(
              track.artist,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: AkamoColors.titaniumMuted),
            ),
          ],
        ),
      ),
    );
  }
}

/// Playlist card
class _LivePlaylistCard extends StatelessWidget {
  const _LivePlaylistCard({required this.playlist, required this.onTap});

  final PlaylistMetaModel playlist;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 160,
      child: AkamoTactile(
        onTap: onTap,
        scale: 0.955,
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AkamoRadii.panel),
            color: AkamoColors.glassFillStrong.withValues(alpha: 0.62),
            border: Border.all(color: AkamoColors.glassStroke),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(17),
                  child: playlist.trackCovers.isNotEmpty
                      ? _PlaylistCoverCollage(covers: playlist.trackCovers)
                      : _GradientPlaceholder(seed: playlist.title.hashCode),
                ),
              ),
              const SizedBox(height: 11),
              Text(
                playlist.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 3),
              Text(
                '${playlist.trackCount} tracks',
                style: Theme.of(context).textTheme.labelMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlaylistCoverCollage extends StatelessWidget {
  const _PlaylistCoverCollage({required this.covers});

  final List<String> covers;

  @override
  Widget build(BuildContext context) {
    if (covers.length == 1) {
      return _GlassCoverImage(url: covers[0], seedTitle: covers[0]);
    }
    final displayCovers = covers.take(4).toList();
    return GridView.count(
      crossAxisCount: 2,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 2,
      crossAxisSpacing: 2,
      children: displayCovers
          .map(
            (url) =>
                _GlassCoverImage(url: url, seedTitle: url, memCacheWidth: 240),
          )
          .toList(),
    );
  }
}

/// Track list tile for search results
class _TrackListTile extends StatelessWidget {
  const _TrackListTile({
    required this.track,
    required this.index,
    required this.onTap,
  });

  final TrackModel track;
  final int index;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return AkamoTactile(
      onTap: onTap,
      scale: 0.98,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                color: AkamoColors.glassFillStrong,
                border: Border.all(color: AkamoColors.glassStroke),
              ),
              child: track.coverUrl.isNotEmpty
                  ? _GlassCoverImage(
                      url: track.coverUrl,
                      seedTitle: track.title,
                      memCacheWidth: 120,
                    )
                  : const Icon(
                      Icons.music_note_rounded,
                      color: AkamoColors.titaniumMuted,
                      size: 20,
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
                    style: Theme.of(context).textTheme.bodyLarge
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    track.artist,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall
                        ?.copyWith(color: AkamoColors.titaniumMuted),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.play_arrow_rounded,
              color: AkamoColors.acid,
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}

/// Gradient placeholder for items without cover art
class _GradientPlaceholder extends StatelessWidget {
  const _GradientPlaceholder({required this.seed});

  final int seed;

  @override
  Widget build(BuildContext context) {
    final colors = [
      [AkamoColors.ultraviolet, AkamoColors.cyan],
      [AkamoColors.ember, AkamoColors.ultraviolet],
      [AkamoColors.cyan, AkamoColors.acid],
      [AkamoColors.acid, AkamoColors.ember],
    ];
    final pair = colors[seed.abs() % colors.length];
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            pair[0].withValues(alpha: 0.85),
            pair[1].withValues(alpha: 0.65),
            AkamoColors.obsidian,
          ],
        ),
      ),
      child: const Center(
        child: Icon(Icons.album_rounded, color: Colors.white24, size: 36),
      ),
    );
  }
}

/// Network cover art rendered through [CachedNetworkImage] with an in-brand
/// liquid-glass shimmer while loading and a seeded gradient fallback when the
/// URL is dead. Single source of truth for every cover on Home.
class _GlassCoverImage extends StatelessWidget {
  const _GlassCoverImage({
    required this.url,
    required this.seedTitle,
    this.memCacheWidth,
  });

  final String url;
  final String seedTitle;

  /// Downsamples large covers in memory (covers render ≤220px tall here).
  final int? memCacheWidth;

  @override
  Widget build(BuildContext context) {
    return CachedNetworkImage(
      imageUrl: url,
      fit: BoxFit.cover,
      memCacheWidth: memCacheWidth ?? 440,
      fadeInDuration: const Duration(milliseconds: 260),
      placeholder: (_, _) => const _CoverShimmer(),
      errorWidget: (_, _, _) => _GradientPlaceholder(seed: seedTitle.hashCode),
    );
  }
}

/// Sweeping highlight over a dark glass base — the loading state for cover
/// art. Hand-rolled so we don't pull in another package for one effect.
class _CoverShimmer extends StatefulWidget {
  const _CoverShimmer();

  @override
  State<_CoverShimmer> createState() => _CoverShimmerState();
}

class _CoverShimmerState extends State<_CoverShimmer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: <Widget>[
        const ColoredBox(color: AkamoColors.glassFillStrong),
        const Center(
          child: Icon(Icons.album_rounded, color: Colors.white10, size: 30),
        ),
        AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final progress = Curves.easeInOutSine.transform(_controller.value);
            return Align(
              alignment: Alignment(-1.8 + 3.6 * progress, 0),
              child: Transform.rotate(
                angle: 0.32,
                child: Container(
                  width: 72,
                  height: double.infinity,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: <Color>[
                        Colors.white.withValues(alpha: 0.0),
                        Colors.white.withValues(alpha: 0.07),
                        Colors.white.withValues(alpha: 0.0),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

class _EndOfFrequency extends StatelessWidget {
  const _EndOfFrequency();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        const Expanded(child: Divider()),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Text(
            'END OF THIS FREQUENCY',
            style: Theme.of(context).textTheme.labelMedium
                ?.copyWith(fontSize: 8),
          ),
        ),
        const Expanded(child: Divider()),
      ],
    );
  }
}
